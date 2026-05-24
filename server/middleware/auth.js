import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET env değişkeni tanımlı değil. Sunucu durduruldu.');
  process.exit(1);
}
if (JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET en az 32 karakter olmalı (rastgele bir string üret).');
  process.exit(1);
}

const TOKEN_TTL = '12h'; // Vardiya başına bir kez giriş için yeterli

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Read JWT from Authorization header. Sets req.user; 401 if invalid/missing.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Giriş gerekli' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, active FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    if (!user.active) return res.status(403).json({ error: 'Hesap pasif' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Oturum süresi doldu, tekrar giriş yap' });
  }
}

// Allow only specific roles
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Giriş gerekli' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
}

export const requireAdmin = requireRole('Admin');
