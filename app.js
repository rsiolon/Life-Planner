'use strict';

// ── CONSTANTS ──────────────────────────────────────────────────
const YEAR = new Date().getFullYear();

const CATS = [
  {id:'ibadah',   label:'Ibadah',    icon:'🕌'},
  {id:'kesehatan',label:'Kesehatan', icon:'💪'},
  {id:'karir',    label:'Karir',     icon:'💼'},
  {id:'keuangan', label:'Keuangan',  icon:'💰'},
  {id:'personal', label:'Personal',  icon:'✨'},
  {id:'sosial',   label:'Sosial',    icon:'🤝'},
];

const CAT_BG = {
  ibadah:'var(--a-daily)',
  kesehatan:'var(--a-weekly)',
  karir:'var(--a-monthly)',
  keuangan:'var(--a-yearly)',
  personal:'var(--red-a)',
  sosial:'rgba(120,120,120,.1)',
};

const TAB_LABELS = {daily:'Daily',weekly:'Weekly',monthly:'Monthly',yearly:'Yearly'};
const TAB_TITLES = {daily:'Daily Habits',weekly:'Weekly Habits',monthly:'Monthly Habits',yearly:'Yearly Goals'};
const TAB_PERIOD = {daily:'hari ini',weekly:'minggu ini',monthly:'bulan ini'};
const STREAK_WORD = {daily:'hari',weekly:'minggu',monthly:'bulan'};

const DEFAULT_DATA = {
  daily:{
    ibadah:   [{id:1,text:'Sholat 5 waktu',history:[]},{id:2,text:'Baca Al-Quran',history:[]}],
    kesehatan:[{id:3,text:'Olahraga 30 menit',history:[]},{id:4,text:'Minum 8 gelas air',history:[]}],
    karir:    [{id:5,text:'Belajar skill baru 30 menit',history:[]}],
    personal: [{id:6,text:'Baca buku 20 halaman',history:[]},{id:7,text:'Jurnal harian',history:[]}],
    keuangan: [],
    sosial:   [],
  },
  weekly:{
    ibadah:   [],
    kesehatan:[{id:10,text:'Timbang badan',history:[]}],
    karir:    [{id:11,text:'Review goals minggu ini',history:[]}],
    keuangan: [{id:12,text:'Catat pengeluaran',history:[]}],
    personal: [],
    sosial:   [{id:13,text:'Telpon keluarga',history:[]},{id:14,text:'Quality time teman',history:[]}],
  },
  monthly:{
    ibadah:   [],
    kesehatan:[{id:30,text:'Check progress kesehatan',history:[]}],
    karir:    [{id:31,text:'Review & set goals bulan depan',history:[]},{id:32,text:'Selesaikan 1 modul belajar',history:[]}],
    keuangan: [{id:33,text:'Nabung sesuai target',history:[]},{id:34,text:'Review pengeluaran bulanan',history:[]}],
    personal: [{id:35,text:'Me-time / liburan kecil',history:[]}],
    sosial:   [{id:36,text:'Gathering keluarga / teman',history:[]}],
  },
  yearly:{
    ibadah:   [],
    kesehatan:[{id:20,text:'Medical check-up',type:'once',done:false,deadline:'Apr '+YEAR}],
    karir:    [
      {id:21,text:'Dapet promosi',type:'once',done:false,deadline:'Des '+YEAR},
      {id:22,text:'Selesaikan online course',type:'once',done:false,deadline:'Jun '+YEAR},
    ],
    keuangan: [
      {id:23,text:'Tabungan darurat',type:'number',accum:true,monthlyTarget:1000,target:12000,unit:'€',logs:{},deadline:'Des '+YEAR},
      {id:24,text:'Investasi reksa dana',type:'number',accum:false,target:12,current:2,unit:'bulan',logs:{},deadline:'Des '+YEAR},
    ],
    personal: [
      {id:25,text:'Baca buku',type:'number',accum:true,monthlyTarget:1,target:12,unit:'buku',logs:{},deadline:'Des '+YEAR},
      {id:26,text:'Liburan ke tempat baru',type:'once',done:false,deadline:'Agu '+YEAR},
    ],
    sosial:   [],
  }
};

// ── STATE ───────────────────────────────────────────────────────
var S = {};
var currentTab = 'dashboard';
var openCats = {dashboard:{},daily:{},weekly:{},monthly:{},yearly:{}};
var addCtx = {tab:null,cat:null,type:'once',accum:false};
var logCtx = {cat:null,id:null};
var isDark = false;
var nextId = 500;
var toastTimer = null;

// ── DATE HELPERS ───────────────────────────────────────────────
function getToday() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}

function getThisWeek() {
  var d = new Date();
  var jan1 = new Date(d.getFullYear(), 0, 1);
  var w = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + pad(w);
}

function getThisMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}

function getPeriodKey(tab) {
  if (tab === 'weekly')  return getThisWeek();
  if (tab === 'monthly') return getThisMonth();
  return getToday();
}

function pad(n) { return String(n).padStart(2, '0'); }

function fmtDateStr(s) {
  var d = new Date(s + 'T12:00:00');
  return d.toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});
}

