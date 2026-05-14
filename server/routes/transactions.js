import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// POST /api/transactions — yeni işlem
// type: 'purchase' | 'expense' | 'service' | 'labor' | 'sale' | 'note'
router.post('/', (req, res) => {
  const { device_id, type, amount, counterparty_id, counterparty_name, note, created_by, performed_at } = req.body;
  if (!device_id || !type) return res.status(400).json({ error: 'device_id ve type gerekli' });
  if (!['purchase','expense','service','labor','sale','note'].includes(type))
    return res.status(400).json({ error: 'Geçersiz tür' });

  let cpName = counterparty_name;
  if (counterparty_id && !cpName) {
    const cp = db.prepare('SELECT name FROM customers WHERE id = ?').get(counterparty_id);
    if (cp) cpName = cp.name;
  }

  const stmt = db.prepare(`
    INSERT INTO transactions (device_id, type, amount, counterparty_id, counterparty_name, note, created_by, performed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
  `);
  const info = stmt.run(device_id, type, amount || 0, counterparty_id, cpName, note, created_by, performed_at);

  const created = db.prepare(`
    SELECT t.*, u.name AS user_name
    FROM transactions t
    LEFT JOIN users u ON u.id = t.created_by
    WHERE t.id = ?
  `).get(info.lastInsertRowid);
  res.status(201).json(created);
});

// GET /api/transactions?device_id=X
router.get('/', (req, res) => {
  const { device_id, limit = 100 } = req.query;
  let sql = `
    SELECT t.*, u.name AS user_name, d.code AS device_code, d.brand, d.model
    FROM transactions t
    LEFT JOIN users u ON u.id = t.created_by
    LEFT JOIN devices d ON d.id = t.device_id
    WHERE 1=1
  `;
  const params = [];
  if (device_id) { sql += ' AND t.device_id = ?'; params.push(device_id); }
  sql += ' ORDER BY t.performed_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(sql).all(...params));
});

// DELETE /api/transactions/:id (ve side effects'ı reverse et — basit: sadece cost recompute)
router.delete('/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'İşlem bulunamadı' });
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  // Recompute device expenses
  if (['expense','service','labor'].includes(tx.type)) {
    db.prepare(`
      UPDATE devices SET expenses = (
        SELECT COALESCE(SUM(amount),0) FROM transactions
        WHERE device_id = ? AND type IN ('expense','service','labor')
      ), updated_at = datetime('now') WHERE id = ?
    `).run(tx.device_id, tx.device_id);
  }
  // Undo cash_flow entry
  db.prepare('DELETE FROM cash_flow WHERE device_id = ? AND note = ? AND amount = ? AND type IN (?, ?)')
    .run(tx.device_id, tx.note, tx.amount, 'in', 'out');
  res.json({ deleted: true });
});

export default router;
