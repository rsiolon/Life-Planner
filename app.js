// ── KATEGORI ───────────────────────────────────────────────────
const YEAR = new Date().getFullYear();
const CATS = [
  { id: 'ibadah',    label: 'Ibadah',    icon: '🕌', bg: '#FFF3E0' },
  { id: 'kesehatan', label: 'Kesehatan', icon: '🏃', bg: '#E8F5E9' },
  { id: 'karir',     label: 'Karir',     icon: '💼', bg: '#E3F2FD' },
  { id: 'keuangan',  label: 'Keuangan',  icon: '💰', bg: '#FFF9C4' },
  { id: 'personal',  label: 'Personal',  icon: '✨', bg: '#EDE7F6' },
  { id: 'sosial',    label: 'Sosial',    icon: '🤝', bg: '#FCE4EC' },
];

// ── DATA DEFAULT ───────────────────────────────────────────────
const DEFAULT = {
  daily: {
    ibadah:    [
      { id: 1, text: 'Sholat 5 waktu',    streak: 0, history: [] },
      { id: 2, text: 'Baca Al-Quran',     streak: 0, history: [] },
    ],
    kesehatan: [
      { id: 3, text: 'Olahraga 30 menit', streak: 0, history: [] },
      { id: 4, text: 'Minum 8 gelas air', streak: 0, history: [] },
    ],
    karir:     [
      { id: 5, text: 'Belajar skill baru 30 menit', streak: 0, history: [] },
    ],
    personal:  [
      { id: 6, text: 'Baca buku 20 halaman', streak: 0, history: [] },
      { id: 7, text: 'Jurnal harian',         streak: 0, history: [] },
    ],
    keuangan:  [],
    sosial:    [],
  },
  weekly: {
    ibadah:    [],
    kesehatan: [
      { id: 10, text: 'Timbang badan',         streak: 0, history: [] },
    ],
    karir:     [
      { id: 11, text: 'Review goals minggu ini', streak: 0, history: [] },
    ],
    keuangan:  [
      { id: 12, text: 'Catat pengeluaran minggu ini', streak: 0, history: [] },
    ],
    personal:  [],
    sosial:    [
      { id: 13, text: 'Telpon keluarga',      streak: 0, history: [] },
      { id: 14, text: 'Quality time teman',   streak: 0, history: [] },
    ],
  },
  monthly: {
    ibadah:    [],
    kesehatan: [
      { id: 30, text: 'Timbang badan & ukur progress', streak: 0, history: [] },
    ],
    karir:     [
      { id: 31, text: 'Review & set goals bulan depan', streak: 0, history: [] },
      { id: 32, text: 'Belajar skill baru (1 modul)',   streak: 0, history: [] },
    ],
    keuangan:  [
      { id: 33, text: 'Nabung sesuai target',           streak: 0, history: [] },
      { id: 34, text: 'Review pengeluaran bulanan',     streak: 0, history: [] },
    ],
    personal:  [
      { id: 35, text: 'Liburan / me-time bulanan',      streak: 0, history: [] },
    ],
    sosial:    [
      { id: 36, text: 'Gathering keluarga / teman',     streak: 0, history: [] },
    ],
  },
  yearly: {
    ibadah:    [],
    kesehatan: [
      { id: 20, text: 'Medical check-up tahunan', type: 'once', done: false, deadline: 'Apr 2025' },
    ],
    karir:     [
      { id: 21, text: 'Dapet promosi',             type: 'once',   done: false, deadline: 'Des 2025' },
      { id: 22, text: 'Selesaikan online course',  type: 'once',   done: false, deadline: 'Jun 2025' },
    ],
    keuangan:  [
      { id: 23, text: 'Tabungan darurat',          type: 'number', target: 50000000, current: 10000000, unit: 'Rp', deadline: 'Des 2025' },
      { id: 24, text: 'Investasi reksa dana',      type: 'number', target: 12,       current: 2,        unit: 'bulan', deadline: 'Des 2025' },
    ],
    personal:  [
      { id: 25, text: 'Baca 12 buku',              type: 'number', target: 12, current: 2, unit: 'buku', deadline: 'Des 2025' },
      { id: 26, text: 'Liburan ke tempat baru',    type: 'once',   done: false, deadline: 'Agu 2025' },
    ],
    sosial:    [],
  }
};

