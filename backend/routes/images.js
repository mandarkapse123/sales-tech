const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function syncToSearch(entry) {
  db.prepare('DELETE FROM search_index WHERE source_id = ?').run(entry.id);
  const tagsStr = Array.isArray(entry.tags) ? JSON.stringify(entry.tags) : (entry.tags || '[]');
  db.prepare(`
    INSERT INTO search_index (source_type, source_id, title, content, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run('image', entry.id, entry.title, entry.description || '', tagsStr);
}

// GET all images
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM sales_images ORDER BY created_at DESC').all();
    rows.forEach(r => { r.tags = JSON.parse(r.tags || '[]'); });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single image
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM sales_images WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    row.tags = JSON.parse(row.tags || '[]');
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create image entry
router.post('/', (req, res) => {
  try {
    const { title, description, file_path, original_filename, tags } = req.body;
    if (!title || !file_path) return res.status(400).json({ success: false, error: 'title and file_path required' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO sales_images (id, title, description, file_path, original_filename, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', file_path, original_filename || null, JSON.stringify(tags || []));
    const row = db.prepare('SELECT * FROM sales_images WHERE id = ?').get(id);
    row.tags = JSON.parse(row.tags);
    syncToSearch(row);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update image
router.put('/:id', (req, res) => {
  try {
    const { title, description, file_path, original_filename, tags } = req.body;
    const existing = db.prepare('SELECT * FROM sales_images WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
    db.prepare(`
      UPDATE sales_images SET title=?, description=?, file_path=?, original_filename=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(
      title || existing.title,
      description ?? existing.description,
      file_path || existing.file_path,
      original_filename ?? existing.original_filename,
      JSON.stringify(tags || JSON.parse(existing.tags)),
      req.params.id
    );
    const row = db.prepare('SELECT * FROM sales_images WHERE id = ?').get(req.params.id);
    row.tags = JSON.parse(row.tags);
    syncToSearch(row);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE image
router.delete('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM sales_images WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    db.prepare('DELETE FROM sales_images WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM search_index WHERE source_id = ?').run(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
