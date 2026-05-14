-- ═══════════════════════════════════════════════════════════════════
-- ATÖLYE.CO  —  SQLite Şeması
-- Smartphone Envanter & Satış Sistemi
-- ═══════════════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE,
  password    TEXT,                                   -- demo için plain; prod'da bcrypt
  role        TEXT NOT NULL CHECK(role IN ('Admin','Kasiyer','Teknisyen')),
  active      INTEGER DEFAULT 1,
  last_seen   TEXT DEFAULT (datetime('now')),
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── CUSTOMERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  role        TEXT CHECK(role IN ('tedarikçi','müşteri','her ikisi')) DEFAULT 'müşteri',
  city        TEXT,
  balance     REAL DEFAULT 0,
  note        TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_role ON customers(role);

-- ─── DEVICES ──────────────────────────────────────────────────────
-- IMEI unique DEĞİL — aynı cihaz 2. el geri alınabilir
CREATE TABLE IF NOT EXISTS devices (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT UNIQUE NOT NULL,
  imei          TEXT NOT NULL,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  color         TEXT,
  storage       TEXT,
  ram           TEXT,
  battery       INTEGER CHECK(battery BETWEEN 0 AND 100),
  screen        TEXT,
  condition     TEXT,
  shelf         TEXT,
  status        TEXT CHECK(status IN ('stokta','satıldı','serviste','arızalı')) DEFAULT 'stokta',
  buy_price     REAL DEFAULT 0,
  expenses      REAL DEFAULT 0,
  sell_price    REAL DEFAULT 0,
  supplier_id   INTEGER REFERENCES customers(id),
  customer_id   INTEGER REFERENCES customers(id),
  purchase_date TEXT DEFAULT (date('now')),
  sale_date     TEXT,
  note          TEXT,
  image_urls    TEXT DEFAULT '[]',               -- JSON array of paths
  qr_token      TEXT UNIQUE NOT NULL,
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  deleted_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_devices_imei    ON devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_status  ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_qr      ON devices(qr_token);
CREATE INDEX IF NOT EXISTS idx_devices_deleted ON devices(deleted_at);

-- ─── TRANSACTIONS (cihaz kronolojik akışı) ────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id         INTEGER REFERENCES devices(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK(type IN ('purchase','expense','service','labor','sale','note')),
  amount            REAL DEFAULT 0,
  counterparty_id   INTEGER REFERENCES customers(id),
  counterparty_name TEXT,
  note              TEXT,
  performed_at      TEXT DEFAULT (datetime('now')),
  created_by        INTEGER REFERENCES users(id),
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_device    ON transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_tx_performed ON transactions(performed_at DESC);

-- ─── SERVICE TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_tickets (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  code                  TEXT UNIQUE NOT NULL,
  device_id             INTEGER REFERENCES devices(id),
  customer_id           INTEGER REFERENCES customers(id),
  external_device_info  TEXT,
  external_customer     TEXT,
  issue                 TEXT NOT NULL,
  parts_cost            REAL DEFAULT 0,
  labor_cost            REAL DEFAULT 0,
  technician_id         INTEGER REFERENCES users(id),
  status                TEXT CHECK(status IN ('beklemede','işlemde','hazır','teslim edildi')) DEFAULT 'beklemede',
  note                  TEXT,
  received_at           TEXT DEFAULT (datetime('now')),
  completed_at          TEXT,
  created_by            INTEGER REFERENCES users(id),
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_status ON service_tickets(status);

-- ─── CASH FLOW ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_flow (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL CHECK(type IN ('in','out')),
  amount       REAL NOT NULL,
  category     TEXT,
  note         TEXT,
  device_id    INTEGER REFERENCES devices(id),
  service_id   INTEGER REFERENCES service_tickets(id),
  customer_id  INTEGER REFERENCES customers(id),
  occurred_at  TEXT DEFAULT (datetime('now')),
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cash_occurred ON cash_flow(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_type     ON cash_flow(type);

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS — otomasyon
-- ═══════════════════════════════════════════════════════════════════

-- İşlem eklendiğinde cihazın expenses / buy_price / sell_price güncellenir
DROP TRIGGER IF EXISTS tx_sync_device_cost;
CREATE TRIGGER tx_sync_device_cost
AFTER INSERT ON transactions
WHEN NEW.type IN ('expense','service','labor')
BEGIN
  UPDATE devices
    SET expenses = (
      SELECT COALESCE(SUM(amount),0) FROM transactions
      WHERE device_id = NEW.device_id AND type IN ('expense','service','labor')
    ),
    updated_at = datetime('now')
  WHERE id = NEW.device_id;
END;

DROP TRIGGER IF EXISTS tx_sync_device_sale;
CREATE TRIGGER tx_sync_device_sale
AFTER INSERT ON transactions
WHEN NEW.type = 'sale'
BEGIN
  UPDATE devices
    SET sell_price  = NEW.amount,
        customer_id = NEW.counterparty_id,
        sale_date   = date(NEW.performed_at),
        status      = 'satıldı',
        updated_at  = datetime('now')
  WHERE id = NEW.device_id;
END;

DROP TRIGGER IF EXISTS tx_sync_device_purchase;
CREATE TRIGGER tx_sync_device_purchase
AFTER INSERT ON transactions
WHEN NEW.type = 'purchase'
BEGIN
  UPDATE devices
    SET buy_price   = NEW.amount,
        supplier_id = NEW.counterparty_id,
        updated_at  = datetime('now')
  WHERE id = NEW.device_id;
END;

-- İşlem eklendiğinde kasa'ya otomatik kayıt
DROP TRIGGER IF EXISTS tx_cash_in;
CREATE TRIGGER tx_cash_in
AFTER INSERT ON transactions
WHEN NEW.type = 'sale' AND NEW.amount > 0
BEGIN
  INSERT INTO cash_flow (type, amount, category, note, device_id, customer_id, created_by, occurred_at)
  VALUES ('in', NEW.amount, 'Cihaz satışı',
    (SELECT 'Satış: ' || brand || ' ' || model FROM devices WHERE id = NEW.device_id),
    NEW.device_id, NEW.counterparty_id, NEW.created_by, NEW.performed_at);
END;

DROP TRIGGER IF EXISTS tx_cash_out_purchase;
CREATE TRIGGER tx_cash_out_purchase
AFTER INSERT ON transactions
WHEN NEW.type = 'purchase' AND NEW.amount > 0
BEGIN
  INSERT INTO cash_flow (type, amount, category, note, device_id, customer_id, created_by, occurred_at)
  VALUES ('out', NEW.amount, 'Cihaz alışı',
    (SELECT 'Alış: ' || brand || ' ' || model FROM devices WHERE id = NEW.device_id),
    NEW.device_id, NEW.counterparty_id, NEW.created_by, NEW.performed_at);
END;

DROP TRIGGER IF EXISTS tx_cash_out_expense;
CREATE TRIGGER tx_cash_out_expense
AFTER INSERT ON transactions
WHEN NEW.type IN ('expense','service','labor') AND NEW.amount > 0
BEGIN
  INSERT INTO cash_flow (type, amount, category, note, device_id, created_by, occurred_at)
  VALUES ('out', NEW.amount,
    CASE NEW.type WHEN 'expense' THEN 'Masraf' WHEN 'service' THEN 'Servis parça' ELSE 'İşçilik' END,
    NEW.note, NEW.device_id, NEW.created_by, NEW.performed_at);
END;
