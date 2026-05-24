import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import jwt from 'jsonwebtoken';
import { DB_FILE } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR
  || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, '..', 'uploads'));

// ─── GET /api/backup/info ───────────────────────────────────────
router.get('/info', requireAuth, requireAdmin, (req, res) => {
  let dbSize = 0, uploadsSize = 0, uploadsCount = 0;
  try { if (fs.existsSync(DB_FILE)) dbSize = fs.statSync(DB_FILE).size; } catch {}
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      uploadsCount = files.length;
      for (const f of files) {
        try { uploadsSize += fs.statSync(path.join(UPLOADS_DIR, f)).size; } catch {}
      }
    }
  } catch {}
  res.json({
    db_size: dbSize, uploads_size: uploadsSize,
    uploads_count: uploadsCount, total_size: dbSize + uploadsSize,
    db_path: DB_FILE,
  });
});

// ─── GET /api/backup ────────────────────────────────────────────
// Browser navigation can't set Authorization headers, so we accept token
// via ?token= query param (only Admin tokens accepted). Header still works.
router.get('/', (req, res) => {
  let user = null;

  // 1) Try query token (typical browser-driven download)
  const queryToken = req.query.token;
  if (queryToken) {
    try {
      const payload = jwt.verify(queryToken, JWT_SECRET);
      if (payload.role !== 'Admin') {
        return res.status(403).json({ error: 'Sadece Admin yedek alabilir' });
      }
      user = payload;
    } catch {
      return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
  } else {
    // 2) Fallback: Authorization header
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Giriş gerekli' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.role !== 'Admin') {
        return res.status(403).json({ error: 'Sadece Admin yedek alabilir' });
      }
      user = payload;
    } catch {
      return res.status(401).json({ error: 'Geçersiz token' });
    }
  }

  // Stream the ZIP
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="atolye-yedek-${date}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('Backup error:', err);
    if (!res.headersSent) res.status(500).end();
  });
  archive.pipe(res);

  if (fs.existsSync(DB_FILE)) archive.file(DB_FILE, { name: 'atolye.db' });
  const walFile = DB_FILE + '-wal';
  const shmFile = DB_FILE + '-shm';
  if (fs.existsSync(walFile)) archive.file(walFile, { name: 'atolye.db-wal' });
  if (fs.existsSync(shmFile)) archive.file(shmFile, { name: 'atolye.db-shm' });
  if (fs.existsSync(UPLOADS_DIR)) archive.directory(UPLOADS_DIR, 'uploads');

  archive.append(
    `Bıyıklı - Gsm — Yedek\n\n` +
    `Tarih: ${new Date().toLocaleString('tr-TR')}\n` +
    `Yedek alan: ${user?.name || '?'} (id ${user?.sub || '?'})\n\n` +
    `İçerik:\n` +
    `  - atolye.db        Tüm veritabanı\n` +
    `  - atolye.db-wal    Write-ahead log (varsa)\n` +
    `  - uploads/         Cihaz fotoğrafları\n\n` +
    `Geri yükleme:\n` +
    `  1. Sunucuyu durdur\n` +
    `  2. server/db/ içeriğini sil, atolye.db'yi (ve varsa wal/shm) buraya kopyala\n` +
    `  3. uploads/ klasörünü server/ altına kopyala\n` +
    `  4. Sunucuyu yeniden başlat\n`,
    { name: 'YEDEK-OKU.txt' }
  );

  archive.finalize();
});

export default router;