function fmtWeekRange() {
  var d = new Date();
  var s = new Date(d);
  s.setDate(d.getDate() - d.getDay() + 1);
  var e = new Date(s);
  e.setDate(s.getDate() + 6);
  var f = function(x) { return x.toLocaleDateString('id-ID', {day:'numeric',month:'short'}); };
  return f(s) + ' – ' + f(e);
}

function fmtMonthStr() {
  return new Date().toLocaleDateString('id-ID', {month:'long', year:'numeric'});
}

function monthKeyOf(y, m) {
  return y + '-' + pad(m);
}

// ── STORAGE ────────────────────────────────────────────────────
function loadData() {
  try {
    var saved = localStorage.getItem('lp-v5');
    S = saved ? JSON.parse(saved) : deepCopy(DEFAULT_DATA);
  } catch(e) {
    S = deepCopy(DEFAULT_DATA);
  }

  // Ensure all cat keys exist
  ['daily','weekly','monthly','yearly'].forEach(function(t) {
    if (!S[t]) S[t] = {};
    CATS.forEach(function(c) {
      if (!S[t][c.id]) S[t][c.id] = [];
    });
  });

  // Migrate: add logs field to yearly number goals
  CATS.forEach(function(c) {
    (S.yearly[c.id] || []).forEach(function(g) {
      if (g.type === 'number' && !g.logs) g.logs = {};
    });
  });

  // Dark mode
  var dm = localStorage.getItem('lp-dark');
  if (dm !== null) {
    applyDark(dm === '1', false);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches) {
    applyDark(true, false);
  }
}

function saveData() {
  try { localStorage.setItem('lp-v5', JSON.stringify(S)); } catch(e) {}
  showToast('Tersimpan ✓');
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ── DARK MODE ──────────────────────────────────────────────────
function applyDark(on, persist) {
  isDark = on;
  document.body.classList.toggle('force-dark', on);
  document.body.classList.toggle('force-light', !on);
  var btn = g('darkBtn');
  if (btn) btn.textContent = on ? '☀︎' : '☽';
  if (persist !== false) localStorage.setItem('lp-dark', on ? '1' : '0');
}

function toggleDark() { applyDark(!isDark); }

// ── YEARLY CURRENT VALUE ───────────────────────────────────────
function getCurrent(goal) {
  if (goal.type !== 'number') return 0;
  var logs = goal.logs || {};
  var keys = Object.keys(logs);
  if (keys.length > 0) {
    return keys.reduce(function(sum, k) { return sum + (logs[k] || 0); }, 0);
  }
  return goal.current || 0;
}

// ── STREAK CALC ────────────────────────────────────────────────
function calcStreak(history, tab) {
  if (!history || history.length === 0) return 0;
  var sorted = history.slice().sort().reverse();
  var check = getPeriodKey(tab);
  var n = 0;

  for (var i = 0; i < 400; i++) {
    if (sorted.indexOf(check) === -1) break;
    n++;
    if (tab === 'monthly') {
      var parts = check.split('-');
      var y = parseInt(parts[0]), m = parseInt(parts[1]);
      check = m === 1 ? (y-1) + '-12' : y + '-' + pad(m-1);
    } else if (tab === 'weekly') {
      var wp = check.split('-W');
      var wy = parseInt(wp[0]), wn = parseInt(wp[1]);
      check = wn === 1 ? (wy-1) + '-W52' : wy + '-W' + pad(wn-1);
    } else {
      var dt = new Date(check + 'T12:00:00');
      dt.setDate(dt.getDate() - 1);
      check = dt.getFullYear() + '-' + pad(dt.getMonth()+1) + '-' + pad(dt.getDate());
    }
  }
  return n;
}

function getBestStreak() {
  var best = 0;
  ['daily','weekly','monthly'].forEach(function(t) {
    CATS.forEach(function(c) {
      (S[t][c.id] || []).forEach(function(g) {
        var s = calcStreak(g.history, t);
        if (s > best) best = s;
      });
    });
  });
  return best;
}

// ── PROGRESS CALC ──────────────────────────────────────────────
function isDoneNow(goal, tab) {
  var key = getPeriodKey(tab);
  return goal.history && goal.history.indexOf(key) !== -1;
}

function calcTabProgress(tab) {
  var tot = 0, don = 0;
  CATS.forEach(function(c) {
    (S[tab][c.id] || []).forEach(function(g) {
      tot++;
      if (tab === 'yearly') {
        if (g.type === 'once' && g.done) don++;
        if (g.type === 'number' && getCurrent(g) >= g.target) don++;
      } else {
        if (isDoneNow(g, tab)) don++;
      }
    });
  });
  return {tot:tot, don:don, pct: tot ? Math.round(don/tot*100) : 0};
}

function calcCatProgress(tab, catId) {
  var goals = S[tab][catId] || [];
  if (!goals.length) return {tot:0, don:0, pct:0};
  var don = 0;
  goals.forEach(function(g) {
    if (tab === 'yearly') {
      if (g.type === 'once' && g.done) don++;
      if (g.type === 'number' && getCurrent(g) >= g.target) don++;
    } else {
      if (isDoneNow(g, tab)) don++;
    }
  });
  return {tot:goals.length, don:don, pct:Math.round(don/goals.length*100)};
}

// ── HEATMAP DATA ───────────────────────────────────────────────
function buildHeatmapData() {
  var map = {};
  CATS.forEach(function(c) {
    (S.daily[c.id] || []).forEach(function(g) {
      (g.history || []).forEach(function(d) {
        map[d] = (map[d] || 0) + 1;
      });
    });
  });
  return map;
}

// ── SWITCH TAB ─────────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(function(b) {
    b.classList.toggle('active', b.id === 'tab-' + tab);
  });
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.toggle('active', p.id === 'page-' + tab);
  });
  render();
}

