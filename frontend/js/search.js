/* ─── Search Module with Slash Command Support ─── */
const Search = {
  input: null,
  dropdown: null,
  commands: [],
  results: [],
  selectedIndex: -1,
  debounceTimer: null,

  async init() {
    this.input = document.getElementById('main-search');
    this.dropdown = document.getElementById('search-dropdown');
    if (!this.input) return;

    // Load slash commands
    try {
      const data = await App.fetch('/search/commands');
      this.commands = data.data;
    } catch {}

    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKey(e));
    this.input.addEventListener('focus', () => {
      if (this.input.value === '') this.showCommands();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-container')) this.hide();
    });
  },

  handleInput() {
    clearTimeout(this.debounceTimer);
    const val = this.input.value.trim();
    if (!val) {
      this.showCommands();
      return;
    }
    if (val.startsWith('/')) {
      this.filterCommands(val);
      return;
    }
    this.debounceTimer = setTimeout(() => this.search(val), 300);
  },

  showCommands() {
    if (!this.commands.length) { this.hide(); return; }
    this.selectedIndex = -1;
    this.dropdown.innerHTML = `
      <div class="dropdown-section-title">Slash Commands</div>
      ${this.commands.map((c, i) => `
        <div class="dropdown-item" data-index="${i}" onclick="Search.selectCommand('${c.cmd}')">
          <div class="dropdown-item-icon">${c.icon}</div>
          <div class="dropdown-item-info">
            <div class="dropdown-item-title">${c.label}</div>
            <div class="dropdown-item-subtitle">${c.description}</div>
          </div>
          <div class="dropdown-item-cmd">${c.cmd}</div>
        </div>
      `).join('')}
    `;
    this.dropdown.classList.add('visible');
  },

  filterCommands(query) {
    const q = query.toLowerCase();
    const filtered = this.commands.filter(c =>
      c.cmd.includes(q) || c.label.toLowerCase().includes(q.slice(1))
    );
    if (!filtered.length) {
      // Try search with the command
      this.search(query);
      return;
    }
    this.selectedIndex = -1;
    this.dropdown.innerHTML = `
      <div class="dropdown-section-title">Commands</div>
      ${filtered.map((c, i) => `
        <div class="dropdown-item" data-index="${i}" onclick="Search.selectCommand('${c.cmd}')">
          <div class="dropdown-item-icon">${c.icon}</div>
          <div class="dropdown-item-info">
            <div class="dropdown-item-title">${c.label}</div>
            <div class="dropdown-item-subtitle">${c.description}</div>
          </div>
          <div class="dropdown-item-cmd">${c.cmd}</div>
        </div>
      `).join('')}
    `;
    this.dropdown.classList.add('visible');

    // Auto-trigger search if full command typed
    if (query.match(/^\/\w[\w\/-]+\s/)) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.search(query), 400);
    }
  },

  async search(query) {
    try {
      const data = await App.fetch(`/search?q=${encodeURIComponent(query)}`);
      this.results = data.data;
      this.renderResults(data);
    } catch {}
  },

  renderResults(data) {
    const { data: results, filter } = data;
    this.selectedIndex = -1;

    if (!results.length) {
      this.dropdown.innerHTML = `
        <div class="dropdown-section-title">No results</div>
        <div class="dropdown-item" style="opacity:0.5">
          <div class="dropdown-item-icon">🔍</div>
          <div class="dropdown-item-info">
            <div class="dropdown-item-title">No results found</div>
            <div class="dropdown-item-subtitle">Try a different search or slash command</div>
          </div>
        </div>
      `;
      this.dropdown.classList.add('visible');
      return;
    }

    // Group by type
    const grouped = {};
    results.forEach(r => {
      const group = this.groupLabel(r.type);
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(r);
    });

    let html = '';
    let globalIndex = 0;
    for (const [group, items] of Object.entries(grouped)) {
      html += `<div class="dropdown-section-title">${group}</div>`;
      items.forEach(item => {
        html += `
          <div class="dropdown-item" data-index="${globalIndex}" onclick="Search.openResult(${JSON.stringify(item).replace(/"/g, '&quot;')})">
            <div class="dropdown-item-icon">${this.resultIcon(item)}</div>
            <div class="dropdown-item-info">
              <div class="dropdown-item-title">${item.title}</div>
              <div class="dropdown-item-subtitle">${item.preview || item.type}</div>
            </div>
          </div>
        `;
        globalIndex++;
      });
    }
    this.dropdown.innerHTML = html;
    this.dropdown.classList.add('visible');
  },

  groupLabel(type) {
    if (type === 'framework') return '📁 Frameworks';
    if (type === 'image') return '🖼️ Sales Images';
    if (type === 'presentation:interview') return '🎤 Interview Presentations';
    if (type === 'presentation:client') return '🤝 Client Presentations';
    if (type.startsWith('interview:')) return `🎤 Interview — ${type.replace('interview:', '')}`;
    if (type.startsWith('sales:')) return `⚡ Core Sales — ${type.replace('sales:', '')}`;
    if (type.startsWith('presentation')) return '📊 Presentations';
    return type;
  },

  resultIcon(item) {
    if (item.type === 'framework') return Utils.typeIcon(item.file_type || 'document');
    if (item.type === 'image') return '🖼️';
    if (item.type.startsWith('interview')) return '🎤';
    if (item.type.startsWith('presentation')) return '📊';
    return '📝';
  },

  openResult(item) {
    this.hide();
    this.input.value = '';
    if (item.type === 'framework') {
      App.navigate('frameworks');
      if (item.file_path) setTimeout(() => window.open(item.file_path, '_blank'), 500);
    } else if (item.type === 'image') {
      App.navigate('images');
      setTimeout(() => SalesImages.openPreview(item.id), 400);
    } else if (item.type.startsWith('interview')) {
      App.navigate('interview');
    } else if (item.type.startsWith('presentation')) {
      App.navigate('presentations');
      const cat = item.category || (item.type.includes('interview') ? 'interview' : 'client');
      setTimeout(() => Presentations.setCategory(cat, document.querySelector(`.pres-tab[data-cat="${cat}"]`)), 400);
    } else if (item.type.startsWith('sales:')) {
      App.navigate('core-sales');
    }
  },

  selectCommand(cmd) {
    this.input.value = cmd + ' ';
    this.input.focus();
    this.search(cmd + ' ');
  },

  handleKey(e) {
    const items = this.dropdown.querySelectorAll('.dropdown-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
      this.updateSelected(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.updateSelected(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.selectedIndex >= 0) items[this.selectedIndex].click();
      else if (this.input.value) this.search(this.input.value);
    } else if (e.key === 'Escape') {
      this.hide();
    }
  },

  updateSelected(items) {
    items.forEach(i => i.classList.remove('selected'));
    if (this.selectedIndex >= 0) {
      items[this.selectedIndex].classList.add('selected');
      items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  },

  hide() {
    this.dropdown.classList.remove('visible');
    this.selectedIndex = -1;
  },
};

// Init search when DOM ready
document.addEventListener('DOMContentLoaded', () => Search.init());
