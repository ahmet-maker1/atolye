import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Production guard — canlıyı yanlışlıkla silmemek için
if (process.env.NODE_ENV === 'production' && !process.env.SEED_FORCE) {
  console.error('');
  console.error('⛔ HATA: NODE_ENV=production. Veritabanını silmek istediğinden emin değilim.');
  console.error('   Gerçekten istiyorsan:  SEED_FORCE=1 npm run reset-db');
  console.error('');
  process.exit(1);
}

// DATA_DIR env varsa onu kullan (Railway/Coolify volume), yoksa server/db
const dbDir = process.env.DATA_DIR || path.join(__dirname, 'db');

if (fs.existsSync(dbDir)) {
  for (const f of fs.readdirSync(dbDir)) {
    if (f.startsWith('atolye.db')) {
      fs.unlinkSync(path.join(dbDir, f));
    }
  }
  console.log('✓ Database reset — DB dosyaları silindi (' + dbDir + ')');
} else {
  console.log('• Veritabanı klasörü yok (henüz hiç başlatılmamış)');
}