// ── STATE ───────────────────────────────────────────────────────
let state = {};
let currentTab = 'dashboard';
let expandedCats = { dashboard: {}, daily: {}, weekly: {}, monthly: {}, yearly: {} };
let modalContext = { tab: null, catId: null, goalType: 'once' };
let calendarContext = { tab: null, catId: null, goalId: null };
let progressContext = { catId: null, goalId: null };
let nextId = 200;
let toastTimer;


// ── TANGGAL HELPER ─────────────────────────────────────────────
// Format tanggal jadi string "YYYY-MM-DD" — ini yang disimpen di history

function today() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// Dapet key bulan ini: "2025-04"
function thisMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function getMonthLabel() {
  const d = new Date();
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// Dapet key minggu ini: "2025-W03"
function thisWeek() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + String(week).padStart(2, '0');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getWeekLabel() {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (x) => x.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return fmt(start) + ' – ' + fmt(end);
}


// ── LOAD & SAVE ─────────────────────────────────────────────────
function loadData() {
  const saved = localStorage.getItem('lifeplanner-v2');
  if (saved) {
    state = JSON.parse(saved);
  } else {
    state = JSON.parse(JSON.stringify(DEFAULT));
  }
}

function saveData() {
  localStorage.setItem('lifeplanner-v2', JSON.stringify(state));
  showToast('Tersimpan ✓');
}


// ── HITUNG STREAK ───────────────────────────────────────────────
// Streak = berapa hari/minggu berturut-turut lo centang

function calcMonthlyStreak(history) {
  if (!history || history.length === 0) return 0;
  const sorted = [...history].sort().reverse();
  let streak = 0;
  const now = new Date();
  let year  = now.getFullYear();
  let month = now.getMonth() + 1;
  for (let i = 0; i < 24; i++) {
    const key = year + '-' + String(month).padStart(2, '0');
    if (sorted.includes(key)) {
      streak++;
      month--;
      if (month === 0) { month = 12; year--; }
    } else break;
  }
  return streak;
}

function calcStreak(history, isWeekly) {
  if (!history || history.length === 0) return 0;

  const sorted = [...history].sort().reverse();
  const current = isWeekly ? thisWeek() : today();

  let streak = 0;
  let check = current;

  for (let i = 0; i < 365; i++) {
    if (sorted.includes(check)) {
      streak++;
      if (isWeekly) {
        // Mundur 1 minggu
        const [year, w] = check.split('-W').map(Number);
        const prev = w === 1 ? (year - 1) + '-W52' : year + '-W' + String(w - 1).padStart(2, '0');
        check = prev;
      } else {
        // Mundur 1 hari
        const d = new Date(check);
        d.setDate(d.getDate() - 1);
        check = d.toISOString().split('T')[0];
      }
    } else {
      break;
    }
  }
  return streak;
}

function getBestStreak() {
  let best = 0;
  ['daily', 'weekly', 'monthly'].forEach(tab => {
    CATS.forEach(cat => {
      const goals = state[tab][cat.id] || [];
      goals.forEach(g => {
        const s = calcStreak(g.history, tab === 'weekly');
        if (s > best) best = s;
      });
    });
  });
  return best;
}


// ── HITUNG PROGRESS ─────────────────────────────────────────────
function isDoneToday(goal, type) {
  let key;
  if (type === 'weekly')  key = thisWeek();
  else if (type === 'monthly') key = thisMonth();
  else key = today();
  return goal.history && goal.history.includes(key);
}

function calcTabProgress(tab) {
  let total = 0, done = 0;
  CATS.forEach(cat => {
    const goals = state[tab][cat.id] || [];
    if (tab === 'yearly') {
      goals.forEach(g => {
        total++;
        if (g.type === 'once' && g.done) done++;
        if (g.type === 'number' && g.current >= g.target) done++;
      });
    } else {
      goals.forEach(g => {
        total++;
        if (isDoneToday(g, tab)) done++;
      });
    }
  });
  return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
}

function calcCatTabProgress(tab, catId) {
  const goals = state[tab][catId] || [];
  if (!goals.length) return { total: 0, done: 0, pct: 0 };
  let done = 0;
  goals.forEach(g => {
    if (tab === 'yearly') {
      if (g.type === 'once' && g.done) done++;
      if (g.type === 'number' && g.current >= g.target) done++;
    } else {
      if (isDoneToday(g, tab)) done++;
    }
  });
  return { total: goals.length, done, pct: Math.round(done / goals.length * 100) };
}


// ── SWITCH TAB ──────────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;

  // Update tab bar
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === 'tab-' + tab);
  });

  // Update pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + tab);
  });

  render();
}


