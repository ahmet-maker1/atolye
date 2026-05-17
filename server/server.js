import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import './db.js';

import devicesRouter from './routes/devices.js';
// import customersRouter from './routes/customers.js';  // Cari sistemi kaldırıldı (manuel isim kullanılıyor)
import transactionsRouter from './routes/transactions.js';
import servicesRouter from './routes/services.js';
import cashRouter from './routes/cash.js';
import usersRouter from './routes/users.js';
import dashboardRouter from './routes/dashboard.js';
import backupRouter from './routes/backup.js';
import auditRouter from './routes/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// ─── Pre-flight env checks ───────────────────────────────────────
if (isProd) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: production\'da JWT_SECRET en az 32 karakter olmalı');
    process.exit(1);
  }
  if (!process.env.PUBLIC_URL) {
    console.warn('UYARI: PUBLIC_URL ayarlı değil — QR kodlar yanlış URL içerebilir');
  }
}

// Trust proxy (Railway/Heroku/nginx önündeysek X-Forwarded-* başlıklarını oku)
app.set('trust proxy', 1);

// ─── Camera için açık izin (IMEI/QR tarama) ──────────────────────
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  next();
});

// ─── Security headers ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Vite dev için kapalı; istersen prod'da elle ayarla
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // QR taraması için
}));

// ─── CORS ────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Same-origin (e.g. mobile QR) ve devel
    if (!origin) return cb(null, true);
    if (!isProd) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS engelli: ' + origin));
  },
  credentials: true,
}));

// ─── Body parsing & compression ─────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// ─── Rate limits ─────────────────────────────────────────────────
// Global API limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dk
  max: isProd ? 600 : 5000, // 15 dakikada 600 istek (~40/dk) — dükkan için bol
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek, biraz bekleyin' },
}));

// Login endpoint için ayrı, sıkı limit (brute-force koruması)
app.use('/api/users/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 15 dk'da 10 deneme
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  skipSuccessfulRequests: true,
}));

// ─── Static uploads ──────────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR
  || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, 'uploads'));
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

// ─── API routes ──────────────────────────────────────────────────
app.use('/api/devices',      devicesRouter);
// app.use('/api/customers',    customersRouter);  // Cari kaldırıldı
app.use('/api/transactions', transactionsRouter);
app.use('/api/services',     servicesRouter);
app.use('/api/cash',         cashRouter);
app.use('/api/users',        usersRouter);
app.use('/api/dashboard',    dashboardRouter);
app.use('/api/backup',       backupRouter);
app.use('/api/audit',        auditRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'atolye-api', env: NODE_ENV, time: new Date().toISOString() });
});

// ─── Serve built React client in production ─────────────────────
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: isProd ? '1d' : 0 }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Multer specific
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Dosya 8 MB\'tan büyük olamaz' });
  }
  // Don't leak stack traces in prod
  console.error('[ERROR]', req.method, req.path, '-', err.message);
  if (!isProd) console.error(err.stack);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: isProd ? 'Sunucu hatası' : (err.message || 'Sunucu hatası')
  });
});

// ─── Graceful shutdown ──────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  if (isProd) {
    console.log(`[atolye] ${NODE_ENV} sunucu :${PORT} dinleniyor`);
  } else {
    console.log('');
    console.log('╔═════════════════════════════════════════════╗');
    console.log('║   ATÖLYE.CO — Smartphone Envanter Sistemi   ║');
    console.log('╚═════════════════════════════════════════════╝');
    console.log('');
    console.log(`  API:        http://localhost:${PORT}/api`);
    console.log(`  Health:     http://localhost:${PORT}/api/health`);
    console.log(`  Uploads:    http://localhost:${PORT}/uploads`);
    if (fs.existsSync(clientDist)) {
      console.log(`  UI:         http://localhost:${PORT}`);
    } else {
      console.log(`  UI (dev):   http://localhost:5173  (run: npm run dev)`);
    }
    console.log('');
  }
});

const shutdown = (sig) => {
  console.log(`\n${sig} geldi, sunucu kapatılıyor...`);
  server.close(() => {
    console.log('Sunucu kapandı, çıkılıyor.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
