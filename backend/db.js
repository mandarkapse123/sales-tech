const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Support Vercel serverless environment (/tmp directory)
const DB_DIR = process.env.VERCEL ? '/tmp' : __dirname;
const DB_PATH = path.join(DB_DIR, 'salesos.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance (WAL is ignored on /tmp if single connection, fallback to DELETE)
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  db.pragma('journal_mode = DELETE');
}
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  -- Frameworks table
  CREATE TABLE IF NOT EXISTS frameworks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('image', 'document', 'sheet', 'link', 'other')),
    file_path TEXT,
    original_filename TEXT,
    thumbnail TEXT,
    tags TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Presentations table
  CREATE TABLE IF NOT EXISTS presentations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK(category IN ('interview', 'client')),
    file_path TEXT,
    original_filename TEXT,
    thumbnail TEXT,
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Core Sales Tabs
  CREATE TABLE IF NOT EXISTS core_sales_tabs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📌',
    is_builtin INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Core Sales Entries (with attachments & links)
  CREATE TABLE IF NOT EXISTS core_sales_entries (
    id TEXT PRIMARY KEY,
    tab_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'text',
    file_path TEXT,
    original_filename TEXT,
    tags TEXT DEFAULT '[]',
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tab_id) REFERENCES core_sales_tabs(id) ON DELETE CASCADE
  );

  -- Interview Tabs
  CREATE TABLE IF NOT EXISTS interview_tabs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📌',
    is_builtin INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Interview Entries
  CREATE TABLE IF NOT EXISTS interview_entries (
    id TEXT PRIMARY KEY,
    tab_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'text',
    file_path TEXT,
    original_filename TEXT,
    tags TEXT DEFAULT '[]',
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tab_id) REFERENCES interview_tabs(id) ON DELETE CASCADE
  );

  -- Full Text Search (FTS5)
  CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    source_type,
    source_id,
    title,
    content,
    tags,
    tokenize='porter ascii'
  );
`);

// Safe column migrations for existing core_sales_entries
try { db.exec(`ALTER TABLE core_sales_entries ADD COLUMN type TEXT DEFAULT 'text'`); } catch {}
try { db.exec(`ALTER TABLE core_sales_entries ADD COLUMN file_path TEXT`); } catch {}
try { db.exec(`ALTER TABLE core_sales_entries ADD COLUMN original_filename TEXT`); } catch {}

// Seed default Core Sales tabs if empty
const tabCount = db.prepare('SELECT COUNT(*) as count FROM core_sales_tabs').get();
if (tabCount.count === 0) {
  const insertTab = db.prepare(`
    INSERT INTO core_sales_tabs (id, name, slug, icon, is_builtin, sort_order) 
    VALUES (?, ?, ?, ?, 1, ?)
  `);
  const defaultTabs = [
    ['tab-sales-funnel',       'Sales Funnel',       'sales-funnel',       '🔽', 0],
    ['tab-objection',          'Objection',          'objection',          '🛡️', 1],
    ['tab-follow-up',          'Follow-up Q',        'follow-up',          '🔄', 2],
    ['tab-opening-framework',  'Opening Framework',  'opening-framework',  '🎯', 3],
    ['tab-outbound-methods',   'Outbound Methods',   'outbound-methods',   '📡', 4],
    ['tab-stories',            'Stories',            'stories',            '📖', 5],
    ['tab-email-formats',      'Email Formats',      'email-formats',      '📧', 6],
  ];
  const insertMany = db.transaction((tabs) => {
    for (const tab of tabs) insertTab.run(...tab);
  });
  insertMany(defaultTabs);
}

// Seed default Interview tabs if empty
const interviewTabCount = db.prepare('SELECT COUNT(*) as count FROM interview_tabs').get();
if (interviewTabCount.count === 0) {
  const insertITab = db.prepare(`
    INSERT INTO interview_tabs (id, name, slug, icon, is_builtin, sort_order) 
    VALUES (?, ?, ?, ?, 1, ?)
  `);
  const defaultITabs = [
    ['itab-presentations', 'Presentations', 'presentations', '🎤', 0],
    ['itab-script',        'Script',        'script',        '📜', 1],
    ['itab-resume',        'Resume',        'resume',        '📄', 2],
  ];
  const insertManyI = db.transaction((tabs) => {
    for (const tab of tabs) insertITab.run(...tab);
  });
  insertManyI(defaultITabs);
}

module.exports = db;