// ── RENDER UTAMA ────────────────────────────────────────────────
function render() {
  if (currentTab === 'dashboard') renderDashboard();
  if (currentTab === 'daily')     renderHabitTab('daily');
  if (currentTab === 'weekly')    renderHabitTab('weekly');
  if (currentTab === 'monthly')   renderHabitTab('monthly');
  if (currentTab === 'yearly')    renderYearly();
}


// ── RENDER DASHBOARD ────────────────────────────────────────────
function renderDashboard() {
  // Header
  document.getElementById('headerTitle').textContent = 'Life Planner';
  document.getElementById('headerSub').textContent   = YEAR;

  // Stat cards
  const yearly = calcTabProgress('yearly');
  document.getElementById('statDone').textContent   = yearly.done;
  document.getElementById('statTotal').textContent  = yearly.total;
  document.getElementById('statStreak').textContent = getBestStreak();

  // Overall bar = rata-rata semua tab
  const d = calcTabProgress('daily');
  const w = calcTabProgress('weekly');
  const m = calcTabProgress('monthly');
  const y = calcTabProgress('yearly');
  const overallPct = Math.round((d.pct + w.pct + m.pct + y.pct) / 4);
  document.getElementById('headerPct').textContent  = overallPct + '%';
  document.getElementById('overallBar').style.width = overallPct + '%';

  // Summary cards
  const tabs = [
    { id: 'daily',   pctEl: 'dashDailyPct',   barEl: 'dashDailyBar' },
    { id: 'weekly',  pctEl: 'dashWeeklyPct',  barEl: 'dashWeeklyBar' },
    { id: 'monthly', pctEl: 'dashMonthlyPct', barEl: 'dashMonthlyBar' },
    { id: 'yearly',  pctEl: 'dashYearlyPct',  barEl: 'dashYearlyBar' },
  ];
  tabs.forEach(t => {
    const p = calcTabProgress(t.id);
    document.getElementById(t.pctEl).textContent    = p.pct + '%';
    document.getElementById(t.barEl).style.width    = p.pct + '%';
  });

  // Kategori overview
  const list = document.getElementById('dashCatList');
  list.innerHTML = '';
  CATS.forEach(cat => {
    const d = calcCatTabProgress('daily',   cat.id);
    const w = calcCatTabProgress('weekly',  cat.id);
    const mo = calcCatTabProgress('monthly', cat.id);
    const y = calcCatTabProgress('yearly',  cat.id);
    const total = d.total + w.total + mo.total + y.total;
    if (total === 0) return;
    const done  = d.done  + w.done  + mo.done  + y.done;
    const pct   = Math.round(done / total * 100);

    const card = document.createElement('div');
    card.className = 'cat-card';
    card.innerHTML = `
      <div class="cat-head" style="cursor:default">
        <div class="cat-top">
          <div class="cat-icon" style="background:${cat.bg}">${cat.icon}</div>
          <div class="cat-info">
            <div class="cat-name">${cat.label}</div>
            <div class="cat-count">${done} dari ${total} selesai</div>
          </div>
          <div class="cat-pct">${pct}%</div>
        </div>
        <div class="pbar"><div class="pbar-fill" style="width:${pct}%"></div></div>
      </div>`;
    list.appendChild(card);
  });
}


