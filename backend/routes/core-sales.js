const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function syncEntryToSearch(entry, tabName) {
  db.prepare('DELETE FROM search_index WHERE source_id = ?').run(entry.id);
  const tagsStr = Array.isArray(entry.tags) ? JSON.stringify(entry.tags) : (entry.tags || '[]');
  db.prepare(`
    INSERT INTO search_index (source_type, source_id, title, content, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(`sales:${tabName}`, entry.id, entry.title, entry.content || '', tagsStr);
}

/* ── TABS ── */

// GET all tabs
router.get('/tabs', (req, res) => {
  try {
    const tabs = db.prepare('SELECT * FROM core_sales_tabs ORDER BY sort_order ASC').all();
    res.json({ success: true, data: tabs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create custom tab
router.post('/tabs', (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = db.prepare('SELECT id FROM core_sales_tabs WHERE slug = ?').get(slug);
    if (existing) return res.status(400).json({ success: false, error: 'Tab with this name already exists' });
    const id = uuidv4();
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM core_sales_tabs').get();
    db.prepare(`
      INSERT INTO core_sales_tabs (id, name, slug, icon, is_builtin, sort_order) VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, name, slug, icon || '📌', (maxOrder.m || 0) + 1);
    const tab = db.prepare('SELECT * FROM core_sales_tabs WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: tab });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE tab (only non-builtin)
router.delete('/tabs/:id', (req, res) => {
  try {
    const tab = db.prepare('SELECT * FROM core_sales_tabs WHERE id = ?').get(req.params.id);
    if (!tab) return res.status(404).json({ success: false, error: 'Not found' });
    if (tab.is_builtin) return res.status(403).json({ success: false, error: 'Cannot delete built-in tabs' });
    db.prepare('DELETE FROM core_sales_tabs WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Tab deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── ENTRIES ── */

// GET entries for a tab
router.get('/entries/:tabId', (req, res) => {
  try {
    const { tabId } = req.params;
    const entries = db.prepare(`
      SELECT * FROM core_sales_entries WHERE tab_id = ? ORDER BY is_pinned DESC, created_at DESC
    `).all(tabId);
    entries.forEach(e => { e.tags = JSON.parse(e.tags || '[]'); e.is_pinned = Boolean(e.is_pinned); });
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create entry (with type, file_path, original_filename)
router.post('/entries/:tabId', (req, res) => {
  try {
    const { tabId } = req.params;
    const { title, content, type, file_path, original_filename, tags, is_pinned } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'title required' });
    const tab = db.prepare('SELECT * FROM core_sales_tabs WHERE id = ?').get(tabId);
    if (!tab) return res.status(404).json({ success: false, error: 'Tab not found' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO core_sales_entries (id, tab_id, title, content, type, file_path, original_filename, tags, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, tabId, title, content || '', type || 'text', file_path || null, original_filename || null, JSON.stringify(tags || []), is_pinned ? 1 : 0);
    const entry = db.prepare('SELECT * FROM core_sales_entries WHERE id = ?').get(id);
    entry.tags = JSON.parse(entry.tags);
    entry.is_pinned = Boolean(entry.is_pinned);
    syncEntryToSearch(entry, tab.name);
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update entry
router.put('/entries/:id', (req, res) => {
  try {
    const { title, content, type, file_path, original_filename, tags, is_pinned } = req.body;
    const existing = db.prepare('SELECT * FROM core_sales_entries WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
    db.prepare(`
      UPDATE core_sales_entries SET title=?, content=?, type=?, file_path=?, original_filename=?, tags=?, is_pinned=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(
      title || existing.title,
      content ?? existing.content,
      type || existing.type,
      file_path !== undefined ? file_path : existing.file_path,
      original_filename !== undefined ? original_filename : existing.original_filename,
      JSON.stringify(tags || JSON.parse(existing.tags)),
      is_pinned !== undefined ? (is_pinned ? 1 : 0) : existing.is_pinned,
      req.params.id
    );
    const entry = db.prepare('SELECT * FROM core_sales_entries WHERE id = ?').get(req.params.id);
    const tab = db.prepare('SELECT * FROM core_sales_tabs WHERE id = ?').get(entry.tab_id);
    entry.tags = JSON.parse(entry.tags);
    entry.is_pinned = Boolean(entry.is_pinned);
    syncEntryToSearch(entry, tab ? tab.name : '');
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE entry
router.delete('/entries/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM core_sales_entries WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    db.prepare('DELETE FROM core_sales_entries WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM search_index WHERE source_id = ?').run(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
