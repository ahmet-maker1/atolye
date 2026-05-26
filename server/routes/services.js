import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

function nextServiceCode() {
  const row = db.prepare("SELECT code FROM service_tickets ORDER BY id DESC LIMIT 1").get();
  if (!row) return 'SRV-0001';
  const num = parseInt(row.code.split('-')[1] || '0', 10) + 1;
  return 'SRV-' + String(num).padStart(4, '0');
}

// GET /api/services
router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT s.*,
      d.code AS device_code, d.brand, d.model,
      c.name AS customer_name,
      t.name AS technician_name
    FROM service_tickets s
    LEFT JOIN devices d ON d.id = s.device_id
    LEFT JOIN customers c ON c.id = s.customer_id
    LEFT JOIN users t ON t.id = s.technician_id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += ' AND s.status = ?'; params.push(status); }
  sql += ' ORDER BY s.received_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/services
router.post('/', (req, res) => {
  const {
    device_id, customer_id, external_device_info, external_customer,
    issue, parts_cost, labor_cost, technician_id, note, created_by
  } = req.body;
  if (!issue) return res.status(400).json({ error: 'Arıza bilgisi gerekli' });
  const code = nextServiceCode();
  const info = db.prepare(`
    INSERT INTO service_tickets
      (code, device_id, customer_id, external_device_info, external_customer,
       issue, parts_cost, labor_cost, technician_id, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, device_id, customer_id, external_device_info, external_customer,
         issue, parts_cost || 0, labor_cost || 0, technician_id, note, created_by);

  // ─── KASA YANSIMASI ─────────────────────────────────────────
  // Maliyet (parça) → kasadan çıkış
  // Servis satış fiyatı (işçilik) → kasaya giriş
  if (parts_cost > 0) {
    db.prepare(`
      INSERT INTO cash_flow (type, amount, category, note, device_id, created_by)
      VALUES ('out', ?, 'Servis maliyeti', ?, ?, ?)
    `).run(parts_cost, `${code} — maliyet (parça)`, device_id || null, created_by);
  }
  if (labor_cost > 0) {
    db.prepare(`
      INSERT INTO cash_flow (type, amount, category, note, device_id, created_by)
      VALUES ('in', ?, 'Servis satışı', ?, ?, ?)
    `).run(labor_cost, `${code} — servis satış fiyatı`, device_id || null, created_by);
  }

  // Dahili cihazsa: cihaz status'ünü güncelle + maliyeti cihaza yaz (kar hesabı için)
  if (device_id) {
    db.prepare("UPDATE devices SET status = 'serviste' WHERE id = ?").run(device_id);
    if (parts_cost > 0) {
      db.prepare("UPDATE devices SET expenses = expenses + ? WHERE id = ?").run(parts_cost, device_id);
    }
  }

  const created = db.prepare('SELECT * FROM service_tickets WHERE id = ?').get(info.lastInsertRowid);
  logAction({
    req,
    action: 'create',
    entity: 'service',
    entityId: created.id,
    entityLabel: `${code} — ${external_customer || 'dahili'}`,
    changes: { issue, parts_cost: parts_cost || 0, labor_cost: labor_cost || 0 },
  });

  res.status(201).json(created);
});

// PATCH /api/services/:id
router.patch('/:id', (req, res) => {
  const fields = ['issue','parts_cost','labor_cost','technician_id','status','note','completed_at'];
  const before = db.prepare('SELECT code, status FROM service_tickets WHERE id = ?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });

  const updates = [], params = [];
  const changedKeys = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`); params.push(req.body[f]); changedKeys.push(f);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Güncellenecek alan yok' });
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE service_tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM service_tickets WHERE id = ?').get(req.params.id);

  logAction({
    req,
    action: 'update',
    entity: 'service',
    entityId: updated.id,
    entityLabel: `${before.code}`,
    changes: { fields: changedKeys, status: req.body.status || before.status },
  });

  res.json(updated);
});

export default router;
