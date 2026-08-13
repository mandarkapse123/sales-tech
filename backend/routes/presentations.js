const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function syncToSearch(entry, category) {
  db.prepare('DELETE FROM search_index WHERE source_id = ?').run(entry.id);
  const tagsStr = Array.isArray(entry.tags) ? JSON.stringify(entry.tags) : (entry.tags || '[]');
  db.prepare(`
    INSERT INTO search_index (source_type, source_id, title, content, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(`presentation:${category}`, entry.id, entry.name, entry.description || '', tagsStr);
}

// GET all presentations (optionally filter by category)
router.get('/', (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM presentations';
    const params = [];
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    rows.forEach(r => { r.tags = JSON.parse(r.tags || '[]'); });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    row.tags = JSON.parse(row.tags || '[]');
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create
router.post('/', (req, res) => {
  try {
    const { name, description, category, file_path, original_filename, thumbnail, tags } = req.body;
    if (!name || !category) return res.status(400).json({ success: false, error: 'name and category required' });
    if (!['interview', 'client'].includes(category)) return res.status(400).json({ success: false, error: 'category must be interview or client' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO presentations (id, name, description, category, file_path, original_filename, thumbnail, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description || '', category, file_path || null, original_filename || null, thumbnail || null, JSON.stringify(tags || []));
    const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(id);
    row.tags = JSON.parse(row.tags);
    syncToSearch(row, category);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update
router.put('/:id', (req, res) => {
  try {
    const { name, description, category, thumbnail, tags } = req.body;
    const existing = db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
    db.prepare(`
      UPDATE presentations SET name=?, description=?, category=?, thumbnail=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(
      name || existing.name, description ?? existing.description,
      category || existing.category, thumbnail ?? existing.thumbnail,
      JSON.stringify(tags || JSON.parse(existing.tags)), req.params.id
    );
    const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id);
    row.tags = JSON.parse(row.tags);
    syncToSearch(row, row.category);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    db.prepare('DELETE FROM presentations WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM search_index WHERE source_id = ?').run(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
