/* ─── Frameworks Module ─── */
const Frameworks = {
  items: [],
  currentFilter: 'all',
  currentSort: 'order',

  async load() {
    const grid = document.getElementById('frameworks-grid');
    grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const data = await App.fetch(`/frameworks?sort=${this.currentSort}${this.currentFilter !== 'all' ? '&type=' + this.currentFilter : ''}`);
      this.items = data.data;
      this.render();
    } catch {
      grid.innerHTML = Utils.emptyState('⚠️', 'Failed to load', 'Please try refreshing the page');
    }
  },

  render() {
    const grid = document.getElementById('frameworks-grid');
    if (!this.items.length) {
      grid.innerHTML = Utils.emptyState('📁', 'No frameworks yet', 'Add your first framework using the button above');
      return;
    }
    grid.innerHTML = this.items.map(item => this.renderCard(item)).join('');
  },

  renderCard(item) {
    const thumbContent = item.file_path && item.type === 'image'
      ? `<img src="${item.file_path}" alt="${item.name}" loading="lazy">`
      : `<span>${Utils.typeIcon(item.type)}</span>`;

    return `
      <div class="item-card" id="fw-${item.id}" onclick="Frameworks.openPreview('${item.id}')">
        <div class="item-card-thumb">
          ${thumbContent}
          <div class="type-overlay ${Utils.typeClass(item.type)}">${Utils.typeLabel(item.type)}</div>
        </div>
        <div class="item-card-body">
          <div class="item-card-name" title="${item.name}">${item.name}</div>
          ${item.description ? `<div class="item-card-desc">${item.description}</div>` : ''}
          ${Utils.renderTags(item.tags)}
          <div class="item-card-footer">
            <span class="item-card-date">${Utils.formatDate(item.created_at)}</span>
            <div class="item-card-actions" onclick="event.stopPropagation()">
              <button class="item-card-action" title="Preview / View Details" onclick="Frameworks.openPreview('${item.id}')">👁️</button>
              ${item.file_path ? `<button class="item-card-action" title="Open attached file" onclick="Utils.openInlineFile('${item.file_path}', '${item.name.replace(/'/g, "\\'")}')">↗</button>` : ''}
              <button class="item-card-action" title="Edit" onclick="Frameworks.openEditModal('${item.id}')">✏️</button>
              <button class="item-card-action delete" title="Delete" onclick="Frameworks.delete('${item.id}', '${item.name.replace(/'/g, "\\'")}')">🗑</button>
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

    let attachmentHtml = '';
    if (item.type === 'link' && item.file_path) {
      attachmentHtml = `
        <div style="margin-top:16px;padding:12px 16px;background:var(--bg-elevated);border-radius:var(--radius-md);display:flex;align-items:center;gap:10px">
          <span>🔗</span>
          <a href="${item.file_path}" target="_blank" style="font-size:14px;font-weight:500;word-break:break-all;flex:1">${item.file_path}</a>
          <button class="btn btn-secondary btn-sm" onclick="window.open('${item.file_path}', '_blank')">Open Link ↗</button>
        </div>
      `;
    } else if (item.file_path) {
      const isImg = item.type === 'image' || (item.file_path && item.file_path.match(/\.(png|jpg|jpeg|gif|webp)$/i));
      if (isImg) {
        attachmentHtml = `
          <div style="margin-top:16px;max-height:360px;border-radius:var(--radius-md);overflow:hidden;background:var(--bg-elevated);cursor:pointer;text-align:center" onclick="window.open('${item.file_path}', '_blank')">
            <img src="${item.file_path}" alt="${item.name}" style="max-width:100%;max-height:360px;object-fit:contain">
          </div>
        `;
      } else {
        attachmentHtml = `
          <div style="margin-top:16px;padding:14px 16px;background:var(--bg-elevated);border-radius:var(--radius-md);display:flex;align-items:center;gap:12px">
            <span style="font-size:24px">${Utils.typeIcon(item.type)}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.original_filename || 'Attached File'}</div>
              <div style="font-size:12px;color:var(--text-muted)">Click to open file in new tab</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.open('${item.file_path}', '_blank')">Open File ↗</button>
          </div>
        `;
      }
    }

    const modalBody = document.getElementById('preview-modal-body');
    modalBody.innerHTML = `
      <div class="preview-meta-row">
        <span class="type-overlay ${Utils.typeClass(item.type)}" style="position:static">${Utils.typeLabel(item.type)}</span>
        <span style="font-size:12px;color:var(--text-muted)">Created: ${Utils.formatDate(item.created_at)}</span>
      </div>
      ${item.description ? `
        <div class="form-label" style="margin-bottom:4px;font-weight:600">Content / Description:</div>
        <div class="preview-content-box">${(item.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
      ` : '<div style="color:var(--text-muted);font-style:italic">No description provided.</div>'}
      ${attachmentHtml}
      ${item.tags && item.tags.length ? `
        <div style="margin-top:12px">
          <div class="form-label" style="margin-bottom:4px">Tags:</div>
          ${Utils.renderTags(item.tags)}
        </div>
      ` : ''}
    `;

    Modal.open('preview-modal');
  },

  setFilter(filter, btn) {
    this.currentFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    this.load();
  },

  setSort(sort) {
    this.currentSort = sort;
    this.load();
  },

  openAddModal() {
    document.getElementById('fw-modal-title').textContent = 'Add Framework';
    document.getElementById('fw-name').value = '';
    document.getElementById('fw-desc').value = '';
    document.getElementById('fw-type').value = 'document';
    document.getElementById('fw-tags').value = '';
    document.getElementById('fw-file-path').value = '';
    document.getElementById('fw-original-filename').value = '';
    document.getElementById('fw-edit-id').value = '';
    document.getElementById('fw-upload-preview').style.display = 'none';
    document.getElementById('fw-upload-progress').classList.remove('visible');
    document.getElementById('fw-progress-fill').style.width = '0%';
    document.getElementById('fw-link-group').style.display = 'none';
    document.getElementById('fw-upload-group').style.display = 'flex';
    Modal.open('fw-modal');
  },

  async openEditModal(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('fw-modal-title').textContent = 'Edit Framework';
    document.getElementById('fw-name').value = item.name;
    document.getElementById('fw-desc').value = item.description || '';
    document.getElementById('fw-type').value = item.type;
    document.getElementById('fw-tags').value = (item.tags || []).join(', ');
    document.getElementById('fw-file-path').value = item.file_path || '';
    document.getElementById('fw-original-filename').value = item.original_filename || '';
    document.getElementById('fw-edit-id').value = item.id;
    if (item.file_path && item.type !== 'link') {
      const preview = document.getElementById('fw-upload-preview');
      preview.style.display = 'flex';
      preview.innerHTML = `<span>${Utils.typeIcon(item.type)}</span><span>${item.original_filename || 'Existing file'}</span>`;
    }
    if (item.type === 'link') {
      document.getElementById('fw-link-group').style.display = 'flex';
      document.getElementById('fw-upload-group').style.display = 'none';
      document.getElementById('fw-link').value = item.file_path || '';
    }
    Modal.open('fw-modal');
  },

  closeModal() { Modal.close('fw-modal'); },

  async save() {
    const name = document.getElementById('fw-name').value.trim();
    const type = document.getElementById('fw-type').value;
    if (!name) { Toast.show('Name is required', 'error'); return; }

    let filePath = document.getElementById('fw-file-path').value;
    const originalFilename = document.getElementById('fw-original-filename').value;
    if (type === 'link') filePath = document.getElementById('fw-link').value;

    const payload = {
      name, type,
      description: document.getElementById('fw-desc').value.trim(),
      file_path: filePath || null,
      original_filename: originalFilename || null,
      tags: Utils.parseTags(document.getElementById('fw-tags').value),
    };

    const editId = document.getElementById('fw-edit-id').value;
    try {
      if (editId) {
        await App.fetch(`/frameworks/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        Toast.show('Framework updated!', 'success');
      } else {
        await App.fetch('/frameworks', { method: 'POST', body: JSON.stringify(payload) });
        Toast.show('Framework added!', 'success');
      }
      this.closeModal();
      this.load();
    } catch {}
  },

  async delete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await App.fetch(`/frameworks/${id}`, { method: 'DELETE' });
      Toast.show('Framework deleted', 'info');
      this.load();
    } catch {}
  },
};
