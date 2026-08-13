/* ─── Interview Module ─── */
const Interview = {
  tabs: [],
  currentTabId: null,
  entries: [],

  async load() {
    await this.loadTabs();
  },

  async loadTabs() {
    const tabsContainer = document.getElementById('interview-subtabs');
    try {
      const data = await App.fetch('/interview/tabs');
      this.tabs = data.data;

      tabsContainer.innerHTML = this.tabs.map((tab, i) => `
        <button
          class="cs-tab ${i === 0 && !this.currentTabId ? 'active' : (this.currentTabId === tab.id ? 'active' : '')}"
          data-tab-id="${tab.id}"
          onclick="Interview.switchTab('${tab.id}', this)"
        >
          <span>${tab.icon}</span>
          <span>${tab.name}</span>
          ${!tab.is_builtin ? `<span class="tab-delete" onclick="Interview.deleteTab(event,'${tab.id}','${tab.name.replace(/'/g, "\\'")}')">✕</span>` : ''}
        </button>
      `).join('') + `
        <button class="cs-tab cs-tab-add" onclick="Interview.openAddTabModal()">
          ＋ Add Tab
        </button>
      `;

      // Switch to first tab if none selected
      if (!this.currentTabId && this.tabs.length) {
        this.switchTab(this.tabs[0].id, tabsContainer.querySelector('.cs-tab'));
      } else if (this.currentTabId) {
        this.loadEntries(this.currentTabId);
      }
    } catch {
      tabsContainer.innerHTML = '<div style="padding:16px;color:var(--text-muted)">Failed to load interview tabs</div>';
    }
  },

  switchTab(tabId, btn) {
    this.currentTabId = tabId;
    document.querySelectorAll('#interview-subtabs .cs-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      document.getElementById('interview-active-title').innerHTML = `<span>${tab.icon}</span> ${tab.name}`;
    }
    this.loadEntries(tabId);
  },

  async loadEntries(tabId) {
    const grid = document.getElementById('interview-entries-grid');
    grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const data = await App.fetch(`/interview/entries/${tabId}`);
      this.entries = data.data;
      this.renderEntries();
    } catch {
      grid.innerHTML = Utils.emptyState('⚠️', 'Failed to load', 'Please try refreshing');
    }
  },

  renderEntries() {
    const grid = document.getElementById('interview-entries-grid');
    const tab = this.tabs.find(t => t.id === this.currentTabId);
    if (!this.entries.length) {
      grid.innerHTML = Utils.emptyState(
        tab?.icon || '🎤',
        `No items in ${tab?.name || 'this section'} yet`,
        'Click "+ Add Item" to add documents, sheets, scripts, or links'
      );
      return;
    }
    grid.innerHTML = this.entries.map(entry => this.renderEntryCard(entry)).join('');
  },

  renderEntryCard(entry) {
    const contentLines = (entry.content || '').split('\n');
    const isLong = contentLines.length > 5 || (entry.content || '').length > 300;
    const tagsHtml = Utils.renderTags(entry.tags);

    let attachmentHtml = '';
    if (entry.type === 'link' && entry.file_path) {
      attachmentHtml = `
        <div style="margin-top:10px;padding:8px 12px;background:var(--bg-elevated);border-radius:var(--radius-sm);display:flex;align-items:center;gap:8px">
          <span>🔗</span>
          <a href="${entry.file_path}" target="_blank" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${entry.file_path}</a>
        </div>
      `;
    } else if (entry.file_path) {
      const isImg = entry.type === 'image' || (entry.file_path && entry.file_path.match(/\.(png|jpg|jpeg|gif|webp)$/i));
      if (isImg) {
        attachmentHtml = `
          <div style="margin-top:10px;height:120px;border-radius:var(--radius-sm);overflow:hidden;background:var(--bg-elevated);cursor:pointer" onclick="window.open('${entry.file_path}','_blank')">
            <img src="${entry.file_path}" alt="${entry.title}" style="width:100%;height:100%;object-fit:cover">
          </div>
        `;
      } else {
        attachmentHtml = `
          <div style="margin-top:10px;padding:10px 12px;background:var(--bg-elevated);border-radius:var(--radius-sm);display:flex;align-items:center;gap:8px;cursor:pointer" onclick="window.open('${entry.file_path}','_blank')">
            <span style="font-size:20px">${Utils.typeIcon(entry.type)}</span>
            <span style="font-size:13px;font-weight:500;color:var(--text-primary);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${entry.original_filename || 'View Attached File'}</span>
            <span style="font-size:12px;color:var(--accent-blue-light)">Open ↗</span>
          </div>
        `;
      }
    }

    return `
      <div class="entry-card ${entry.is_pinned ? 'pinned' : ''}" id="interview-entry-${entry.id}">
        <div class="entry-card-title" style="cursor:pointer" onclick="Interview.openPreview('${entry.id}')">
          <span>${Utils.typeIcon(entry.type || 'text')}</span> ${entry.title}
        </div>
        ${entry.content ? `
          <div class="entry-card-content ${isLong ? '' : 'expanded'}" id="interview-content-${entry.id}">
            ${(entry.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
            ${isLong ? '<div class="entry-card-fade"></div>' : ''}
          </div>
          ${isLong ? `<button class="btn btn-ghost btn-sm" style="margin-top:4px;font-size:12px" onclick="Interview.openPreview('${entry.id}')">Expand & Preview 👁️</button>` : ''}
        ` : ''}
        ${attachmentHtml}
        ${tagsHtml}
        <div class="entry-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="Interview.openPreview('${entry.id}')">👁️ View</button>
          <button class="btn btn-secondary btn-sm" onclick="Interview.openEditEntry('${entry.id}')">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="Interview.togglePin('${entry.id}', ${entry.is_pinned})">${entry.is_pinned ? '📌 Unpin' : '📌 Pin'}</button>
          <button class="btn btn-danger btn-sm" onclick="Interview.deleteEntry('${entry.id}','${entry.title.replace(/'/g, "\\'")}')">🗑</button>
        </div>
      </div>
    `;
  },

  openPreview(id) {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return;

    document.getElementById('preview-modal-title').textContent = entry.title;

    let attachmentHtml = '';
    if (entry.type === 'link' && entry.file_path) {
      attachmentHtml = `
        <div style="margin-top:16px;padding:12px 16px;background:var(--bg-elevated);border-radius:var(--radius-md);display:flex;align-items:center;gap:10px">
          <span>🔗</span>
          <a href="${entry.file_path}" target="_blank" style="font-size:14px;font-weight:500;word-break:break-all;flex:1">${entry.file_path}</a>
          <button class="btn btn-secondary btn-sm" onclick="window.open('${entry.file_path}', '_blank')">Open Link ↗</button>
        </div>
      `;
    } else if (entry.file_path) {
      const isImg = entry.type === 'image' || (entry.file_path && entry.file_path.match(/\.(png|jpg|jpeg|gif|webp)$/i));
      if (isImg) {
        attachmentHtml = `
          <div style="margin-top:16px;max-height:360px;border-radius:var(--radius-md);overflow:hidden;background:var(--bg-elevated);cursor:pointer;text-align:center" onclick="window.open('${entry.file_path}', '_blank')">
            <img src="${entry.file_path}" alt="${entry.title}" style="max-width:100%;max-height:360px;object-fit:contain">
          </div>
        `;
      } else {
        attachmentHtml = `
          <div style="margin-top:16px;padding:14px 16px;background:var(--bg-elevated);border-radius:var(--radius-md);display:flex;align-items:center;gap:12px">
            <span style="font-size:24px">${Utils.typeIcon(entry.type)}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${entry.original_filename || 'Attached File'}</div>
              <div style="font-size:12px;color:var(--text-muted)">Click to open file in new tab</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.open('${entry.file_path}', '_blank')">Open File ↗</button>
          </div>
        `;
      }
    }

    const modalBody = document.getElementById('preview-modal-body');
    modalBody.innerHTML = `
      <div class="preview-meta-row">
        <span class="type-overlay ${Utils.typeClass(entry.type || 'text')}" style="position:static">${Utils.typeLabel(entry.type || 'text')}</span>
        <span style="font-size:12px;color:var(--text-muted)">Created: ${Utils.formatDate(entry.created_at)}</span>
        ${entry.is_pinned ? '<span class="tag" style="color:var(--accent-amber);border-color:rgba(245,158,11,0.3)">📌 Pinned</span>' : ''}
      </div>
      ${entry.content ? `
        <div class="form-label" style="margin-bottom:4px;font-weight:600">Content / Script / Notes:</div>
        <div class="preview-content-box">${(entry.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
      ` : '<div style="color:var(--text-muted);font-style:italic">No text content provided.</div>'}
      ${attachmentHtml}
      ${entry.tags && entry.tags.length ? `
        <div style="margin-top:12px">
          <div class="form-label" style="margin-bottom:4px">Tags:</div>
          ${Utils.renderTags(entry.tags)}
        </div>
      ` : ''}
    `;

    Modal.open('preview-modal');
  },

  handleTypeChange() {
    const type = document.getElementById('interview-entry-type').value;
    const isLink = type === 'link';
    const isText = type === 'text';
    document.getElementById('interview-link-group').style.display = isLink ? 'flex' : 'none';
    document.getElementById('interview-upload-group').style.display = (!isLink && !isText) ? 'flex' : 'none';
  },

  openAddEntry() {
    document.getElementById('interview-modal-title').textContent = 'Add Interview Item';
    document.getElementById('interview-entry-title').value = '';
    document.getElementById('interview-entry-content').value = '';
    document.getElementById('interview-entry-type').value = 'text';
    document.getElementById('interview-link').value = '';
    document.getElementById('interview-entry-tags').value = '';
    document.getElementById('interview-entry-pinned').checked = false;
    document.getElementById('interview-file-path').value = '';
    document.getElementById('interview-original-filename').value = '';
    document.getElementById('interview-entry-edit-id').value = '';
    document.getElementById('interview-upload-preview').style.display = 'none';
    document.getElementById('interview-upload-progress').classList.remove('visible');
    this.handleTypeChange();
    Modal.open('interview-modal');
    setTimeout(() => document.getElementById('interview-entry-title').focus(), 200);
  },

  openEditEntry(id) {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return;
    document.getElementById('interview-modal-title').textContent = 'Edit Interview Item';
    document.getElementById('interview-entry-title').value = entry.title;
    document.getElementById('interview-entry-content').value = entry.content || '';
    document.getElementById('interview-entry-type').value = entry.type || 'text';
    document.getElementById('interview-entry-tags').value = (entry.tags || []).join(', ');
    document.getElementById('interview-entry-pinned').checked = entry.is_pinned;
    document.getElementById('interview-file-path').value = entry.file_path || '';
    document.getElementById('interview-original-filename').value = entry.original_filename || '';
    document.getElementById('interview-entry-edit-id').value = entry.id;

    if (entry.type === 'link') {
      document.getElementById('interview-link').value = entry.file_path || '';
    } else if (entry.file_path) {
      const preview = document.getElementById('interview-upload-preview');
      preview.style.display = 'flex';
      preview.innerHTML = `<span>${Utils.typeIcon(entry.type)}</span><span>${entry.original_filename || 'Attached file'}</span>`;
    }

    this.handleTypeChange();
    Modal.open('interview-modal');
  },

  closeModal() { Modal.close('interview-modal'); },

  async saveEntry() {
    const title = document.getElementById('interview-entry-title').value.trim();
    if (!title) { Toast.show('Title is required', 'error'); return; }
    if (!this.currentTabId) { Toast.show('No tab selected', 'error'); return; }

    const type = document.getElementById('interview-entry-type').value;
    let filePath = document.getElementById('interview-file-path').value;
    let originalFilename = document.getElementById('interview-original-filename').value;

    if (type === 'link') {
      filePath = document.getElementById('interview-link').value.trim();
      originalFilename = null;
    } else if (type === 'text') {
      filePath = null;
      originalFilename = null;
    }

    const payload = {
      title,
      type,
      content: document.getElementById('interview-entry-content').value,
      file_path: filePath || null,
      original_filename: originalFilename || null,
      tags: Utils.parseTags(document.getElementById('interview-entry-tags').value),
      is_pinned: document.getElementById('interview-entry-pinned').checked,
    };

    const editId = document.getElementById('interview-entry-edit-id').value;
    try {
      if (editId) {
        await App.fetch(`/interview/entries/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        Toast.show('Item updated!', 'success');
      } else {
        await App.fetch(`/interview/entries/${this.currentTabId}`, { method: 'POST', body: JSON.stringify(payload) });
        Toast.show('Item added!', 'success');
      }
      this.closeModal();
      this.loadEntries(this.currentTabId);
    } catch {}
  },

  async togglePin(id, isPinned) {
    try {
      await App.fetch(`/interview/entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_pinned: !isPinned }),
      });
      this.loadEntries(this.currentTabId);
    } catch {}
  },

  async deleteEntry(id, title) {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await App.fetch(`/interview/entries/${id}`, { method: 'DELETE' });
      Toast.show('Item deleted', 'info');
      this.loadEntries(this.currentTabId);
    } catch {}
  },

  /* ── Custom Tab Management ── */

  openAddTabModal() {
    document.getElementById('new-itab-name').value = '';
    document.getElementById('new-itab-icon').value = '';
    Modal.open('add-interview-tab-modal');
    setTimeout(() => document.getElementById('new-itab-name').focus(), 200);
  },

  closeAddTabModal() { Modal.close('add-interview-tab-modal'); },

  async saveNewTab() {
    const name = document.getElementById('new-itab-name').value.trim();
    if (!name) { Toast.show('Tab name is required', 'error'); return; }
    const icon = document.getElementById('new-itab-icon').value.trim() || '💼';
    try {
      await App.fetch('/interview/tabs', { method: 'POST', body: JSON.stringify({ name, icon }) });
      Toast.show(`Tab "${name}" created!`, 'success');
      this.closeAddTabModal();
      this.currentTabId = null;
      await this.loadTabs();
      // Switch to the new tab
      const newTab = this.tabs[this.tabs.length - 1];
      if (newTab) {
        const btn = document.querySelector(`#interview-subtabs .cs-tab[data-tab-id="${newTab.id}"]`);
        this.switchTab(newTab.id, btn);
      }
    } catch {}
  },

  async deleteTab(e, id, name) {
    e.stopPropagation();
    if (!confirm(`Delete tab "${name}" and all its items?`)) return;
    try {
      await App.fetch(`/interview/tabs/${id}`, { method: 'DELETE' });
      Toast.show(`Tab "${name}" deleted`, 'info');
      if (this.currentTabId === id) this.currentTabId = null;
      await this.loadTabs();
    } catch {}
  },
};
