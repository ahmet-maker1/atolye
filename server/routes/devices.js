import { Router } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// UPLOADS_DIR env (Railway volume), fallback to local server/uploads
const UPLOADS_DIR = process.env.UPLOADS_DIR
  || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, '..', 'uploads'));
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Multer config (photo upload) ────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${safe}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Sadece resim dosyaları (jpeg, png, webp, gif)'));
  }
});

// ─── Helpers ─────────────────────────────────────────────────────
function nextDeviceCode() {
  const row = db.prepare("SELECT code FROM devices ORDER BY id DESC LIMIT 1").get();
  if (!row) return 'DVC-00001';
  const num = parseInt(row.code.split('-')[1] || '0', 10) + 1;
  return 'DVC-' + String(num).padStart(5, '0');
}

// ─── GET /api/devices/qr/:token (PUBLIC) ─────────────────────────
// Telefonla okutma için açık; hassas bilgileri (alış, kâr, müşteri/tedarikçi)
// dışarı vermez — sadece cihazın aleni özellikleri.
// `/:id`'den ÖNCE tanımlandı yoksa router shadow'lar.
router.get('/qr/:token', (req, res) => {
  const d = db.prepare(`
    SELECT id, code, brand, model, color, storage, ram, screen, battery,
           condition, status, image_urls, sell_price, note, qr_token
    FROM devices
    WHERE qr_token = ? AND deleted_at IS NULL
  `).get(req.params.token);
  if (!d) return res.status(404).json({ error: 'Bilinmeyen QR' });
  d.image_urls = JSON.parse(d.image_urls || '[]');
  res.json(d);
});

// ═════════════════════════════════════════════════════════════════
// All routes below this line require authentication
// ═════════════════════════════════════════════════════════════════
router.use(requireAuth);

// ─── GET /api/devices ────────────────────────────────────────────
router.get('/', (req, res) => {
  const { status, q, include_deleted } = req.query;
  let sql = `
    SELECT d.*,
      s.name AS supplier_name,
      c.name AS customer_name,
      (d.buy_price + d.expenses) AS total_cost,
      CASE WHEN d.sell_price > 0
           THEN d.sell_price - (d.buy_price + d.expenses)
           ELSE NULL END AS profit
    FROM devices d
    LEFT JOIN customers s ON s.id = d.supplier_id
    LEFT JOIN customers c ON c.id = d.customer_id
    WHERE 1=1
  `;
  const params = [];
  if (!include_deleted) sql += ' AND d.deleted_at IS NULL';
  if (status && status !== 'hepsi') {
    sql += ' AND d.status = ?';
    params.push(status);
  }
  if (q) {
    sql += ' AND (d.imei LIKE ? OR d.code LIKE ? OR d.brand LIKE ? OR d.model LIKE ?)';
    const qLike = `%${q}%`;
    params.push(qLike, qLike, qLike, qLike);
  }
  sql += ' ORDER BY d.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  rows.forEach(r => { r.image_urls = JSON.parse(r.image_urls || '[]'); });
  res.json(rows);
});

// ─── GET /api/devices/:id ────────────────────────────────────────
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const device = db.prepare(`
    SELECT d.*,
      s.name AS supplier_name, s.code AS supplier_code,
      c.name AS customer_name, c.code AS customer_code,
      (d.buy_price + d.expenses) AS total_cost,
      CASE WHEN d.sell_price > 0
           THEN d.sell_price - (d.buy_price + d.expenses)
           ELSE NULL END AS profit
    FROM devices d
    LEFT JOIN customers s ON s.id = d.supplier_id
    LEFT JOIN customers c ON c.id = d.customer_id
    WHERE d.id = ?
  `).get(id);
  if (!device) return res.status(404).json({ error: 'Cihaz bulunamadı' });
  device.image_urls = JSON.parse(device.image_urls || '[]');

  const history = db.prepare(`
    SELECT t.*, u.name AS user_name
    FROM transactions t
    LEFT JOIN users u ON u.id = t.created_by
    WHERE t.device_id = ?
    ORDER BY t.performed_at ASC
  `).all(id);

  res.json({ ...device, history });
});

