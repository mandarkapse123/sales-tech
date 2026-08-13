/* ─── Core App Module ─── */
const API_BASE = '/api';

const App = {
  currentPage: 'home',

  navigate(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

    // Show target page
    const pageEl = document.getElementById(`page-${page}`);
    const tabEl = document.querySelector(`.nav-tab[data-page="${page}"]`);
    if (pageEl) pageEl.classList.add('active');
    if (tabEl) tabEl.classList.add('active');

    this.currentPage = page;
    window.location.hash = page;

    // Trigger page load
    if (page === 'frameworks') Frameworks.load();
    if (page === 'presentations') Presentations.load();
    if (page === 'interview') Interview.load();
    if (page === 'core-sales') CoreSales.load();
    if (page === 'home') Home.loadStats();
  },

  async fetch(url, options = {}) {
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'API error');
      return data;
    } catch (err) {
      Toast.show(err.message, 'error');
      throw err;
    }
  },

  async upload(file, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
      });
      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) resolve(data);
          else reject(new Error(data.error));
        } catch { reject(new Error('Upload failed')); }
      });
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.open('POST', `${API_BASE}/upload`);
      xhr.send(formData);
    });
  },
};

/* ─── Toast Notifications ─── */
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
};

/* ─── Modal Helpers ─── */
const Modal = {
  open(id) {
    document.getElementById(id).classList.add('visible');
    document.body.style.overflow = 'hidden';
  },
  close(id) {
    document.getElementById(id).classList.remove('visible');
    document.body.style.overflow = '';
  },
};

/* ─── Utility Helpers ─── */
const Utils = {
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  parseTags(str) {
    return str.split(',').map(t => t.trim()).filter(Boolean);
  },
  typeIcon(type) {
    const icons = { image: '🖼️', document: '📄', sheet: '📊', link: '🔗', text: '📝', other: '📌' };
    return icons[type] || '📌';
  },
  typeClass(type) {
    return `type-${type}`;
  },
  typeLabel(type) {
    const labels = { image: 'IMAGE', document: 'DOC', sheet: 'SHEET', link: 'LINK', text: 'TEXT', other: 'FILE' };
    return labels[type] || type?.toUpperCase();
  },
  renderTags(tags) {
    if (!tags || !tags.length) return '';
    return `<div class="tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`;
  },
  emptyState(icon, title, subtitle) {
    return `<div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-subtitle">${subtitle}</div>
    </div>`;
  },
};

/* ─── Upload Helper ─── */
function setupUploadZone(zoneId, inputId, progressId, fillId, previewId, onComplete) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  const handleFile = async (file) => {
    if (!file) return;
    const progress = document.getElementById(progressId);
    const fill = document.getElementById(fillId);
    const preview = document.getElementById(previewId);
    if (progress) { progress.classList.add('visible'); }

    try {
      const result = await App.upload(file, (pct) => {
        if (fill) fill.style.width = pct + '%';
      });
      if (preview) {
        preview.style.display = 'flex';
        preview.innerHTML = `<span>${Utils.typeIcon(result.data.type)}</span><span>${file.name}</span><span style="margin-left:auto;color:var(--accent-teal)">✓ Uploaded</span>`;
      }
      if (onComplete) onComplete(result.data);
    } catch (e) {
      Toast.show('Upload failed: ' + e.message, 'error');
      if (progress) progress.classList.remove('visible');
    }
  };

  input.addEventListener('change', () => handleFile(input.files[0]));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragging');
    handleFile(e.dataTransfer.files[0]);
  });
}

/* ─── Home Module ─── */
const Home = {
  async loadStats() {
    try {
      const data = await App.fetch('/stats');
      const s = data.data;
      if (document.getElementById('stat-frameworks')) document.getElementById('stat-frameworks').textContent = `${s.frameworks} items`;
      if (document.getElementById('stat-presentations')) document.getElementById('stat-presentations').textContent = `${s.presentations} items`;
      if (document.getElementById('stat-interview')) document.getElementById('stat-interview').textContent = `${s.interviewEntries || 0} items`;
      if (document.getElementById('stat-entries')) document.getElementById('stat-entries').textContent = `${s.entries} entries`;
      if (document.getElementById('stat-frameworks-big')) document.getElementById('stat-frameworks-big').textContent = s.frameworks;
      if (document.getElementById('stat-presentations-big')) document.getElementById('stat-presentations-big').textContent = s.presentations;
      if (document.getElementById('stat-interview-big')) document.getElementById('stat-interview-big').textContent = s.interviewEntries || 0;
      if (document.getElementById('stat-entries-big')) document.getElementById('stat-entries-big').textContent = s.entries;
    } catch {}
  }
};

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  // Route from hash
  const hash = window.location.hash.replace('#', '') || 'home';
  App.navigate(hash);

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('visible');
    });
  });

  // Global keyboard shortcut ⌘K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      App.navigate('home');
      setTimeout(() => document.getElementById('main-search')?.focus(), 200);
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
      document.body.style.overflow = '';
    }
  });

  // Type select toggle for frameworks
  const fwType = document.getElementById('fw-type');
  if (fwType) {
    fwType.addEventListener('change', () => {
      const isLink = fwType.value === 'link';
      document.getElementById('fw-link-group').style.display = isLink ? 'flex' : 'none';
      document.getElementById('fw-upload-group').style.display = isLink ? 'none' : 'flex';
    });
  }

  // Setup upload zones
  setupUploadZone('fw-upload-zone', 'fw-file-input', 'fw-upload-progress', 'fw-progress-fill', 'fw-upload-preview', (d) => {
    document.getElementById('fw-file-path').value = d.file_path;
    document.getElementById('fw-original-filename').value = d.original_filename;
    if (!document.getElementById('fw-type').value || d.type) {
      document.getElementById('fw-type').value = d.type;
    }
  });
  
  setupUploadZone('pres-upload-zone', 'pres-file-input', 'pres-upload-progress', 'pres-progress-fill', 'pres-upload-preview', (d) => {
    document.getElementById('pres-file-path').value = d.file_path;
    document.getElementById('pres-original-filename').value = d.original_filename;
  });

  setupUploadZone('cs-upload-zone', 'cs-file-input', 'cs-upload-progress', 'cs-progress-fill', 'cs-upload-preview', (d) => {
    document.getElementById('cs-file-path').value = d.file_path;
    document.getElementById('cs-original-filename').value = d.original_filename;
    if (d.type) document.getElementById('cs-entry-type').value = d.type;
  });

  setupUploadZone('interview-upload-zone', 'interview-file-input', 'interview-upload-progress', 'interview-progress-fill', 'interview-upload-preview', (d) => {
    document.getElementById('interview-file-path').value = d.file_path;
    document.getElementById('interview-original-filename').value = d.original_filename;
    if (d.type) document.getElementById('interview-entry-type').value = d.type;
  });
});
