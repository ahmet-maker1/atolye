import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const BCRYPT_ROUNDS = 10;

function nextUserCode() {
  const row = db.prepare("SELECT code FROM users ORDER BY id DESC LIMIT 1").get();
  if (!row) return 'U-01';
  const num = parseInt(row.code.split('-')[1] || '0', 10) + 1;
  return 'U-' + String(num).padStart(2, '0');
}

const sanitize = (u) => {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
};

// ─── POST /api/users/login (PUBLIC) ──────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email ve parola gerekli' });

  const user = db.prepare(`
    SELECT id, code, name, email, role, active, password
    FROM users WHERE email = ?
  `).get(email);

  // Use a constant-time-ish flow: hash a dummy if user not found.
  // This avoids timing leaks revealing whether email exists.
  const hash = user?.password || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !user.active || !ok) {
    return res.status(401).json({ error: 'Email veya parola hatalı' });
  }

  db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(user.id);
  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
});

// All routes below require authentication
router.use(requireAuth);

// ─── GET /api/users/me — kim olduğunu döndürür ────────────────
router.get('/me', (req, res) => {
  res.json(req.user);
});

// ─── GET /api/users (Admin only) ────────────────────────────────
router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare(
    "SELECT id, code, name, email, role, active, last_seen FROM users ORDER BY id ASC"
  ).all();
  res.json(rows);
});

// ─── POST /api/users (Admin only) ───────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !role || !password) {
    return res.status(400).json({ error: 'İsim, rol ve parola gerekli' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Parola en az 6 karakter olmalı' });
  }
  if (!['Admin', 'Kasiyer', 'Teknisyen'].includes(role)) {
    return res.status(400).json({ error: 'Geçersiz rol' });
  }

  const exists = email && db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Bu email zaten kayıtlı' });

  const code = nextUserCode();
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const info = db.prepare(`
    INSERT INTO users (code, name, email, password, role) VALUES (?, ?, ?, ?, ?)
  `).run(code, name, email, hashed, role);
  const u = db.prepare(
    'SELECT id, code, name, email, role, active, last_seen FROM users WHERE id = ?'
  ).get(info.lastInsertRowid);
  res.status(201).json(u);
});

// ─── PATCH /api/users/:id ───────────────────────────────────────
// Admin can update anyone. Non-admins can only change their own password.
router.patch('/:id', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const isAdmin = req.user.role === 'Admin';
  const isSelf = req.user.id === targetId;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'Bu kullanıcıyı düzenleme yetkiniz yok' });
  }

  // Non-admins can only change their own password
  const allowedFields = isAdmin
    ? ['name', 'email', 'password', 'role', 'active']
    : ['password'];

  const updates = [];
  const params = [];
  for (const f of allowedFields) {
    if (req.body[f] === undefined) continue;
    if (f === 'password') {
      if (!req.body.password || req.body.password.length < 6) {
        return res.status(400).json({ error: 'Parola en az 6 karakter olmalı' });
      }
      updates.push('password = ?');
      params.push(await bcrypt.hash(req.body.password, BCRYPT_ROUNDS));
    } else if (f === 'role') {
      if (!['Admin', 'Kasiyer', 'Teknisyen'].includes(req.body.role)) {
        return res.status(400).json({ error: 'Geçersiz rol' });
      }
      // Can't demote yourself if you're the last admin
      if (req.user.id === targetId && req.body.role !== 'Admin') {
        const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'Admin' AND active = 1").get().c;
        if (adminCount <= 1) return res.status(400).json({ error: 'Son admini değiştiremezsiniz' });
      }
      updates.push('role = ?');
      params.push(req.body.role);
    } else if (f === 'active') {
      // Can't deactivate the last admin
      if (req.body.active === 0 || req.body.active === false) {
        const target = db.prepare('SELECT role FROM users WHERE id = ?').get(targetId);
        if (target?.role === 'Admin') {
          const c = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'Admin' AND active = 1 AND id != ?").get(targetId).c;
          if (c === 0) return res.status(400).json({ error: 'En az bir aktif admin kalmalı' });
        }
      }
      updates.push('active = ?');
      params.push(req.body.active ? 1 : 0);
    } else {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }

  if (!updates.length) return res.status(400).json({ error: 'Güncellenecek alan yok' });
  params.push(targetId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare(
    'SELECT id, code, name, email, role, active, last_seen FROM users WHERE id = ?'
  ).get(targetId));
});

export default router;