function render() {
  try {
    if (currentTab === 'dashboard') renderDashboard();
    else if (currentTab === 'yearly') renderYearly();
    else renderHabitTab(currentTab);
  } catch(e) {
    console.error('Render error:', e);
  }
}

// ── SVG ICONS ──────────────────────────────────────────────────
var IC = {
  check: '<polyline points="20 6 9 17 4 12"/>',
  x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  edit:  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  chev:  '<polyline points="6 9 12 15 18 9"/>',
};

function mkActBtn(icon, onclick, title) {
  return '<button class="act-btn" onclick="' + onclick + '" title="' + title + '">'
    + '<svg viewBox="0 0 24 24">' + icon + '</svg></button>';
}

function mkChevron(isOpen) {
  return '<div class="chevron' + (isOpen ? ' open' : '') + '">'
    + '<svg viewBox="0 0 24 24">' + IC.chev + '</svg></div>';
}

// ── RENDER DASHBOARD ───────────────────────────────────────────
function renderDashboard() {
  g('headerTitle').textContent = 'Life Planner';
  g('headerSub').textContent = YEAR;

  var tabs = ['daily','weekly','monthly','yearly'];
  var pcts = tabs.map(function(t) { return calcTabProgress(t).pct; });
  var overall = Math.round(pcts.reduce(function(a,b){return a+b;}, 0) / pcts.length);

  g('headerPct').textContent = overall + '%';
  g('overallBar').style.width = overall + '%';

  var yp = calcTabProgress('yearly');
  g('statDone').textContent   = yp.don;
  g('statStreak').textContent = getBestStreak();
  g('statPct').textContent    = overall + '%';

  // Summary list
  var sum = g('dashSummary');
  sum.innerHTML = '';
  var summaryItems = [
    {id:'daily',   label:'Daily Habits',  icon:'⏰', color:'var(--c-daily)',   bg:'var(--a-daily)'},
    {id:'weekly',  label:'Weekly Habits', icon:'📅', color:'var(--c-weekly)',  bg:'var(--a-weekly)'},
    {id:'monthly', label:'Monthly Habits',icon:'📆', color:'var(--c-monthly)', bg:'var(--a-monthly)'},
    {id:'yearly',  label:'Yearly Goals',  icon:'🎯', color:'var(--c-yearly)',  bg:'var(--a-yearly)'},
  ];
  summaryItems.forEach(function(item) {
    var p = calcTabProgress(item.id);
    var row = document.createElement('div');
    row.className = 'sum-row';
    row.innerHTML =
      '<div class="sum-icon" style="background:' + item.bg + '">' + item.icon + '</div>' +
      '<div class="sum-info">' +
        '<div class="sum-name">' + item.label + '</div>' +
        '<div class="sum-track">' +
          '<div class="sum-bar-bg"><div class="sum-bar-fill" style="width:' + p.pct + '%;background:' + item.color + '"></div></div>' +
          '<div class="sum-pct">' + p.pct + '%</div>' +
        '</div>' +
      '</div>' +
      '<div class="sum-arrow">›</div>';
    row.onclick = (function(id) { return function() { switchTab(id); }; })(item.id);
    sum.appendChild(row);
  });

  // Heatmap
  renderHeatmap();

  // Cat overview
  var cl = g('dashCats');
  cl.innerHTML = '';
  var hasAny = false;
  CATS.forEach(function(c) {
    var tot = 0, don = 0;
    ['daily','weekly','monthly','yearly'].forEach(function(t) {
      var p = calcCatProgress(t, c.id);
      tot += p.tot; don += p.don;
    });
    if (!tot) return;
    hasAny = true;
    var pct = Math.round(don / tot * 100);
    var div = document.createElement('div');
    div.className = 'cat-card';
    div.innerHTML =
      '<div class="cat-head" style="cursor:default">' +
        '<div class="cat-top">' +
          '<div class="cat-emoji" style="background:' + CAT_BG[c.id] + '">' + c.icon + '</div>' +
          '<div class="cat-meta">' +
            '<div class="cat-name">' + c.label + '</div>' +
            '<div class="cat-sub">' + don + ' dari ' + tot + ' selesai</div>' +
          '</div>' +
          '<div class="cat-stat"><div class="cat-pct dash">' + pct + '%</div></div>' +
        '</div>' +
        '<div class="pbar dash"><div class="pbar-fill dash" style="width:' + pct + '%"></div></div>' +
      '</div>';
    cl.appendChild(div);
  });
  if (!hasAny) {
    cl.innerHTML = '<div style="padding:20px 16px;font-size:14px;color:var(--ink3)">Belum ada goals. Mulai dari tab Daily!</div>';
  }
}

