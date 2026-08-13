/* ─── Presentations Module ─── */
const Presentations = {
  items: [],
  currentCategory: 'interview',

  async load() {
    this.loadCategory(this.currentCategory);
  },

  async loadCategory(category) {
    this.currentCategory = category;
    const grid = document.getElementById('presentations-grid');
    grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const data = await App.fetch(`/presentations?category=${category}`);
      this.items = data.data;
      this.render();
    } catch {
      grid.innerHTML = Utils.emptyState('⚠️', 'Failed to load', 'Please try refreshing');
    }
  },

  render() {
    const grid = document.getElementById('presentations-grid');
    const catLabel = this.currentCategory === 'interview' ? 'interview' : 'client';
    if (!this.items.length) {
      grid.innerHTML = Utils.emptyState('📊', `No ${catLabel} presentations yet`, 'Upload your first presentation using the button above');
      return;
    }
    grid.innerHTML = this.items.map(item => this.renderCard(item)).join('');
  },

  renderCard(item) {
    const catIcon = item.category === 'interview' ? '🎤' : '🤝';
    const thumb = item.file_path
      ? (item.file_path.match(/\.(png|jpg|jpeg|gif|webp)$/i)
          ? `<img src="${item.file_path}" alt="${item.name}" loading="lazy">`
          : `<span>📊</span>`)
      : `<span>📊</span>`;

    return `
      <div class="item-card" onclick="Presentations.openPreview('${item.id}')">
        <div class="item-card-thumb" style="cursor:pointer">
          ${thumb}
          <div class="type-overlay type-document">${catIcon} ${item.category.toUpperCase()}</div>
        </div>
        <div class="item-card-body">
          <div class="item-card-name" title="${item.name}">${item.name}</div>
          ${item.description ? `<div class="item-card-desc">${item.description}</div>` : ''}
          ${Utils.renderTags(item.tags)}
          <div class="item-card-footer">
            <span class="item-card-date">${Utils.formatDate(item.created_at)}</span>
            <div class="item-card-actions" onclick="event.stopPropagation()">
              <button class="item-card-action" title="Preview Presentation" onclick="Presentations.openPreview('${item.id}')">👁️</button>
              ${item.file_path ? `<button class="item-card-action" title="Open file" onclick="window.open('${item.file_path}','_blank')">↗</button>` : ''}
              <button class="item-card-action" title="Edit" onclick="Presentations.openEditModal('${item.id}')">✏️</button>
              <button class="item-card-action delete" title="Delete" onclick="Presentations.delete('${item.id}','${item.name.replace(/'/g, "\\'")}')">🗑</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  openPreview(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    document.getElementById('preview-modal-title').textContent = item.name;

    let viewerHtml = '';
    if (item.file_path) {
      const isPdf = item.file_path.match(/\.pdf$/i);
      const isImg = item.file_path.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
      const fullUrl = item.file_path.startsWith('http') ? item.file_path : (window.location.origin + item.file_path);

      if (isPdf) {
        viewerHtml = `
          <div style="margin-top:16px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-default);background:#1a1a1a">
            <iframe src="${item.file_path}#toolbar=0" style="width:100%;height:460px;border:none" title="${item.name}"></iframe>
          </div>
          <div style="margin-top:10px;text-align:right">
            <button class="btn btn-secondary btn-sm" onclick="window.open('${item.file_path}', '_blank')">Open Fullscreen ↗</button>
          </div>
        `;
      } else if (isImg) {
        viewerHtml = `
          <div style="margin-top:16px;max-height:420px;border-radius:var(--radius-md);overflow:hidden;background:var(--bg-elevated);text-align:center" onclick="window.open('${item.file_path}', '_blank')">
            <img src="${item.file_path}" alt="${item.name}" style="max-width:100%;max-height:420px;object-fit:contain">
          </div>
        `;
      } else {
        // Presentation (.pptx, .key, etc.)
        const googleDocsViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
        viewerHtml = `
          <div style="margin-top:16px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-default);background:#1a1a1a;min-height:360px">
            <iframe src="${googleDocsViewer}" style="width:100%;height:420px;border:none" title="${item.name}" onerror="this.style.display='none'"></iframe>
          </div>
          <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:13px;color:var(--text-muted)">File: ${item.original_filename || 'Presentation'}</span>
            <button class="btn btn-primary btn-sm" onclick="window.open('${item.file_path}', '_blank')">Open File ↗</button>
          </div>
        `;
      }
    }

    const modalBody = document.getElementById('preview-modal-body');
    modalBody.innerHTML = `
      <div class="preview-meta-row">
        <span class="type-overlay type-document" style="position:static">🎤 ${item.category.toUpperCase()} PRESENTATION</span>
        <span style="font-size:12px;color:var(--text-muted)">Created: ${Utils.formatDate(item.created_at)}</span>
      </div>
      ${item.description ? `
        <div class="form-label" style="margin-bottom:4px;font-weight:600">Description:</div>
        <div class="preview-content-box">${(item.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
      ` : ''}
      ${viewerHtml}
      ${item.tags && item.tags.length ? `
        <div style="margin-top:12px">
          <div class="form-label" style="margin-bottom:4px">Tags:</div>
          ${Utils.renderTags(item.tags)}
        </div>
      ` : ''}
    `;

    Modal.open('preview-modal');
  },

  setCategory(category, btn) {
    this.currentCategory = category;
    document.querySelectorAll('.pres-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.loadCategory(category);
  },

  openAddModal() {
    document.getElementById('pres-modal-title').textContent = 'Add Presentation';
    document.getElementById('pres-name').value = '';
    document.getElementById('pres-desc').value = '';
    document.getElementById('pres-category').value = this.currentCategory;
    document.getElementById('pres-tags').value = '';
    document.getElementById('pres-file-path').value = '';
    document.getElementById('pres-original-filename').value = '';
    document.getElementById('pres-edit-id').value = '';
    document.getElementById('pres-upload-preview').style.display = 'none';
    document.getElementById('pres-upload-progress').classList.remove('visible');
    document.getElementById('pres-progress-fill').style.width = '0%';
    Modal.open('pres-modal');
  },

  openEditModal(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('pres-modal-title').textContent = 'Edit Presentation';
    document.getElementById('pres-name').value = item.name;
    document.getElementById('pres-desc').value = item.description || '';
    document.getElementById('pres-category').value = item.category;
    document.getElementById('pres-tags').value = (item.tags || []).join(', ');
    document.getElementById('pres-file-path').value = item.file_path || '';
    document.getElementById('pres-original-filename').value = item.original_filename || '';
    document.getElementById('pres-edit-id').value = item.id;
    if (item.file_path) {
      const preview = document.getElementById('pres-upload-preview');
      preview.style.display = 'flex';
      preview.innerHTML = `<span>📊</span><span>${item.original_filename || 'Existing file'}</span>`;
    }
    Modal.open('pres-modal');
  },

  closeModal() { Modal.close('pres-modal'); },

  async save() {
    const name = document.getElementById('pres-name').value.trim();
    const category = document.getElementById('pres-category').value;
    if (!name) { Toast.show('Name is required', 'error'); return; }

    const payload = {
      name, category,
      description: document.getElementById('pres-desc').value.trim(),
      file_path: document.getElementById('pres-file-path').value || null,
      original_filename: document.getElementById('pres-original-filename').value || null,
      tags: Utils.parseTags(document.getElementById('pres-tags').value),
    };

    const editId = document.getElementById('pres-edit-id').value;
    try {
      if (editId) {
        await App.fetch(`/presentations/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        Toast.show('Presentation updated!', 'success');
      } else {
        await App.fetch('/presentations', { method: 'POST', body: JSON.stringify(payload) });
        Toast.show('Presentation added!', 'success');
      }
      this.closeModal();
      this.setCategory(category, document.querySelector(`.pres-tab[data-cat="${category}"]`));
    } catch {}
  },

  async delete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await App.fetch(`/presentations/${id}`, { method: 'DELETE' });
      Toast.show('Presentation deleted', 'info');
      this.load();
    } catch {}
  },
};