// ── RENDER DAILY / WEEKLY ────────────────────────────────────────
function renderHabitTab(tab) {
  const listEl   = document.getElementById(tab + 'CatList');
  const dateEl   = document.getElementById(tab + 'DateHeader');
  const prog     = calcTabProgress(tab);

  const titles = { daily: 'Daily Habits', weekly: 'Weekly Habits', monthly: 'Monthly Habits' };
  const subs   = {
    daily:   formatDate(today()),
    weekly:  getWeekLabel(),
    monthly: getMonthLabel(),
  };
  const dateLabels = {
    daily:   'Hari ini: '   + formatDate(today()),
    weekly:  'Minggu ini: ' + getWeekLabel(),
    monthly: 'Bulan ini: '  + getMonthLabel(),
  };

  document.getElementById('headerTitle').textContent = titles[tab];
  document.getElementById('headerSub').textContent   = subs[tab];
  document.getElementById('headerPct').textContent   = prog.pct + '%';
  document.getElementById('overallBar').style.width  = prog.pct + '%';
  dateEl.textContent = dateLabels[tab];

  listEl.innerHTML = '';

  CATS.forEach(cat => {
    const goals = state[tab][cat.id] || [];
    const { total, done, pct } = calcCatTabProgress(tab, cat.id);
    const isOpen = expandedCats[tab][cat.id];
    const periodLabel = { daily: 'hari ini', weekly: 'minggu ini', monthly: 'bulan ini' }[tab];

    const card = document.createElement('div');
    card.className = 'cat-card';
    card.innerHTML = `
      <div class="cat-head" onclick="toggleCat('${tab}','${cat.id}')">
        <div class="cat-top">
          <div class="cat-icon" style="background:${cat.bg}">${cat.icon}</div>
          <div class="cat-info">
            <div class="cat-name">${cat.label}</div>
            <div class="cat-count">${done} dari ${total} selesai ${periodLabel}</div>
          </div>
          <div class="cat-pct ${tab}">${pct}%</div>
          <div class="cat-chevron ${isOpen ? 'open' : ''}">▼</div>
        </div>
        <div class="pbar ${tab}">
          <div class="pbar-fill ${tab}" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="cat-body" style="display:${isOpen ? 'block' : 'none'}">
        ${goals.map(g => {
          const done    = isDoneToday(g, tab);
          const streak  = tab === 'monthly' ? calcMonthlyStreak(g.history) : calcStreak(g.history, tab === 'weekly');
          return `
          <div class="goal-row">
            <div class="chk ${done ? 'on ' + tab : ''}"
              onclick="toggleHabit('${tab}','${cat.id}',${g.id})"></div>
            <div class="goal-info">
              <div class="goal-txt ${done ? 'done' : ''}">${g.text}</div>
              ${streak > 0 ? `<div class="streak-badge">🔥 ${streak} ${tab === 'weekly' ? 'minggu' : tab === 'monthly' ? 'bulan' : 'hari'}</div>` : ''}
            </div>
            <div class="goal-actions">
              <button class="icon-btn" onclick="openCalendar('${tab}','${cat.id}',${g.id})" title="Lihat history">📆</button>
              <button class="icon-btn" onclick="deleteGoal('${tab}','${cat.id}',${g.id})" title="Hapus">×</button>
            </div>
          </div>`;
        }).join('')}
        <button class="add-goal-btn" onclick="openModal('${tab}','${cat.id}')">
          + Tambah habit
        </button>
      </div>`;
    listEl.appendChild(card);
  });
}


