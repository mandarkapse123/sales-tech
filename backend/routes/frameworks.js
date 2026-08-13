const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Helper: sync to FTS search index
function syncToSearch(entry) {
  db.prepare('DELETE FROM search_index WHERE source_id = ?').run(entry.id);
  const tagsStr = Array.isArray(entry.tags) ? JSON.stringify(entry.tags) : (entry.tags || '[]');
  db.prepare(`
    INSERT INTO search_index (source_type, source_id, title, content, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run('framework', entry.id, entry.name, entry.description || '', tagsStr);
}

// GET all frameworks
router.get('/', (req, res) => {
  try {
    const sort = req.query.sort || 'sort_order';
    const type = req.query.type;
    let query = 'SELECT * FROM frameworks';
    const params = [];
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    const validSorts = { name: 'name ASC', type: 'type ASC', date: 'created_at DESC', order: 'sort_order ASC' };
    query += ` ORDER BY ${validSorts[sort] || 'sort_order ASC'}`;
    const rows = db.prepare(query).all(...params);
    rows.forEach(r => { r.tags = JSON.parse(r.tags || '[]'); });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single framework
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM frameworks WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    row.tags = JSON.parse(row.tags || '[]');
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create framework
router.post('/', (req, res) => {
  try {
    const { name, description, type, file_path, original_filename, thumbnail, tags } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, error: 'name and type required' });
    const id = uuidv4();
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM frameworks').get();
    const sortOrder = (maxOrder.m || 0) + 1;
    db.prepare(`
      INSERT INTO frameworks (id, name, description, type, file_path, original_filename, thumbnail, tags, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description || '', type, file_path || null, original_filename || null, thumbnail || null, JSON.stringify(tags || []), sortOrder);
    const row = db.prepare('SELECT * FROM frameworks WHERE id = ?').get(id);
    row.tags = JSON.parse(row.tags);
    syncToSearch(row);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update framework
router.put('/:id', (req, res) => {
  try {
    const { name, description, type, thumbnail, tags, sort_order } = req.body;
    const existing = db.prepare('SELECT * FROM frameworks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
    db.prepare(`
      UPDATE frameworks SET name=?, description=?, type=?, thumbnail=?, tags=?, sort_order=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      name || existing.name, description ?? existing.description, type || existing.type,
      thumbnail ?? existing.thumbnail, JSON.stringify(tags || JSON.parse(existing.tags)),
      sort_order ?? existing.sort_order, req.params.id
    );
    const row = db.prepare('SELECT * FROM frameworks WHERE id = ?').get(req.params.id);
    row.tags = JSON.parse(row.tags);
    syncToSearch(row);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE framework
router.delete('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM frameworks WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    db.prepare('DELETE FROM frameworks WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM search_index WHERE source_id = ?').run(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH reorder
router.patch('/reorder', (req, res) => {
  try {
    const { items } = req.body; // [{ id, sort_order }]
    const update = db.prepare('UPDATE frameworks SET sort_order=? WHERE id=?');
    const updateMany = db.transaction((list) => {
      for (const item of list) update.run(item.sort_order, item.id);
    });
    updateMany(items);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
