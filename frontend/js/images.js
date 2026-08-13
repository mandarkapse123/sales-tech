/* ─── Sales Images Module ─── */
const SalesImages = {
  items: [],
  currentTag: 'all',

  async load() {
    const grid = document.getElementById('images-grid');
    grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const data = await App.fetch('/images');
      this.items = data.data;
      this.render();
    } catch {
      grid.innerHTML = Utils.emptyState('⚠️', 'Failed to load images', 'Please try refreshing');
    }
  },

  render() {
    const grid = document.getElementById('images-grid');
    let filtered = this.items;
    if (this.currentTag !== 'all') {
      filtered = this.items.filter(i => (i.tags || []).includes(this.currentTag));
    }

    if (!filtered.length) {
      grid.innerHTML = Utils.emptyState('🖼️', 'No images found', 'Upload useful sales diagrams, infographics, or visual playbooks');
      return;
    }

    grid.innerHTML = filtered.map(item => this.renderCard(item)).join('');
  },

  renderCard(item) {
    return `
      <div class="item-card" onclick="SalesImages.openPreview('${item.id}')">
        <div class="item-card-thumb" style="height:150px;cursor:pointer;background:transparent">
          <img src="${item.file_path}" alt="${item.title}" loading="lazy" style="width:100%;height:100%;object-fit:contain">
          <div class="type-overlay type-image">🖼️ IMAGE</div>
        </div>
        <div class="item-card-body">
          <div class="item-card-name" title="${item.title}">${item.title}</div>
          ${item.description ? `<div class="item-card-desc">${item.description}</div>` : ''}
          ${Utils.renderTags(item.tags)}
          <div class="item-card-footer">
            <span class="item-card-date">${Utils.formatDate(item.created_at)}</span>
            <div class="item-card-actions" onclick="event.stopPropagation()">
              <button class="item-card-action" title="Present Mode" onclick="SalesImages.openPreview('${item.id}')">🖥️</button>
              <button class="item-card-action" title="Open Fullscreen in New Tab" onclick="Utils.openInlineFile('${item.file_path}', '${item.title.replace(/'/g, "\\'")}')">↗</button>
              <button class="item-card-action" title="Edit" onclick="SalesImages.openEditModal('${item.id}')">✏️</button>
              <button class="item-card-action delete" title="Delete" onclick="SalesImages.delete('${item.id}', '${item.title.replace(/'/g, "\\'")}')">🗑</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  openPreview(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    document.getElementById('preview-modal-title').textContent = item.title;

    const modalBody = document.getElementById('preview-modal-body');
    modalBody.innerHTML = `
      <div class="preview-meta-row" style="width:100%">
        <span class="type-overlay type-image" style="position:static">🖼️ IMAGE ASSET</span>
        <span style="font-size:12px;color:var(--text-muted)">Created: ${Utils.formatDate(item.created_at)}</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="Modal.toggleFullscreen()">🖥️ Present Mode</button>
          <button class="btn btn-ghost btn-sm" onclick="Modal.requestBrowserFullscreen()">↗ Fullscreen</button>
        </div>
      </div>
      <div class="image-preview-container" style="width:100%;max-height:560px;display:flex;align-items:center;justify-content:center;padding:8px">
        <img src="${item.file_path}" alt="${item.title}" style="max-width:100%;max-height:520px;object-fit:contain;border-radius:var(--radius-md)">
      </div>
      ${item.description ? `
        <div style="margin-top:12px;width:100%">
          <div class="form-label" style="margin-bottom:4px;font-weight:600">Description:</div>
          <div class="preview-content-box">${(item.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
        </div>
      ` : ''}
      ${item.tags && item.tags.length ? `
        <div style="margin-top:10px;width:100%">
          <div class="form-label" style="margin-bottom:4px">Tags:</div>
          ${Utils.renderTags(item.tags)}
        </div>
      ` : ''}
    `;

    Modal.open('preview-modal');
  },

  openAddModal() {
    document.getElementById('img-modal-title').textContent = 'Add Sales Image';
    document.getElementById('img-title').value = '';
    document.getElementById('img-desc').value = '';
    document.getElementById('img-tags').value = '';
    document.getElementById('img-file-path').value = '';
    document.getElementById('img-original-filename').value = '';
    document.getElementById('img-edit-id').value = '';
    document.getElementById('img-upload-preview').style.display = 'none';
    document.getElementById('img-upload-progress').classList.remove('visible');
    document.getElementById('img-progress-fill').style.width = '0%';
    Modal.open('img-modal');
  },

  openEditModal(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('img-modal-title').textContent = 'Edit Image';
    document.getElementById('img-title').value = item.title;
    document.getElementById('img-desc').value = item.description || '';
    document.getElementById('img-tags').value = (item.tags || []).join(', ');
    document.getElementById('img-file-path').value = item.file_path || '';
    document.getElementById('img-original-filename').value = item.original_filename || '';
    document.getElementById('img-edit-id').value = item.id;
    if (item.file_path) {
      const preview = document.getElementById('img-upload-preview');
      preview.style.display = 'flex';
      preview.innerHTML = `<span>🖼️</span><span>${item.original_filename || 'Existing image'}</span>`;
    }
    Modal.open('img-modal');
  },

  closeModal() { Modal.close('img-modal'); },

  async save() {
    const title = document.getElementById('img-title').value.trim();
    const filePath = document.getElementById('img-file-path').value;
    if (!title) { Toast.show('Title is required', 'error'); return; }
    if (!filePath) { Toast.show('Please upload an image file', 'error'); return; }

    const payload = {
      title,
      description: document.getElementById('img-desc').value.trim(),
      file_path: filePath,
      original_filename: document.getElementById('img-original-filename').value || null,
      tags: Utils.parseTags(document.getElementById('img-tags').value),
    };

    const editId = document.getElementById('img-edit-id').value;
    try {
      if (editId) {
        await App.fetch(`/images/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        Toast.show('Image updated!', 'success');
      } else {
        await App.fetch('/images', { method: 'POST', body: JSON.stringify(payload) });
        Toast.show('Image added!', 'success');
      }
      this.closeModal();
      this.load();
    } catch {}
  },

  async delete(id, title) {
    if (!confirm(`Delete image "${title}"?`)) return;
    try {
      await App.fetch(`/images/${id}`, { method: 'DELETE' });
      Toast.show('Image deleted', 'info');
      this.load();
    } catch {}
  },
};
