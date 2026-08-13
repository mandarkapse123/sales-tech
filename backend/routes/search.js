const express = require('express');
const router = express.Router();
const db = require('../db');

// Global search with slash command support
router.get('/', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = parseInt(req.query.limit) || 20;

    if (!q) return res.json({ success: true, data: [], query: q });

    // Parse slash command: /framework, /presentation, /interview, /interview/script, /sales, /objection, etc.
    let filterType = null;
    let searchTerm = q;

    const slashMatch = q.match(/^\/([a-zA-Z0-9\/-]+)\s*(.*)/);
    if (slashMatch) {
      const cmd = slashMatch[1].toLowerCase();
      searchTerm = slashMatch[2].trim() || '*';

      const commandMap = {
        'framework': 'framework',
        'frameworks': 'framework',
        'presentation': 'presentation',
        'presentations': 'presentation',
        'interview': 'interview',
        'interview/presentations': 'interview:Presentations',
        'interview/script': 'interview:Script',
        'interview/resume': 'interview:Resume',
        'client': 'presentation:client',
        'sales': 'sales',
        'funnel': 'sales:Sales Funnel',
        'objection': 'sales:Objection',
        'followup': 'sales:Follow-up Q',
        'follow': 'sales:Follow-up Q',
        'opening': 'sales:Opening Framework',
        'outbound': 'sales:Outbound Methods',
        'stories': 'sales:Stories',
        'email': 'sales:Email Formats',
      };
      
      filterType = commandMap[cmd];

      // Handle custom interview sub-tabs e.g. /interview/custom-name
      if (!filterType && cmd.startsWith('interview/')) {
        const subSlug = cmd.replace('interview/', '');
        const itab = db.prepare('SELECT name FROM interview_tabs WHERE slug = ?').get(subSlug);
        if (itab) filterType = `interview:${itab.name}`;
        else filterType = 'interview';
      }

      if (!filterType) filterType = cmd;
    }

    // Build FTS query
    const ftsQuery = searchTerm === '*' ? '' : searchTerm + '*';
    let results = [];

    if (ftsQuery) {
      try {
        const ftsResults = db.prepare(`
          SELECT source_type, source_id, title, content, tags
          FROM search_index
          WHERE search_index MATCH ?
          LIMIT ?
        `).all(ftsQuery, limit);
        results = ftsResults;
      } catch (e) {
        // FTS match error fallback - do LIKE search
        const likeResults = db.prepare(`
          SELECT source_type, source_id, title, content, tags
          FROM search_index
          WHERE title LIKE ? OR content LIKE ?
          LIMIT ?
        `).all(`%${searchTerm}%`, `%${searchTerm}%`, limit);
        results = likeResults;
      }
    } else {
      // Slash command with no search term - return all of that type
      results = db.prepare('SELECT source_type, source_id, title, content, tags FROM search_index LIMIT ?').all(limit);
    }

    // Apply type filter
    if (filterType) {
      results = results.filter(r => r.source_type.toLowerCase().startsWith(filterType.toLowerCase()));
    }

    // Enrich results with source data
    const enriched = results.map(r => {
      let extra = {};
      if (r.source_type === 'framework') {
        const fw = db.prepare('SELECT type, file_path FROM frameworks WHERE id = ?').get(r.source_id);
        extra = fw || {};
      } else if (r.source_type.startsWith('presentation')) {
        const p = db.prepare('SELECT category, file_path FROM presentations WHERE id = ?').get(r.source_id);
        extra = p || {};
      } else if (r.source_type.startsWith('interview')) {
        const ie = db.prepare('SELECT type, file_path FROM interview_entries WHERE id = ?').get(r.source_id);
        extra = ie || {};
      } else if (r.source_type.startsWith('sales')) {
        const cs = db.prepare('SELECT type, file_path FROM core_sales_entries WHERE id = ?').get(r.source_id);
        extra = cs || {};
      }
      return {
        id: r.source_id,
        type: r.source_type,
        title: r.title,
        preview: (r.content || '').substring(0, 120),
        tags: (() => { try { return JSON.parse(r.tags || '[]'); } catch { return []; } })(),
        ...extra,
      };
    });

    res.json({ success: true, data: enriched, query: q, filter: filterType });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Autocomplete slash commands
router.get('/commands', (req, res) => {
  const commands = [
    { cmd: '/framework', label: 'Frameworks', icon: '📁', description: 'Browse all frameworks' },
    { cmd: '/presentation', label: 'Presentations', icon: '📊', description: 'All presentations' },
    { cmd: '/interview', label: 'Interview Main', icon: '🎤', description: 'All interview resources' },
    { cmd: '/interview/presentations', label: 'Interview Decks', icon: '🎤', description: 'Interview presentations' },
    { cmd: '/interview/script', label: 'Interview Scripts', icon: '📜', description: 'Scripts & pitch notes' },
    { cmd: '/interview/resume', label: 'Interview Resumes', icon: '📄', description: 'Resumes & CV documents' },
    { cmd: '/client', label: 'Client Decks', icon: '🤝', description: 'Client presentations' },
    { cmd: '/sales', label: 'Core Sales', icon: '⚡', description: 'All sales content' },
    { cmd: '/funnel', label: 'Sales Funnel', icon: '🔽', description: 'Sales funnel stages' },
    { cmd: '/objection', label: 'Objection', icon: '🛡️', description: 'Objection handling' },
    { cmd: '/followup', label: 'Follow-up Q', icon: '🔄', description: 'Follow-up questions' },
    { cmd: '/opening', label: 'Opening Framework', icon: '🎯', description: 'Opening scripts' },
    { cmd: '/outbound', label: 'Outbound Methods', icon: '📡', description: 'Outbound strategies' },
    { cmd: '/stories', label: 'Stories', icon: '📖', description: 'Sales stories' },
    { cmd: '/email', label: 'Email Formats', icon: '📧', description: 'Email templates' },
  ];

  // Add custom Core Sales tabs
  const customSalesTabs = db.prepare('SELECT name, slug, icon FROM core_sales_tabs WHERE is_builtin = 0').all();
  customSalesTabs.forEach(t => {
    commands.push({ cmd: `/${t.slug}`, label: t.name, icon: t.icon, description: `Sales: ${t.name}` });
  });

  // Add custom Interview tabs
  const customInterviewTabs = db.prepare('SELECT name, slug, icon FROM interview_tabs WHERE is_builtin = 0').all();
  customInterviewTabs.forEach(t => {
    commands.push({ cmd: `/interview/${t.slug}`, label: `Interview: ${t.name}`, icon: t.icon, description: `Interview: ${t.name}` });
  });

  res.json({ success: true, data: commands });
});

module.exports = router;