// ── RENDER YEARLY ───────────────────────────────────────────────
function renderYearly() {
  const listEl = document.getElementById('yearlyCatList');
  const prog   = calcTabProgress('yearly');

  document.getElementById('headerTitle').textContent = 'Yearly Goals';
  document.getElementById('headerSub').textContent   = 'Target ' + YEAR;
  document.getElementById('yearlyDateHeader').textContent = 'Target Tahun ' + YEAR;
  document.getElementById('headerPct').textContent   = prog.pct + '%';
  document.getElementById('overallBar').style.width  = prog.pct + '%';

  listEl.innerHTML = '';

  CATS.forEach(cat => {
    const goals = state.yearly[cat.id] || [];
    const { total, done, pct } = calcCatTabProgress('yearly', cat.id);
    const isOpen = expandedCats.yearly[cat.id];

    const card = document.createElement('div');
    card.className = 'cat-card';
    card.innerHTML = `
      <div class="cat-head" onclick="toggleCat('yearly','${cat.id}')">
        <div class="cat-top">
          <div class="cat-icon" style="background:${cat.bg}">${cat.icon}</div>
          <div class="cat-info">
            <div class="cat-name">${cat.label}</div>
            <div class="cat-count">${done} dari ${total} selesai</div>
          </div>
          <div class="cat-pct yearly">${pct}%</div>
          <div class="cat-chevron ${isOpen ? 'open' : ''}">▼</div>
        </div>
        <div class="pbar yearly">
          <div class="pbar-fill yearly" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="cat-body" style="display:${isOpen ? 'block' : 'none'}">
        ${goals.map(g => {
          if (g.type === 'once') {
            return `
            <div class="goal-row">
              <div class="chk ${g.done ? 'on yearly' : ''}"
                onclick="toggleYearlyOnce('${cat.id}',${g.id})"></div>
              <div class="goal-info">
                <div class="goal-txt ${g.done ? 'done' : ''}">${g.text}</div>
                <div class="goal-dl">${g.deadline || ''}</div>
              </div>
              <div class="goal-actions">
                <button class="icon-btn" onclick="deleteGoal('yearly','${cat.id}',${g.id})" title="Hapus">×</button>
              </div>
            </div>`;
          } else {
            const pct = g.target > 0 ? Math.min(100, Math.round(g.current / g.target * 100)) : 0;
            return `
            <div class="goal-row" style="flex-direction:column;align-items:stretch;gap:8px">
              <div style="display:flex;align-items:center;gap:12px">
                <div class="goal-info">
                  <div class="goal-txt">${g.text}</div>
                  <div class="goal-dl">${g.deadline || ''}</div>
                </div>
                <div class="goal-actions">
                  <button class="icon-btn" onclick="openProgressModal('${cat.id}',${g.id})" title="Update">✏️</button>
                  <button class="icon-btn" onclick="deleteGoal('yearly','${cat.id}',${g.id})" title="Hapus">×</button>
                </div>
              </div>
              <div class="yearly-progress">
                <div class="yearly-bar-wrap">
                  <div class="yearly-bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="yearly-numbers">
                  ${g.unit === 'Rp'
                    ? 'Rp ' + g.current.toLocaleString('id-ID') + ' / Rp ' + g.target.toLocaleString('id-ID')
                    : g.current + ' / ' + g.target + ' ' + g.unit
                  } (${pct}%)
                </div>
              </div>
            </div>`;
          }
        }).join('')}
        <button class="add-goal-btn" onclick="openModal('yearly','${cat.id}')">
          + Tambah goal
        </button>
      </div>`;
    listEl.appendChild(card);
  });
}


// ── TOGGLE KATEGORI ─────────────────────────────────────────────
function toggleCat(tab, catId) {
  expandedCats[tab][catId] = !expandedCats[tab][catId];
  render();
}


