/* GigVault app logic */
const PLATFORMS = ["Uber", "Lyft", "DoorDash", "Instacart", "Grubhub", "Amazon Flex", "Upwork", "Fiverr", "Other"];

const GV = {
  state: null,
  entryType: 'income',
  chartPlatform: null,
  chartWeek: null,

  /* ---------------- Boot ---------------- */
  init(){
    this.state = this.loadState();
    this.renderPlatformChips('platform-grid');
    this.renderPlatformChips('set-platform-grid');
    this.populateEntryPlatforms();

    if(this.state.licensed && this.state.onboarded){
      this.showScreen('app');
      this.goto('dashboard');
      this.renderDashboard();
    } else if(this.state.licensed){
      this.showScreen('onboard');
    } else {
      this.showScreen('license');
    }

    document.getElementById('license-submit').addEventListener('click', () => this.checkLicense());
    document.getElementById('license-input').addEventListener('keydown', e => {
      if(e.key === 'Enter') this.checkLicense();
    });
  },

  loadState(){
    const raw = localStorage.getItem('gigvault_state');
    if(raw) return JSON.parse(raw);
    return {
      licensed: false,
      onboarded: false,
      name: '',
      platforms: [],
      taxRate: 20,
      caps: { gas: 100, food: 80, other: 50 },
      entries: [] // {id, type, amount, platform, note, date}
    };
  },

  save(){ localStorage.setItem('gigvault_state', JSON.stringify(this.state)); },

  showScreen(name){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
  },

  /* ---------------- License ---------------- */
  checkLicense(){
    const code = document.getElementById('license-input').value.trim();
    const errorEl = document.getElementById('license-error');
    if(!/^\d{5}$/.test(code)){
      errorEl.textContent = 'Enter the 5-digit code from your email or text.';
      return;
    }
    // NOTE: this calls your license verification endpoint (Firebase function).
    // Placeholder local check until that's wired up.
    GV.verifyLicenseRemote(code).then(valid => {
      if(valid){
        this.state.licensed = true;
        this.save();
        this.showScreen('onboard');
      } else {
        errorEl.textContent = 'That code doesn\'t match. Double check and try again.';
      }
    });
  },

  // Replace this with a real fetch() to your Firebase Cloud Function endpoint,
  // e.g. fetch('https://us-central1-YOURPROJECT.cloudfunctions.net/verifyLicense', {...})
  async verifyLicenseRemote(code){
    // TEMP: accept any 5-digit code so the app is testable before Firebase is wired up.
    return true;
  },

  /* ---------------- Onboarding ---------------- */
  selectedPlatforms: [],

  renderPlatformChips(containerId){
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    PLATFORMS.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = p;
      chip.onclick = () => {
        chip.classList.toggle('selected');
      };
      grid.appendChild(chip);
    });
  },

  nextStep(current){
    if(current === 1){
      const name = document.getElementById('ob-name').value.trim();
      if(!name) return alert('Enter your name to continue.');
      this.tempName = name;
    }
    if(current === 2){
      this.tempPlatforms = Array.from(document.querySelectorAll('#platform-grid .chip.selected')).map(c => c.textContent);
    }
    if(current === 3){
      this.tempTax = parseInt(document.getElementById('ob-tax').value, 10);
    }
    document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
    document.getElementById('ob-step-' + (current + 1)).classList.add('active');
    document.getElementById('ob-progress-fill').style.width = ((current + 1) / 4 * 100) + '%';
  },

  updateTaxLabel(){
    document.getElementById('ob-tax-label').textContent = document.getElementById('ob-tax').value + '%';
  },

  finishOnboarding(){
    this.state.name = this.tempName || 'there';
    this.state.platforms = this.tempPlatforms && this.tempPlatforms.length ? this.tempPlatforms : ['Other'];
    this.state.taxRate = this.tempTax !== undefined ? this.tempTax : 20;
    this.state.caps = {
      gas: parseFloat(document.getElementById('ob-cap-gas').value) || 100,
      food: parseFloat(document.getElementById('ob-cap-food').value) || 80,
      other: parseFloat(document.getElementById('ob-cap-other').value) || 50
    };
    this.state.onboarded = true;
    this.save();
    this.populateEntryPlatforms();
    this.showScreen('app');
    this.goto('dashboard');
    this.renderDashboard();
  },

  /* ---------------- Navigation ---------------- */
  goto(view){
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    if(view === 'dashboard') this.renderDashboard();
    if(view === 'expenses') this.renderHistory();
    if(view === 'tax') this.renderTax();
    if(view === 'settings') this.renderSettings();
  },

  populateEntryPlatforms(){
    const sel = document.getElementById('entry-platform');
    sel.innerHTML = '';
    (this.state.platforms.length ? this.state.platforms : PLATFORMS).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      sel.appendChild(opt);
    });
  },

  setEntryType(type){
    this.entryType = type;
    document.getElementById('toggle-income').classList.toggle('active', type === 'income');
    document.getElementById('toggle-expense').classList.toggle('active', type === 'expense');
    document.getElementById('entry-platform-label').textContent = type === 'income' ? 'Platform' : 'Category';
  },

  saveEntry(){
    const amount = parseFloat(document.getElementById('entry-amount').value);
    if(!amount || amount <= 0) return alert('Enter a valid amount.');
    const platform = document.getElementById('entry-platform').value;
    const note = document.getElementById('entry-note').value.trim();
    this.state.entries.push({
      id: Date.now(),
      type: this.entryType,
      amount, platform, note,
      date: new Date().toISOString()
    });
    this.save();
    document.getElementById('entry-amount').value = '';
    document.getElementById('entry-note').value = '';
    this.goto('dashboard');
  },

  /* ---------------- Dashboard ---------------- */
  renderDashboard(){
    document.getElementById('dash-name').textContent = this.state.name || 'there';

    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const weekEntries = this.state.entries.filter(e => new Date(e.date) >= weekAgo);

    const income = weekEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = weekEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const taxSet = income * (this.state.taxRate / 100);
    const takeHome = income - expense - taxSet;

    document.getElementById('stat-takehome').textContent = '$' + takeHome.toFixed(2);
    document.getElementById('stat-tax').textContent = '$' + taxSet.toFixed(2);

    this.renderPlatformChart();
    this.renderWeekChart();
    this.renderBudgetBars(weekEntries);
  },

  renderPlatformChart(){
    const byPlatform = {};
    this.state.entries.filter(e => e.type === 'income').forEach(e => {
      byPlatform[e.platform] = (byPlatform[e.platform] || 0) + e.amount;
    });
    const labels = Object.keys(byPlatform);
    const data = Object.values(byPlatform);
    const ctx = document.getElementById('chart-platform');
    if(this.chartPlatform) this.chartPlatform.destroy();
    if(!labels.length){ ctx.getContext('2d').clearRect(0,0,ctx.width,ctx.height); return; }
    this.chartPlatform = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: ['#D4FF3F','#9FE000','#6FAF00','#3F7A00','#274F00','#1B232B'] }] },
      options: { plugins: { legend: { labels: { color: '#8A99A3' } } } }
    });
  },

  renderWeekChart(){
    const days = [];
    const totals = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push(label);
      const dayTotal = this.state.entries.filter(e => {
        const ed = new Date(e.date);
        return e.type === 'income' && ed.toDateString() === d.toDateString();
      }).reduce((s,e) => s + e.amount, 0);
      totals.push(dayTotal);
    }
    const ctx = document.getElementById('chart-week');
    if(this.chartWeek) this.chartWeek.destroy();
    this.chartWeek = new Chart(ctx, {
      type: 'bar',
      data: { labels: days, datasets: [{ data: totals, backgroundColor: '#D4FF3F', borderRadius: 6 }] },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8A99A3' }, grid: { display: false } },
          y: { ticks: { color: '#8A99A3' }, grid: { color: '#1F2A33' } }
        }
      }
    });
  },

  renderBudgetBars(weekEntries){
    const cats = [
      { key: 'gas', label: 'Gas / vehicle' },
      { key: 'food', label: 'Food / personal' },
      { key: 'other', label: 'Other' }
    ];
    const container = document.getElementById('budget-bars');
    container.innerHTML = '';
    cats.forEach(c => {
      const spent = weekEntries.filter(e => e.type === 'expense' && e.platform === c.label).reduce((s,e) => s + e.amount, 0);
      const cap = this.state.caps[c.key] || 0;
      const pct = cap > 0 ? Math.min((spent / cap) * 100, 100) : 0;
      const over = spent > cap;
      const row = document.createElement('div');
      row.className = 'budget-bar-row';
      row.innerHTML = `
        <div class="labels"><span class="cat">${c.label}</span><span class="amt">$${spent.toFixed(0)} / $${cap.toFixed(0)}</span></div>
        <div class="bar-track"><div class="bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>`;
      container.appendChild(row);
    });
  },

  /* ---------------- History ---------------- */
  renderHistory(){
    const list = document.getElementById('entry-list');
    list.innerHTML = '';
    const sorted = [...this.state.entries].sort((a,b) => new Date(b.date) - new Date(a.date));
    if(!sorted.length){
      list.innerHTML = '<div class="empty-state">No entries yet. Log your first gig to see it here.</div>';
      return;
    }
    sorted.forEach(e => {
      const row = document.createElement('div');
      row.className = 'entry-row';
      const d = new Date(e.date);
      row.innerHTML = `
        <div>
          <div>${e.platform}${e.note ? ' · ' + e.note : ''}</div>
          <div class="meta">${d.toLocaleDateString()} · ${e.type === 'income' ? 'Income' : 'Expense'}</div>
        </div>
        <div class="amt ${e.type}">${e.type === 'income' ? '+' : '-'}$${e.amount.toFixed(2)}</div>`;
      list.appendChild(row);
    });
  },

  /* ---------------- Tax ---------------- */
  renderTax(){
    const income = this.state.entries.filter(e => e.type === 'income').reduce((s,e) => s + e.amount, 0);
    const total = income * (this.state.taxRate / 100);
    document.getElementById('tax-total').textContent = '$' + total.toFixed(2);
    document.getElementById('tax-rate-display').textContent = this.state.taxRate;
    document.getElementById('tax-slider').value = this.state.taxRate;
    document.getElementById('tax-slider-val').textContent = this.state.taxRate + '%';
  },

  updateTaxRate(){
    const val = parseInt(document.getElementById('tax-slider').value, 10);
    this.state.taxRate = val;
    document.getElementById('tax-slider-val').textContent = val + '%';
    document.getElementById('tax-rate-display').textContent = val;
    this.save();
    this.renderTax();
  },

  /* ---------------- Settings ---------------- */
  renderSettings(){
    document.getElementById('set-name').value = this.state.name;
    document.getElementById('set-cap-gas').value = this.state.caps.gas;
    document.getElementById('set-cap-food').value = this.state.caps.food;
    document.getElementById('set-cap-other').value = this.state.caps.other;
    document.querySelectorAll('#set-platform-grid .chip').forEach(chip => {
      chip.classList.toggle('selected', this.state.platforms.includes(chip.textContent));
    });
  },

  saveSettings(){
    this.state.name = document.getElementById('set-name').value.trim() || this.state.name;
    this.state.platforms = Array.from(document.querySelectorAll('#set-platform-grid .chip.selected')).map(c => c.textContent);
    this.state.caps = {
      gas: parseFloat(document.getElementById('set-cap-gas').value) || 0,
      food: parseFloat(document.getElementById('set-cap-food').value) || 0,
      other: parseFloat(document.getElementById('set-cap-other').value) || 0
    };
    this.save();
    this.populateEntryPlatforms();
    alert('Saved.');
    this.goto('dashboard');
  },

  resetApp(){
    if(confirm('This clears all your GigVault data on this device. Continue?')){
      localStorage.removeItem('gigvault_state');
      location.reload();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => GV.init());

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