// ─── POST /api/devices ───────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    imei, brand, model, color, storage, ram, battery,
    screen, condition, shelf, buy_price, supplier_id, note,
    status, created_by,
  } = req.body;

  if (!imei || !brand || !model) {
    return res.status(400).json({ error: 'IMEI, marka ve model gerekli' });
  }

  const code = nextDeviceCode();
  const qr_token = crypto.randomBytes(16).toString('hex');

  const stmt = db.prepare(`
    INSERT INTO devices (
      code, imei, brand, model, color, storage, ram, battery,
      screen, condition, shelf, buy_price, supplier_id, note,
      status, qr_token, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    code, imei, brand, model, color, storage, ram, battery,
    screen, condition, shelf, buy_price || 0, supplier_id, note,
    status || 'stokta', qr_token, created_by
  );

  if (buy_price > 0 && supplier_id) {
    const supplier = db.prepare('SELECT name FROM customers WHERE id = ?').get(supplier_id);
    db.prepare(`
      INSERT INTO transactions (device_id, type, amount, counterparty_id, counterparty_name, note, created_by)
      VALUES (?, 'purchase', ?, ?, ?, 'Cihaz alımı', ?)
    `).run(info.lastInsertRowid, buy_price, supplier_id, supplier?.name, created_by);
  }

  const created = db.prepare('SELECT * FROM devices WHERE id = ?').get(info.lastInsertRowid);
  created.image_urls = JSON.parse(created.image_urls || '[]');
  res.status(201).json(created);
});

// ─── PATCH /api/devices/:id ──────────────────────────────────────
router.patch('/:id', (req, res) => {
  const fields = ['color','storage','ram','battery','screen','condition','shelf','status','note','sell_price','image_urls'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'image_urls' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Güncellenecek alan yok' });
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  updated.image_urls = JSON.parse(updated.image_urls || '[]');
  res.json(updated);
});

// ─── DELETE /api/devices/:id  (soft delete, Admin only) ─────────
router.delete('/:id', requireRole('Admin'), (req, res) => {
  const dev = db.prepare('SELECT id FROM devices WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Cihaz bulunamadı' });
  db.prepare("UPDATE devices SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ deleted: true, id: dev.id });
});

// ─── POST /api/devices/:id/restore  (undo, Admin only) ──────────
router.post('/:id/restore', requireRole('Admin'), (req, res) => {
  const info = db.prepare("UPDATE devices SET deleted_at = NULL WHERE id = ?").run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Cihaz bulunamadı' });
  const dev = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  dev.image_urls = JSON.parse(dev.image_urls || '[]');
  res.json(dev);
});

// ─── POST /api/devices/:id/photos  (upload) ──────────────────────
router.post('/:id/photos', upload.array('photos', 10), (req, res) => {
  const dev = db.prepare('SELECT image_urls FROM devices WHERE id = ?').get(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Cihaz bulunamadı' });

  const current = JSON.parse(dev.image_urls || '[]');
  const newPaths = (req.files || []).map(f => `/uploads/${f.filename}`);
  const all = [...current, ...newPaths];

  db.prepare("UPDATE devices SET image_urls = ?, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(all), req.params.id);

  res.status(201).json({ image_urls: all, added: newPaths });
});

// ─── DELETE /api/devices/:id/photos/:idx ─────────────────────────
router.delete('/:id/photos/:idx', (req, res) => {
  const dev = db.prepare('SELECT image_urls FROM devices WHERE id = ?').get(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Cihaz bulunamadı' });

  const list = JSON.parse(dev.image_urls || '[]');
  const idx = parseInt(req.params.idx, 10);
  if (idx < 0 || idx >= list.length) return res.status(400).json({ error: 'Geçersiz indeks' });

  const removed = list.splice(idx, 1)[0];

  // Delete the actual file (best effort)
  if (removed && removed.startsWith('/uploads/')) {
    const filepath = path.join(UPLOADS_DIR, path.basename(removed));
    try { fs.unlinkSync(filepath); } catch (_) {}
  }

  db.prepare("UPDATE devices SET image_urls = ?, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(list), req.params.id);

  res.json({ image_urls: list });
});

export default router;
