import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/audit
// Query: entity, action, user_id, from, to, q (entity_label LIKE), limit (default 200, max 1000)
router.get('/', (req, res) => {
  const { entity, action, user_id, from, to, q, limit = 200 } = req.query;
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (entity)  { sql += ' AND entity = ?';  params.push(entity); }
  if (action)  { sql += ' AND action = ?';  params.push(action); }
  if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
  if (from)    { sql += " AND created_at >= ?"; params.push(from); }
  if (to)      { sql += " AND created_at <= ?"; params.push(to); }
  if (q)       { sql += ' AND (entity_label LIKE ? OR user_name LIKE ?)';
                 const like = `%${q}%`; params.push(like, like); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Math.min(Number(limit) || 200, 1000));

  const rows = db.prepare(sql).all(...params).map(r => ({
    ...r,
    changes: r.changes ? safeParse(r.changes) : null,
  }));
  res.json(rows);
});

// GET /api/audit/stats — özet sayaç (son 24 saat)
router.get('/stats', (req, res) => {
  const since = "datetime('now', '-1 day')";
  const stats = {
    total_24h:  db.prepare(`SELECT COUNT(*) AS c FROM audit_log WHERE created_at >= ${since}`).get().c,
    failed_logins_24h: db.prepare(`SELECT COUNT(*) AS c FROM audit_log WHERE action = 'login_failed' AND created_at >= ${since}`).get().c,
    deletes_24h: db.prepare(`SELECT COUNT(*) AS c FROM audit_log WHERE action = 'delete' AND created_at >= ${since}`).get().c,
    by_user_24h: db.prepare(`
      SELECT user_name, COUNT(*) AS c FROM audit_log
      WHERE created_at >= ${since} AND user_id IS NOT NULL
      GROUP BY user_id ORDER BY c DESC LIMIT 5
    `).all(),
  };
  res.json(stats);
});

function safeParse(s) {
  try { return JSON.parse(s); } catch { return s; }
}

export default router;
