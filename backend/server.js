const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Initialize DB (runs schema + seed)
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Uploads directory path (handles local vs Vercel /tmp)
const UPLOADS_DIR = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files with Content-Disposition: inline header
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    }
    res.setHeader('Content-Disposition', 'inline');
  }
}));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ── File Upload ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    
    // Auto-detect type
    const mime = req.file.mimetype;
    let type = 'other';
    if (mime.startsWith('image/')) type = 'image';
    else if (mime === 'application/pdf') type = 'document';
    else if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') type = 'sheet';
    else if (mime.includes('presentation') || mime.includes('powerpoint')) type = 'document';
    else if (mime.includes('word') || mime.includes('text')) type = 'document';

    // Store images as Data URLs up to 3.5MB so they fit Vercel payload limits and persist permanently in SQLite
    let fileUrl = `/uploads/${req.file.filename}`;
    if (mime.startsWith('image/') && req.file.size <= 3.5 * 1024 * 1024) {
      try {
        const fileData = fs.readFileSync(req.file.path);
        fileUrl = `data:${mime};base64,${fileData.toString('base64')}`;
      } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        file_path: fileUrl,
        original_filename: req.file.originalname,
        type,
        size: req.file.size,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Routes ──
app.use('/api/frameworks', require('./routes/frameworks'));
app.use('/api/presentations', require('./routes/presentations'));
app.use('/api/images', require('./routes/images'));
app.use('/api/core-sales', require('./routes/core-sales'));
app.use('/api/interview', require('./routes/interview'));
app.use('/api/search', require('./routes/search'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Stats
app.get('/api/stats', (req, res) => {
  try {
    const frameworks = db.prepare('SELECT COUNT(*) as count FROM frameworks').get().count;
    const presentations = db.prepare('SELECT COUNT(*) as count FROM presentations').get().count;
    const images = db.prepare('SELECT COUNT(*) as count FROM sales_images').get().count;
    const tabs = db.prepare('SELECT COUNT(*) as count FROM core_sales_tabs').get().count;
    const entries = db.prepare('SELECT COUNT(*) as count FROM core_sales_entries').get().count;
    const interviewTabs = db.prepare('SELECT COUNT(*) as count FROM interview_tabs').get().count;
    const interviewEntries = db.prepare('SELECT COUNT(*) as count FROM interview_entries').get().count;
    res.json({ success: true, data: { frameworks, presentations, images, tabs, entries, interviewTabs, interviewEntries } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, error: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 SalesOS Server running at http://localhost:${PORT}`);
    console.log(`📁 API: http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend: http://localhost:${PORT}\n`);
  });
}

module.exports = app;
