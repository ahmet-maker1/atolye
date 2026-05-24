// Bıyıklı - Gsm — Boş veritabanına tek admin ekler.
//
// Demo veri YOK. Cihazlar, müşteriler, servisler, hareketler — hepsi boş başlar.
// Senin işin: ilk girişten sonra Personel sayfasından diğer kullanıcıları ekle,
// sonra cariler, sonra cihazlar.
//
// Kullanım — terminal'de:
//
//   ADMIN_NAME="Adın Soyadın" \
//   ADMIN_EMAIL="sen@dukkan.com" \
//   ADMIN_PASSWORD="Cok_Guclu_Parola_42" \
//   npm run seed
//
// Hiç ENV verilmediyse ve geliştirme modundaysan, default değerlerle çalışır
// (admin@biyikli.com / admin) — production'da reddeder.

import bcrypt from 'bcryptjs';
import 'dotenv/config';
import db from './db.js';

// ─── Production guard ───────────────────────────────────────────
// Canlı veritabanını yanlışlıkla resetlememek için.
// Bilerek tekrar seed atmak gerekirse: SEED_FORCE=1 npm run seed
if (process.env.NODE_ENV === 'production' && !process.env.SEED_FORCE) {
  console.error('');
  console.error('⛔ HATA: NODE_ENV=production.');
  console.error('   Bu komut veritabanını silip yeniden yükleyecek.');
  console.error('   Gerçekten istiyorsan:  SEED_FORCE=1 npm run seed');
  console.error('');
  process.exit(1);
}

// ─── ENV vars veya geliştirme default'u ────────────────────────
const isProd = process.env.NODE_ENV === 'production';

const adminName     = process.env.ADMIN_NAME?.trim()  || (isProd ? null : 'Yönetici');
const adminEmail    = process.env.ADMIN_EMAIL?.trim() || (isProd ? null : 'admin@biyikli.com');
const adminPassword = process.env.ADMIN_PASSWORD     || (isProd ? null : 'admin');

if (!adminName || !adminEmail || !adminPassword) {
  console.error('');
  console.error('⛔ Production modda ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD env vars zorunlu.');
  console.error('   Örnek:');
  console.error('     ADMIN_NAME="Ali Veli" \\');
  console.error('     ADMIN_EMAIL="ali@dukkan.com" \\');
  console.error('     ADMIN_PASSWORD="Guclu_42!" \\');
  console.error('     SEED_FORCE=1 npm run seed');
  console.error('');
  process.exit(1);
}

if (adminPassword.length < 6) {
  console.error('⛔ Parola en az 6 karakter olmalı (canlıda 12+ öneririm).');
  process.exit(1);
}

// ─── Veritabanını temizle ──────────────────────────────────────
console.log('🌱 Bıyıklı - Gsm seed başlıyor...');
db.exec(`
  PRAGMA foreign_keys = OFF;
  DELETE FROM audit_log;
  DELETE FROM cash_flow;
  DELETE FROM transactions;
  DELETE FROM service_tickets;
  DELETE FROM devices;
  DELETE FROM customers;
  DELETE FROM users;
  DELETE FROM sqlite_sequence;
  PRAGMA foreign_keys = ON;
`);
console.log('  ✓ Mevcut veri temizlendi');

// ─── Tek admin oluştur ─────────────────────────────────────────
const hash = bcrypt.hashSync(adminPassword, 10);
db.prepare(`
  INSERT INTO users (code, name, email, password, role, active)
  VALUES (?, ?, ?, ?, 'Admin', 1)
`).run('U-01', adminName, adminEmail, hash);

console.log('  ✓ Admin oluşturuldu');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  BIYIKLI - GSM HAZIR');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('  Email:    ' + adminEmail);
console.log('  Parola:   ' + (process.env.ADMIN_PASSWORD ? '••••••••• (env var\'dan)' : adminPassword));
console.log('  Rol:      Admin');
console.log('');

if (!process.env.ADMIN_PASSWORD && !isProd) {
  console.log('  ⚠ Geliştirme default parolası kullanıldı.');
  console.log('  ⚠ Canlıya çıkmadan ÖNCE Personel sayfasından mutlaka değiştir.');
  console.log('');
}

console.log('  Sonraki adımlar:');
console.log('    1. npm run dev  ile sunucuyu başlat');
console.log('    2. Tarayıcıdan giriş yap');
console.log('    3. Personel → diğer kullanıcıları ekle');
console.log('    4. Cari Kartlar → tedarikçi/müşterileri ekle');
console.log('    5. Cihazlar → cihaz girişine başla');
console.log('');