// ── CENTANG HABIT (daily/weekly) ────────────────────────────────
function toggleHabit(tab, catId, goalId) {
  let key;
  if (tab === 'weekly')       key = thisWeek();
  else if (tab === 'monthly') key = thisMonth();
  else                        key = today();
  const goal     = state[tab][catId].find(g => g.id === goalId);
  if (!goal) return;

  if (!goal.history) goal.history = [];

  if (goal.history.includes(key)) {
    goal.history = goal.history.filter(h => h !== key);
  } else {
    goal.history.push(key);
  }

  saveData();
  render();
}


// ── CENTANG YEARLY ONCE ─────────────────────────────────────────
function toggleYearlyOnce(catId, goalId) {
  const goal = state.yearly[catId].find(g => g.id === goalId);
  if (!goal) return;
  goal.done = !goal.done;
  saveData();
  render();
}


// ── HAPUS GOAL ──────────────────────────────────────────────────
function deleteGoal(tab, catId, goalId) {
  state[tab][catId] = state[tab][catId].filter(g => g.id !== goalId);
  saveData();
  render();
}


// ── MODAL TAMBAH GOAL ────────────────────────────────────────────
function openModal(tab, catId) {
  modalContext = { tab, catId, goalType: 'once' };

  const cat = CATS.find(c => c.id === catId);
  const tabLabel = { daily: 'Daily', weekly: 'Weekly', yearly: 'Yearly' }[tab];
  document.getElementById('modalTitle').textContent = `Tambah ${tabLabel} — ${cat.label}`;

  document.getElementById('modalGoalInput').value    = '';
  document.getElementById('modalDeadlineInput').value = '';
  document.getElementById('modalTargetInput').value   = '';
  document.getElementById('modalUnitInput').value     = '';

  // Yearly: tampilkan toggle tipe + deadline
  // Daily/Weekly: sembunyikan
  document.getElementById('modalDeadlineInput').style.display =
    tab === 'yearly' ? 'block' : 'none';
  document.getElementById('modalTypeToggle').style.display =
    tab === 'yearly' ? 'block' : 'none';
  document.getElementById('modalTargetWrap').style.display = 'none';

  // Reset toggle
  document.getElementById('typeBtnOnce').classList.add('active');
  document.getElementById('typeBtnNumber').classList.remove('active');

  document.getElementById('modalOverlay').classList.add('show');
  setTimeout(() => document.getElementById('modalGoalInput').focus(), 100);
}

