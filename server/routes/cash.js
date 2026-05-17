import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

// GET /api/cash?from=&to=&type=
router.get('/', (req, res) => {
  const { from, to, type, limit = 200 } = req.query;
  let sql = `
    SELECT cf.*,
      d.brand || ' ' || d.model AS device_label,
      c.name AS customer_name,
      u.name AS user_name
    FROM cash_flow cf
    LEFT JOIN devices d ON d.id = cf.device_id
    LEFT JOIN customers c ON c.id = cf.customer_id
    LEFT JOIN users u ON u.id = cf.created_by
    WHERE 1=1
  `;
  const params = [];
  if (from) { sql += ' AND cf.occurred_at >= ?'; params.push(from); }
  if (to)   { sql += ' AND cf.occurred_at <= ?'; params.push(to); }
  if (type) { sql += ' AND cf.type = ?'; params.push(type); }
  sql += ' ORDER BY cf.occurred_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(sql).all(...params));
});

// GET /api/cash/summary — totals
router.get('/summary', (req, res) => {
  const totalIn = db.prepare("SELECT COALESCE(SUM(amount),0) AS v FROM cash_flow WHERE type='in'").get().v;
  const totalOut = db.prepare("SELECT COALESCE(SUM(amount),0) AS v FROM cash_flow WHERE type='out'").get().v;
  const todayIn = db.prepare("SELECT COALESCE(SUM(amount),0) AS v FROM cash_flow WHERE type='in' AND date(occurred_at) = date('now')").get().v;
  const todayOut = db.prepare("SELECT COALESCE(SUM(amount),0) AS v FROM cash_flow WHERE type='out' AND date(occurred_at) = date('now')").get().v;

  // Last 30 days
  const byDay = db.prepare(`
    SELECT date(occurred_at) AS d,
      COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE 0 END),0) AS gelir,
      COALESCE(SUM(CASE WHEN type='out' THEN amount ELSE 0 END),0) AS gider
    FROM cash_flow
    WHERE occurred_at >= date('now','-30 days')
    GROUP BY date(occurred_at)
    ORDER BY d ASC
  `).all();

  res.json({
    balance: totalIn - totalOut,
    totalIn, totalOut,
    todayIn, todayOut,
    todayNet: todayIn - todayOut,
    byDay,
  });
});

// POST /api/cash — manuel işlem
router.post('/', (req, res) => {
  const { type, amount, category, note, device_id, customer_id, created_by, occurred_at } = req.body;
  if (!type || !amount) return res.status(400).json({ error: 'type ve amount gerekli' });
  const info = db.prepare(`
    INSERT INTO cash_flow (type, amount, category, note, device_id, customer_id, created_by, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
  `).run(type, amount, category, note, device_id, customer_id, created_by, occurred_at);

  logAction({
    req,
    action: 'create',
    entity: 'cash',
    entityId: info.lastInsertRowid,
    entityLabel: `${type === 'in' ? 'Giriş' : 'Çıkış'} · ${category || '—'} · ₺${amount}`,
    changes: { type, amount, category, note },
  });

  res.status(201).json(db.prepare('SELECT * FROM cash_flow WHERE id = ?').get(info.lastInsertRowid));
});

export default router;
