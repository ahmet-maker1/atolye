import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATA_DIR env (Railway volume mount path), fallback to local server/db
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'db');
const DB_PATH = path.join(DATA_DIR, 'atolye.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // Safe migrations for existing databases
  // SQLite doesn't support "ADD COLUMN IF NOT EXISTS" — try-catch is the standard
  const migrations = [
    "ALTER TABLE devices ADD COLUMN deleted_at TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch (_) { /* column already exists */ }
  }

  console.log('✓ Schema initialized at', DB_PATH);
}

initSchema();

export const DB_FILE = DB_PATH;
export default db;
