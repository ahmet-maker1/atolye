import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function nextCustomerCode() {
  const row = db.prepare("SELECT code FROM customers ORDER BY id DESC LIMIT 1").get();
  if (!row) return 'C-0001';
  const num = parseInt(row.code.split('-')[1] || '0', 10) + 1;
  return 'C-' + String(num).padStart(4, '0');
}

// GET /api/customers
router.get('/', (req, res) => {
  const { role, q } = req.query;
  let sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM devices WHERE supplier_id = c.id) AS total_bought,
      (SELECT COUNT(*) FROM devices WHERE customer_id = c.id) AS total_sold
    FROM customers c WHERE 1=1
  `;
  const params = [];
  if (role) { sql += ' AND c.role = ?'; params.push(role); }
  if (q) {
    sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.code LIKE ?)';
    const qL = `%${q}%`;
    params.push(qL, qL, qL, qL);
  }
  sql += ' ORDER BY c.name ASC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/customers/:id — zengin detay
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!c) return res.status(404).json({ error: 'Cari bulunamadı' });

  // Cihaz alımları (bu kişiden alınanlar)
  const devicesBought = db.prepare(`
    SELECT d.id, d.code, d.imei, d.brand, d.model, d.color, d.storage,
           d.image_urls, d.status, d.buy_price, d.sell_price, d.expenses,
           d.created_at, d.deleted_at,
           (d.buy_price + d.expenses) AS total_cost,
           CASE WHEN d.sell_price > 0
                THEN d.sell_price - (d.buy_price + d.expenses)
                ELSE NULL END AS profit
    FROM devices d
    WHERE d.supplier_id = ? AND d.deleted_at IS NULL
    ORDER BY d.created_at DESC
  `).all(id);
  devicesBought.forEach(d => { d.image_urls = JSON.parse(d.image_urls || '[]'); });

  // Cihaz satışları (bu kişiye satılanlar)
  const devicesSold = db.prepare(`
    SELECT d.id, d.code, d.imei, d.brand, d.model, d.color, d.storage,
           d.image_urls, d.status, d.buy_price, d.sell_price, d.expenses,
           d.sale_date, d.deleted_at,
           (d.buy_price + d.expenses) AS total_cost,
           (d.sell_price - (d.buy_price + d.expenses)) AS profit
    FROM devices d
    WHERE d.customer_id = ? AND d.deleted_at IS NULL
    ORDER BY d.sale_date DESC
  `).all(id);
  devicesSold.forEach(d => { d.image_urls = JSON.parse(d.image_urls || '[]'); });

  // Tüm transactions (alış/satış/masraf/servis) — bu carinin geçtiği
  const transactions = db.prepare(`
    SELECT t.*, u.name AS user_name,
           d.code AS device_code, d.brand AS device_brand, d.model AS device_model
    FROM transactions t
    LEFT JOIN users u ON u.id = t.created_by
    LEFT JOIN devices d ON d.id = t.device_id
    WHERE t.counterparty_id = ?
    ORDER BY t.performed_at DESC
  `).all(id);

  // Servis kayıtları (bu kişinin getirdiği)
  const services = db.prepare(`
    SELECT s.*, u.name AS technician_name,
           d.code AS device_code, d.brand AS device_brand, d.model AS device_model
    FROM service_tickets s
    LEFT JOIN users u ON u.id = s.technician_id
    LEFT JOIN devices d ON d.id = s.device_id
    WHERE s.customer_id = ?
    ORDER BY s.received_at DESC
  `).all(id);

  // Toplamlar
  const stats = {
    total_bought_count: devicesBought.length,
    total_sold_count:   devicesSold.length,
    total_bought_amount: devicesBought.reduce((s, d) => s + Number(d.buy_price || 0), 0),
    total_sold_amount:   devicesSold.reduce((s, d) => s + Number(d.sell_price || 0), 0),
    total_profit_from:   devicesSold.reduce((s, d) => s + Number(d.profit || 0), 0),
    total_services:      services.length,
    open_services:       services.filter(s => s.status !== 'teslim edildi' && s.status !== 'iptal').length,
  };

  // Ledger — birleşik hareket akışı (running balance ile)
  // Bakiye mantığı: müşteriye satış = onun bize borcu (+), tedarikçiden alış = bizim ona borcumuz (−)
  const ledger = [];

  for (const t of transactions) {
    if (t.type === 'sale') {
      ledger.push({
        date: t.performed_at,
        kind: 'sale',
        label: 'Cihaz satışı',
        device: t.device_code ? `${t.device_brand} ${t.device_model} (${t.device_code})` : null,
        device_id: t.device_id,
        amount: Number(t.amount),
        direction: 'in',  // bize gelen
        note: t.note,
        user_name: t.user_name,
      });
    } else if (t.type === 'purchase') {
      ledger.push({
        date: t.performed_at,
        kind: 'purchase',
        label: 'Cihaz alımı',
        device: t.device_code ? `${t.device_brand} ${t.device_model} (${t.device_code})` : null,
        device_id: t.device_id,
        amount: Number(t.amount),
        direction: 'out', // bizden çıkan
        note: t.note,
        user_name: t.user_name,
      });
    }
  }

  // Servis tutarları
  for (const s of services) {
    if (s.status === 'teslim edildi') {
      const total = Number(s.parts_cost || 0) + Number(s.labor_cost || 0);
      if (total > 0) {
        ledger.push({
          date: s.completed_at || s.received_at,
          kind: 'service',
          label: 'Servis bedeli',
          device: s.device_code ? `${s.device_brand} ${s.device_model}` : (s.external_device_info || '—'),
          ticket_code: s.code,
          amount: total,
          direction: 'in',
          note: s.issue,
        });
      }
    }
  }

  ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Running balance (en yeniden eskiye doğru, sondan başlayarak hesapla)
  let bal = Number(c.balance || 0); // mevcut bakiye
  // En yeni → eski sırada, balance'ı geri çözerek her satıra ekle
  for (let i = 0; i < ledger.length; i++) {
    ledger[i].running_balance_after = bal;
    bal -= (ledger[i].direction === 'in' ? ledger[i].amount : -ledger[i].amount);
  }

  res.json({
    ...c,
    stats,
    devices_bought: devicesBought,
    devices_sold:   devicesSold,
    services,
    transactions,
    ledger,
  });
});

// POST /api/customers
router.post('/', (req, res) => {
  const { name, phone, email, role, city, note, balance } = req.body;
  if (!name) return res.status(400).json({ error: 'İsim gerekli' });
  const code = nextCustomerCode();
  const info = db.prepare(`
    INSERT INTO customers (code, name, phone, email, role, city, note, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, name, phone, email, role || 'müşteri', city, note, balance || 0);
  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid));
});

// PATCH /api/customers/:id
router.patch('/:id', (req, res) => {
  const fields = ['name','phone','email','role','city','note','balance'];
  const updates = [], params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Güncellenecek alan yok' });
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
});

// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Cari bulunamadı' });
  res.json({ deleted: true });
});

export default router;