// ── HEATMAP ────────────────────────────────────────────────────
function renderHeatmap() {
  var hmap = buildHeatmapData();
  var vals = Object.values(hmap);
  var maxVal = vals.length ? Math.max.apply(null, vals) : 1;
  if (maxVal === 0) maxVal = 1;

  var gridEl   = g('heatmapGrid');
  var monthsEl = g('heatmapMonths');
  gridEl.innerHTML   = '';
  monthsEl.innerHTML = '';

  var todayStr = getToday();
  var colors = ['var(--hm0)','var(--hm1)','var(--hm2)','var(--hm3)','var(--hm4)'];

  // Build weeks starting from Jan 1 of current year, aligned to Monday
  var jan1 = new Date(YEAR, 0, 1);
  var startDow = jan1.getDay(); // 0=Sun
  var offsetDays = startDow === 0 ? 6 : startDow - 1; // days before Jan 1 to fill week

  var startDate = new Date(YEAR, 0, 1);
  startDate.setDate(startDate.getDate() - offsetDays);

  var weeks = [];
  var monthPositions = []; // {weekIdx, monthName}
  var lastMonth = -1;
  var cur = new Date(startDate);

  for (var w = 0; w < 53; w++) {
    var week = [];
    for (var d = 0; d < 7; d++) {
      var y = cur.getFullYear();
      var m = cur.getMonth();
      var day = cur.getDate();
      var dateStr = y + '-' + pad(m+1) + '-' + pad(day);
      var inYear = y === YEAR;

      if (inYear && m !== lastMonth) {
        monthPositions.push({weekIdx: w, month: m});
        lastMonth = m;
      }

      week.push({
        date:   dateStr,
        count:  inYear ? (hmap[dateStr] || 0) : -1,
        isToday: dateStr === todayStr,
        inYear: inYear,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels row
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  monthPositions.forEach(function(mp, i) {
    var nextIdx = i + 1 < monthPositions.length ? monthPositions[i+1].weekIdx : weeks.length;
    var span = Math.max(1, nextIdx - mp.weekIdx);
    var cellW = 10, gap = 2;
    var width = span * cellW + (span - 1) * gap;
    var lbl = document.createElement('div');
    lbl.className = 'heatmap-month-lbl';
    lbl.style.width = width + 'px';
    lbl.style.flexShrink = '0';
    lbl.textContent = MONTH_NAMES[mp.month];
    monthsEl.appendChild(lbl);
    if (i < monthPositions.length - 1) {
      var gap2 = document.createElement('div');
      gap2.style.width = gap + 'px';
      gap2.style.flexShrink = '0';
      monthsEl.appendChild(gap2);
    }
  });

  // Grid cells — column by column (weeks), row by row (days)
  weeks.forEach(function(week) {
    week.forEach(function(cell) {
      var div = document.createElement('div');
      div.className = 'hm-cell';

      if (cell.inYear && cell.count >= 0) {
        var intensity = cell.count === 0 ? 0 : Math.min(4, Math.ceil(cell.count / maxVal * 4));
        div.style.background = colors[intensity];
        if (cell.isToday) div.style.outline = '1.5px solid var(--red)';
        div.title = cell.date + ' · ' + cell.count + ' habit';
        div.onclick = (function(date, count) {
          return function() { showDayDetail(date, count); };
        })(cell.date, cell.count);
      } else {
        div.style.background = 'transparent';
        div.style.cursor = 'default';
      }
      gridEl.appendChild(div);
    });
  });
}

// ── DAY DETAIL MODAL ───────────────────────────────────────────
function showDayDetail(dateStr, count) {
  var d = new Date(dateStr + 'T12:00:00');
  g('dayTitle').textContent = d.toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long'});

  var body = g('dayBody');
  body.innerHTML = '';

  var done = [];
  CATS.forEach(function(c) {
    (S.daily[c.id] || []).forEach(function(habit) {
      if ((habit.history || []).indexOf(dateStr) !== -1) {
        done.push({text: habit.text, cat: c.label, icon: c.icon});
      }
    });
  });

  if (!done.length) {
    body.innerHTML = '<p style="font-size:14px;color:var(--ink3);padding:8px 0">Tidak ada habit yang selesai hari ini.</p>';
  } else {
    done.forEach(function(h) {
      var row = document.createElement('div');
      row.className = 'day-habit-row';
      row.innerHTML =
        '<div class="day-dot" style="background:var(--red)"></div>' +
        '<span>' + h.icon + ' ' + h.text + '</span>' +
        '<span style="margin-left:auto;font-size:11px;color:var(--ink3)">' + h.cat + '</span>';
      body.appendChild(row);
    });
  }
  showOverlay('dayOverlay');
}
function closeDay() { hideOverlay('dayOverlay'); }

// ── RENDER HABIT TAB ───────────────────────────────────────────
function renderHabitTab(tab) {
  var listEl = g(tab + 'CatList');
  var dateEl = g(tab + 'Date');
  var p = calcTabProgress(tab);

  var subs = {
    daily:   fmtDateStr(getToday()),
    weekly:  fmtWeekRange(),
    monthly: fmtMonthStr(),
  };

  var dateLabels = {
    daily:   'Hari ini — ' + fmtDateStr(getToday()),
    weekly:  'Minggu ini — ' + fmtWeekRange(),
    monthly: 'Bulan ini — ' + fmtMonthStr(),
  };

  g('headerTitle').textContent = TAB_TITLES[tab];
  g('headerSub').textContent   = subs[tab];
  g('headerPct').textContent   = p.pct + '%';
  g('overallBar').style.width  = p.pct + '%';
  if (dateEl) dateEl.textContent = dateLabels[tab];

  if (!listEl) return;
  listEl.innerHTML = '';

  CATS.forEach(function(c) {
    var goals  = S[tab][c.id] || [];
    var cp     = calcCatProgress(tab, c.id);
    var isOpen = openCats[tab][c.id];

    var goalsHTML = goals.map(function(goal) {
      var done    = isDoneNow(goal, tab);
      var s       = calcStreak(goal.history, tab);
      var streakHTML = s > 0
        ? '<div class="streak">🔥 ' + s + ' ' + STREAK_WORD[tab] + '</div>'
        : '';
      return '<div class="goal-row">' +
        '<div class="check-wrap ' + (done ? 'on ' + tab : '') + '" onclick="toggleHabit(\'' + tab + '\',\'' + c.id + '\',' + goal.id + ')">' +
          '<svg viewBox="0 0 24 24">' + IC.check + '</svg>' +
        '</div>' +
        '<div class="goal-body">' +
          '<div class="goal-text ' + (done ? 'done' : '') + '">' + goal.text + '</div>' +
          streakHTML +
        '</div>' +
        '<div class="goal-acts">' + mkActBtn(IC.x, 'delGoal(\'' + tab + '\',\'' + c.id + '\',' + goal.id + ')', 'Hapus') + '</div>' +
      '</div>';
    }).join('');

    var div = document.createElement('div');
    div.className = 'cat-card';
    div.innerHTML =
      '<div class="cat-head" onclick="toggleCat(\'' + tab + '\',\'' + c.id + '\')">' +
        '<div class="cat-top">' +
          '<div class="cat-emoji" style="background:' + CAT_BG[c.id] + '">' + c.icon + '</div>' +
          '<div class="cat-meta">' +
            '<div class="cat-name">' + c.label + '</div>' +
            '<div class="cat-sub">' + cp.don + ' dari ' + cp.tot + ' selesai ' + TAB_PERIOD[tab] + '</div>' +
          '</div>' +
          '<div class="cat-stat">' +
            '<div class="cat-pct ' + tab + '">' + cp.pct + '%</div>' +
            mkChevron(isOpen) +
          '</div>' +
        '</div>' +
        '<div class="pbar ' + tab + '"><div class="pbar-fill ' + tab + '" style="width:' + cp.pct + '%"></div></div>' +
      '</div>' +
      '<div class="cat-body" style="display:' + (isOpen ? 'block' : 'none') + '">' +
        goalsHTML +
        '<button class="add-btn" onclick="openAdd(\'' + tab + '\',\'' + c.id + '\')">' +
          '<svg viewBox="0 0 24 24">' + IC.plus + '</svg> Tambah habit' +
        '</button>' +
      '</div>';
    listEl.appendChild(div);
  });

  // Calendar card below
  var calCard = g(tab + 'CalCard');
  if (calCard) renderMonthCalendar(tab, calCard);
}

// ── MONTH CALENDAR CARD ────────────────────────────────────────
function renderMonthCalendar(tab, container) {
  container.innerHTML = '';
  var now = new Date();

  if (tab === 'monthly') {
    // Year grid — 12 month chips
    var title = document.createElement('div');
    title.className = 'cal-grid-title';
    title.textContent = 'Tahun ' + YEAR;
    container.appendChild(title);

    var wrap = document.createElement('div');
    wrap.className = 'cal-chips';
    var MNAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    for (var m = 1; m <= 12; m++) {
      var key = monthKeyOf(YEAR, m);
      var done = CATS.some(function(c) {
        return (S.monthly[c.id] || []).some(function(habit) {
          return (habit.history || []).indexOf(key) !== -1;
        });
      });
      var chip = document.createElement('div');
      chip.className = 'cal-chip';
      chip.textContent = MNAMES[m-1];
      if (key === getThisMonth()) chip.classList.add('now');
      else if (done) chip.classList.add('hit');
      wrap.appendChild(chip);
    }
    container.appendChild(wrap);
    return;
  }

  // Daily / Weekly — current month grid
  var y = now.getFullYear(), mo = now.getMonth();
  var title2 = document.createElement('div');
  title2.className = 'cal-grid-title';
  title2.textContent = now.toLocaleDateString('id-ID', {month:'long',year:'numeric'});
  container.appendChild(title2);

  var grid = document.createElement('div');
  grid.className = 'cal-grid';
  ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].forEach(function(h) {
    var e = document.createElement('div'); e.className = 'cal-dh'; e.textContent = h; grid.appendChild(e);
  });

  var firstDow = new Date(y, mo, 1).getDay();
  var offset = firstDow === 0 ? 6 : firstDow - 1;
  var daysInMonth = new Date(y, mo + 1, 0).getDate();

  for (var i = 0; i < offset; i++) {
    var empty = document.createElement('div'); empty.className = 'cal-d empty'; grid.appendChild(empty);
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var dateKey = y + '-' + pad(mo+1) + '-' + pad(day);
    var periodKey2;
    if (tab === 'daily') {
      periodKey2 = dateKey;
    } else {
      var dt = new Date(y, mo, day);
      var j = new Date(dt.getFullYear(), 0, 1);
      var wk = Math.ceil(((dt - j) / 86400000 + j.getDay() + 1) / 7);
      periodKey2 = dt.getFullYear() + '-W' + pad(wk);
    }

    var totalH = 0, doneH = 0;
    CATS.forEach(function(c) {
      var goals = S[tab][c.id] || [];
      totalH += goals.length;
      doneH += goals.filter(function(habit) {
        return (habit.history || []).indexOf(periodKey2) !== -1;
      }).length;
    });

    var cell = document.createElement('div');
    cell.className = 'cal-d';
    cell.textContent = day;

    if (dateKey === getToday()) cell.classList.add('now');
    if (doneH > 0 && doneH >= totalH && totalH > 0) cell.classList.add('hit');
    else if (doneH > 0) cell.classList.add('part');

    if (tab === 'daily') {
      cell.onclick = (function(dk, dh) {
        return function() { showDayDetail(dk, dh); };
      })(dateKey, doneH);
    }
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}

// ── RENDER YEARLY ──────────────────────────────────────────────
function renderYearly() {
  var listEl = g('yearlyCatList');
  var p = calcTabProgress('yearly');

  g('headerTitle').textContent = 'Yearly Goals';
  g('headerSub').textContent   = 'Target ' + YEAR;
  g('headerPct').textContent   = p.pct + '%';
  g('overallBar').style.width  = p.pct + '%';
  g('yearlyDate').textContent  = 'Target Tahun ' + YEAR;

  if (!listEl) return;
  listEl.innerHTML = '';

  CATS.forEach(function(c) {
    var goals  = S.yearly[c.id] || [];
    var cp     = calcCatProgress('yearly', c.id);
    var isOpen = openCats.yearly[c.id];

    var goalsHTML = goals.map(function(goal) {
      if (goal.type === 'once') {
        return '<div class="goal-row">' +
          '<div class="check-wrap ' + (goal.done ? 'on yearly' : '') + '" onclick="toggleOnce(\'' + c.id + '\',' + goal.id + ')">' +
            '<svg viewBox="0 0 24 24">' + IC.check + '</svg>' +
          '</div>' +
          '<div class="goal-body">' +
            '<div class="goal-text ' + (goal.done ? 'done' : '') + '">' + goal.text + '</div>' +
            (goal.deadline ? '<div class="goal-dl">' + goal.deadline + '</div>' : '') +
          '</div>' +
          '<div class="goal-acts">' + mkActBtn(IC.x, 'delGoal(\'yearly\',\'' + c.id + '\',' + goal.id + ')', 'Hapus') + '</div>' +
        '</div>';
      }

      var cur  = getCurrent(goal);
      var pct2 = goal.target > 0 ? Math.min(100, Math.round(cur / goal.target * 100)) : 0;
      var numStr = (goal.unit === '€' || goal.unit === 'Rp')
        ? goal.unit + ' ' + cur.toLocaleString('id-ID') + ' / ' + goal.unit + ' ' + goal.target.toLocaleString('id-ID')
        : cur + ' / ' + goal.target + ' ' + goal.unit;
      var logCount = Object.keys(goal.logs || {}).length;
      var accumBadge = goal.accum
        ? '<div class="y-accum-badge">🔄 ' + goal.unit + ' ' + goal.monthlyTarget + '/bulan</div>'
        : '';

      return '<div class="y-goal">' +
        '<div class="y-top">' +
          '<div class="goal-body">' +
            '<div class="goal-text">' + goal.text + '</div>' +
            (goal.deadline ? '<div class="goal-dl">' + goal.deadline + '</div>' : '') +
            accumBadge +
          '</div>' +
          '<div class="goal-acts">' +
            mkActBtn(IC.edit, 'openLog(\'' + c.id + '\',' + goal.id + ')', 'Log') +
            mkActBtn(IC.x, 'delGoal(\'yearly\',\'' + c.id + '\',' + goal.id + ')', 'Hapus') +
          '</div>' +
        '</div>' +
        '<div class="y-bar-bg"><div class="y-bar-fill" style="width:' + pct2 + '%"></div></div>' +
        '<div class="y-nums">' + numStr + ' · ' + pct2 + '%' + (logCount > 0 ? ' · ' + logCount + ' log' : '') + '</div>' +
      '</div>';
    }).join('');

    var div = document.createElement('div');
    div.className = 'cat-card';
    div.innerHTML =
      '<div class="cat-head" onclick="toggleCat(\'yearly\',\'' + c.id + '\')">' +
        '<div class="cat-top">' +
          '<div class="cat-emoji" style="background:' + CAT_BG[c.id] + '">' + c.icon + '</div>' +
          '<div class="cat-meta">' +
            '<div class="cat-name">' + c.label + '</div>' +
            '<div class="cat-sub">' + cp.don + ' dari ' + cp.tot + ' selesai</div>' +
          '</div>' +
          '<div class="cat-stat">' +
            '<div class="cat-pct yearly">' + cp.pct + '%</div>' +
            mkChevron(isOpen) +
          '</div>' +
        '</div>' +
        '<div class="pbar yearly"><div class="pbar-fill yearly" style="width:' + cp.pct + '%"></div></div>' +
      '</div>' +
      '<div class="cat-body" style="display:' + (isOpen ? 'block' : 'none') + '">' +
        goalsHTML +
        '<button class="add-btn" onclick="openAdd(\'yearly\',\'' + c.id + '\')">' +
          '<svg viewBox="0 0 24 24">' + IC.plus + '</svg> Tambah goal' +
        '</button>' +
      '</div>';
    listEl.appendChild(div);
  });
}

// ── TOGGLE ACTIONS ─────────────────────────────────────────────
function toggleCat(tab, catId) {
  openCats[tab][catId] = !openCats[tab][catId];
  render();
}

function toggleHabit(tab, catId, id) {
  var key  = getPeriodKey(tab);
  var goal = (S[tab][catId] || []).filter(function(x) { return x.id === id; })[0];
  if (!goal) return;
  if (!goal.history) goal.history = [];
  var idx = goal.history.indexOf(key);
  if (idx !== -1) goal.history.splice(idx, 1);
  else goal.history.push(key);
  saveData(); render();
}

function toggleOnce(catId, id) {
  var goal = (S.yearly[catId] || []).filter(function(x) { return x.id === id; })[0];
  if (!goal) return;
  goal.done = !goal.done;
  saveData(); render();
}

function delGoal(tab, catId, id) {
  S[tab][catId] = (S[tab][catId] || []).filter(function(x) { return x.id !== id; });
  saveData(); render();
}

// ── ADD MODAL ──────────────────────────────────────────────────
function openAdd(tab, catId) {
  addCtx = {tab:tab, cat:catId, type:'once', accum:false};
  var c = CATS.filter(function(x) { return x.id === catId; })[0];
  g('addTitle').textContent = TAB_LABELS[tab] + ' — ' + c.label;
  g('addText').value = '';
  g('addDeadline').value = '';
  g('addTarget').value = '';
  g('addUnit').value = '';
  g('addMonthly').value = '';
  g('addDeadline').style.display    = tab === 'yearly' ? 'block' : 'none';
  g('typeToggleWrap').style.display = tab === 'yearly' ? 'block' : 'none';
  g('numberWrap').style.display     = 'none';
  g('accumToggle').style.display    = 'none';
  g('addMonthly').style.display     = 'none';
  g('segOnce').classList.add('active');
  g('segNumber').classList.remove('active');
  g('segManual').classList.add('active');
  g('segAccum').classList.remove('active');
  showOverlay('addOverlay');
  setTimeout(function() { g('addText').focus(); }, 100);
}

function setType(type) {
  addCtx.type = type;
  g('segOnce').classList.toggle('active',   type === 'once');
  g('segNumber').classList.toggle('active', type === 'number');
  g('numberWrap').style.display  = type === 'number' ? 'block' : 'none';
  g('accumToggle').style.display = type === 'number' ? 'block' : 'none';
}

function setAccum(on) {
  addCtx.accum = on;
  g('segManual').classList.toggle('active', !on);
  g('segAccum').classList.toggle('active',   on);
  g('addMonthly').style.display = on ? 'block' : 'none';
  g('addTarget').placeholder    = on ? 'Target total (misal: 12000)' : 'Target total';
}

function closeAdd() { hideOverlay('addOverlay'); }

function saveAdd() {
  var text = g('addText').value.trim();
  if (!text) { g('addText').focus(); return; }

  var tab = addCtx.tab, catId = addCtx.cat;
  if (!S[tab][catId]) S[tab][catId] = [];

  if (tab === 'yearly') {
    var dl  = g('addDeadline').value.trim();
    if (addCtx.type === 'once') {
      S[tab][catId].push({id:nextId++, text:text, type:'once', done:false, deadline:dl});
    } else {
      var tgt  = parseFloat(g('addTarget').value) || 0;
      var unit = g('addUnit').value.trim() || '';
      if (addCtx.accum) {
        var mTgt = parseFloat(g('addMonthly').value) || 0;
        S[tab][catId].push({id:nextId++, text:text, type:'number', accum:true, monthlyTarget:mTgt, target:tgt, unit:unit, logs:{}, deadline:dl});
      } else {
        S[tab][catId].push({id:nextId++, text:text, type:'number', accum:false, target:tgt, current:0, unit:unit, logs:{}, deadline:dl});
      }
    }
  } else {
    S[tab][catId].push({id:nextId++, text:text, history:[]});
  }

  saveData(); closeAdd(); render();
}

// ── LOG MODAL ──────────────────────────────────────────────────
function openLog(catId, id) {
  logCtx = {cat:catId, id:id};
  var goal = (S.yearly[catId] || []).filter(function(x) { return x.id === id; })[0];
  if (!goal) return;

  g('logTitle').textContent = goal.text;
  g('logHint').textContent = goal.accum
    ? 'Target/bulan: ' + goal.unit + ' ' + goal.monthlyTarget + '  ·  Total: ' + goal.unit + ' ' + getCurrent(goal).toLocaleString('id-ID')
    : 'Total: ' + getCurrent(goal).toLocaleString('id-ID') + ' ' + goal.unit + ' dari ' + goal.target.toLocaleString('id-ID') + ' ' + goal.unit;

  // Log history
  var histEl = g('logHistory');
  histEl.innerHTML = '';
  var logs = goal.logs || {};
  var keys = Object.keys(logs).sort().reverse().slice(0, 6);
  if (keys.length) {
    var wrap = document.createElement('div');
    wrap.className = 'y-log-history';
    keys.forEach(function(k) {
      var row = document.createElement('div');
      row.className = 'y-log-row';
      var d = new Date(k + '-01');
      row.innerHTML =
        '<span>' + d.toLocaleDateString('id-ID', {month:'long',year:'numeric'}) + '</span>' +
        '<span>' + goal.unit + ' ' + (logs[k] || 0).toLocaleString('id-ID') + '</span>';
      wrap.appendChild(row);
    });
    histEl.appendChild(wrap);
  }

  g('logMonth').value = getThisMonth();
  g('logVal').value   = '';
  showOverlay('logOverlay');
  setTimeout(function() { g('logVal').focus(); }, 100);
}

function closeLog() { hideOverlay('logOverlay'); }

function saveLog() {
  var goal = (S.yearly[logCtx.cat] || []).filter(function(x) { return x.id === logCtx.id; })[0];
  if (!goal) return;
  var month = g('logMonth').value;
  var val   = parseFloat(g('logVal').value);
  if (isNaN(val) || !month) return;
  if (!goal.logs) goal.logs = {};
  goal.logs[month] = val;
  if (!goal.accum) goal.current = getCurrent(goal);
  saveData(); closeLog(); render();
}

// ── CALENDAR HISTORY MODAL ─────────────────────────────────────
function openCal(tab, catId, id) {
  var goal = (S[tab][catId] || []).filter(function(x) { return x.id === id; })[0];
  if (!goal) return;
  g('calTitle').textContent = goal.text;
  var body = g('calBody');
  body.innerHTML = '';
  if (tab === 'weekly')  buildWeekChips(goal.history || [], body);
  else                   buildMonthChips(goal.history || [], body);
  showOverlay('calOverlay');
}
function closeCal() { hideOverlay('calOverlay'); }

function buildWeekChips(hist, container) {
  var lbl = document.createElement('div'); lbl.className = 'cal-grid-title'; lbl.textContent = '12 Minggu Terakhir';
  container.appendChild(lbl);
  var wrap = document.createElement('div'); wrap.className = 'cal-chips';
  var now = new Date();
  for (var i = 11; i >= 0; i--) {
    var d = new Date(now); d.setDate(now.getDate() - i*7);
    var j = new Date(d.getFullYear(), 0, 1);
    var wk = Math.ceil(((d-j)/86400000 + j.getDay() + 1) / 7);
    var key = d.getFullYear() + '-W' + pad(wk);
    var chip = document.createElement('div'); chip.className = 'cal-chip'; chip.textContent = 'W' + wk;
    if (key === getThisWeek()) chip.classList.add('now');
    else if (hist.indexOf(key) !== -1) chip.classList.add('hit');
    wrap.appendChild(chip);
  }
  container.appendChild(wrap);
}

function buildMonthChips(hist, container) {
  var lbl = document.createElement('div'); lbl.className = 'cal-grid-title'; lbl.textContent = '12 Bulan Terakhir';
  container.appendChild(lbl);
  var wrap = document.createElement('div'); wrap.className = 'cal-chips';
  var now = new Date();
  var MNAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  for (var i = 11; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    var key = d.getFullYear() + '-' + pad(d.getMonth()+1);
    var chip = document.createElement('div'); chip.className = 'cal-chip';
    chip.textContent = MNAMES[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
    if (key === getThisMonth()) chip.classList.add('now');
    else if (hist.indexOf(key) !== -1) chip.classList.add('hit');
    wrap.appendChild(chip);
  }
  container.appendChild(wrap);
}

// ── OVERLAY HELPERS ────────────────────────────────────────────
function showOverlay(id) { g(id).classList.add('show'); }
function hideOverlay(id) { g(id).classList.remove('show'); }

// ── TOAST ───────────────────────────────────────────────────────
function showToast(msg) {
  var t = g('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2000);
}

// ── UTIL ────────────────────────────────────────────────────────
function g(id) { return document.getElementById(id); }

// ── EVENT LISTENERS ────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  ['addOverlay','logOverlay','dayOverlay','calOverlay'].forEach(function(id) {
    g(id).addEventListener('click', function(e) {
      if (e.target === e.currentTarget) hideOverlay(id);
    });
  });

  g('addText').addEventListener('keydown', function(e) { if (e.key === 'Enter') saveAdd(); });
  g('logVal').addEventListener('keydown',  function(e) { if (e.key === 'Enter') saveLog(); });
});

// ── INIT ────────────────────────────────────────────────────────
loadData();
render();