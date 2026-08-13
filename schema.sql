PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tax_no TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, code),
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  branch_id INTEGER,
  role_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(branch_id) REFERENCES branches(id),
  FOREIGN KEY(role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(company_id, name),
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  category_id INTEGER,
  unit_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  purchase_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0,
  scale_product INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, code),
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(category_id) REFERENCES categories(id),
  FOREIGN KEY(unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS barcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  barcode_type TEXT NOT NULL DEFAULT 'EAN13',
  is_primary INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(branch_id, code),
  FOREIGN KEY(branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  lot_no TEXT,
  expiry_date TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  purchase_cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  batch_id INTEGER,
  warehouse_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id INTEGER,
  user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(batch_id) REFERENCES batches(id),
  FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS current_stock (
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  PRIMARY KEY(product_id, warehouse_id),
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  account_type TEXT NOT NULL,
  name TEXT NOT NULL,
  tax_no TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  balance REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  device_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

INSERT OR IGNORE INTO roles (name, description) VALUES
('SUPER_ADMIN','Tam yetki'),
('MAGAZA_MUDURU','Mağaza yönetimi'),
('FINANS','Finans ve kasa'),
('DEPO','Depo ve stok'),
('KASIYER','POS işlemleri');

INSERT OR IGNORE INTO units (name, symbol) VALUES
('Adet','AD'),
('Kilogram','KG'),
('Gram','GR'),
('Litre','LT'),
('Metre','MT');