function setGoalType(type) {
  modalContext.goalType = type;
  document.getElementById('typeBtnOnce').classList.toggle('active',   type === 'once');
  document.getElementById('typeBtnNumber').classList.toggle('active', type === 'number');
  document.getElementById('modalTargetWrap').style.display =
    type === 'number' ? 'block' : 'none';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

function saveGoal() {
  const text = document.getElementById('modalGoalInput').value.trim();
  if (!text) { document.getElementById('modalGoalInput').focus(); return; }

  const { tab, catId, goalType } = modalContext;
  const deadline = document.getElementById('modalDeadlineInput').value.trim();

  if (tab === 'daily' || tab === 'weekly') {
    state[tab][catId].push({ id: nextId++, text, streak: 0, history: [] });
  } else {
    if (goalType === 'once') {
      state[tab][catId].push({ id: nextId++, text, type: 'once', done: false, deadline });
    } else {
      const target = parseFloat(document.getElementById('modalTargetInput').value) || 0;
      const unit   = document.getElementById('modalUnitInput').value.trim() || '';
      state[tab][catId].push({ id: nextId++, text, type: 'number', target, current: 0, unit, deadline });
    }
  }

  saveData();
  closeModal();
  render();
}


// ── MODAL UPDATE PROGRESS YEARLY ─────────────────────────────────
function openProgressModal(catId, goalId) {
  progressContext = { catId, goalId };
  const goal = state.yearly[catId].find(g => g.id === goalId);
  if (!goal) return;

  document.getElementById('progressTitle').textContent = goal.text;
  document.getElementById('progressHint').textContent  =
    `Sekarang: ${goal.current.toLocaleString('id-ID')} ${goal.unit} dari target ${goal.target.toLocaleString('id-ID')} ${goal.unit}`;
  document.getElementById('progressInput').value = goal.current;

  document.getElementById('progressOverlay').classList.add('show');
  setTimeout(() => document.getElementById('progressInput').focus(), 100);
}

function closeProgressModal() {
  document.getElementById('progressOverlay').classList.remove('show');
}

function saveProgress() {
  const { catId, goalId } = progressContext;
  const goal = state.yearly[catId].find(g => g.id === goalId);
  if (!goal) return;

  const val = parseFloat(document.getElementById('progressInput').value);
  if (isNaN(val)) return;

  goal.current = val;
  saveData();
  closeProgressModal();
  render();
}


// ── MODAL KALENDER HISTORY ──────────────────────────────────────
function openCalendar(tab, catId, goalId) {
  calendarContext = { tab, catId, goalId };
  const goal = state[tab][catId].find(g => g.id === goalId);
  if (!goal) return;

  document.getElementById('calendarTitle').textContent = goal.text;

  const isWeekly = tab === 'weekly';
  const grid     = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  if (isWeekly) {
    renderWeeklyCalendar(goal.history || [], grid);
  } else {
    renderDailyCalendar(goal.history || [], grid);
  }

  document.getElementById('calendarOverlay').classList.add('show');
}

function renderDailyCalendar(history, container) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  // Tampilkan 3 bulan terakhir
  for (let m = month - 2; m <= month; m++) {
    const d = new Date(year, m, 1);
    const monthName = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const label = document.createElement('div');
    label.className = 'cal-month-label';
    label.textContent = monthName;
    container.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'cal-grid';

    // Header hari
    ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].forEach(h => {
      const el = document.createElement('div');
      el.className = 'cal-day-label';
      el.textContent = h;
      grid.appendChild(el);
    });

    const firstDay = new Date(year, m, 1).getDay();
    const offset   = (firstDay === 0 ? 6 : firstDay - 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      grid.appendChild(el);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = year + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const el = document.createElement('div');
      el.className = 'cal-day';
      el.textContent = day;

      if (dateStr === today()) el.classList.add('today');
      else if (history.includes(dateStr)) el.classList.add('done');

      grid.appendChild(el);
    }

    container.appendChild(grid);
  }
}

function renderWeeklyCalendar(history, container) {
  const label = document.createElement('div');
  label.className = 'cal-month-label';
  label.textContent = '12 Minggu Terakhir';
  container.appendChild(label);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px';

  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const key  = d.getFullYear() + '-W' + String(week).padStart(2, '0');
    const isCurrentWeek = key === thisWeek();

    const el = document.createElement('div');
    el.style.cssText = 'width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;';

    if (isCurrentWeek) {
      el.style.border = '1.5px solid var(--red)';
      el.style.color  = 'var(--red)';
    } else if (history.includes(key)) {
      el.style.background = 'var(--red)';
      el.style.color      = '#fff';
    } else {
      el.style.background = 'var(--bg)';
      el.style.color      = 'var(--text-muted)';
    }

    el.textContent = 'W' + week;
    grid.appendChild(el);
  }

  container.appendChild(grid);
}

function closeCalendar() {
  document.getElementById('calendarOverlay').classList.remove('show');
}


// ── TOAST ───────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}


// ── EVENT LISTENERS ─────────────────────────────────────────────
document.getElementById('modalSave').addEventListener('click', saveGoal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.getElementById('calendarOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeCalendar();
});
document.getElementById('progressOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeProgressModal();
});
document.getElementById('modalGoalInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') saveGoal();
});
document.getElementById('progressInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') saveProgress();
});


// ── JALANKAN ────────────────────────────────────────────────────
loadData();
render();