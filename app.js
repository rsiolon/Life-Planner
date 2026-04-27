'use strict';

var YEAR = new Date().getFullYear();

var CATS = [
  {id:'ibadah',   label:'Ibadah',    icon:'🕌', bg:'rgba(53,64,163,.08)',  matIcon:'mosque'},
  {id:'kesehatan',label:'Kesehatan', icon:'💪', bg:'rgba(12,107,58,.08)',  matIcon:'fitness_center'},
  {id:'karir',    label:'Karir',     icon:'💼', bg:'rgba(12,61,139,.08)',  matIcon:'work'},
  {id:'keuangan', label:'Keuangan',  icon:'💰', bg:'rgba(76,29,149,.08)',  matIcon:'savings'},
  {id:'personal', label:'Personal',  icon:'✨', bg:'rgba(115,62,0,.08)',   matIcon:'auto_awesome'},
  {id:'sosial',   label:'Sosial',    icon:'🤝', bg:'rgba(53,64,163,.05)',  matIcon:'people'},
];

var CAT_ICONS_MAT = {ibadah:'mosque',kesehatan:'fitness_center',karir:'work',keuangan:'savings',personal:'auto_awesome',sosial:'people'};

var DEFAULT_DATA = {
  daily:{
    ibadah:   [{id:1,text:'Sholat 5 waktu',history:[]},{id:2,text:'Baca Al-Quran',history:[]}],
    kesehatan:[{id:3,text:'Olahraga 30 menit',history:[]},{id:4,text:'Minum 8 gelas air',history:[]}],
    karir:    [{id:5,text:'Belajar skill baru 30 menit',history:[]}],
    personal: [{id:6,text:'Baca buku 20 halaman',history:[]},{id:7,text:'Jurnal harian',history:[]}],
    keuangan: [],sosial:[],
  },
  weekly:{
    ibadah:[],
    kesehatan:[{id:10,text:'Timbang badan',history:[]}],
    karir:   [{id:11,text:'Review goals minggu ini',history:[]}],
    keuangan:[{id:12,text:'Catat pengeluaran',history:[]}],
    personal:[],
    sosial:  [{id:13,text:'Telpon keluarga',history:[]},{id:14,text:'Quality time teman',history:[]}],
  },
  monthly:{
    ibadah:[],
    kesehatan:[{id:30,text:'Check progress kesehatan',history:[]}],
    karir:   [{id:31,text:'Review & set goals bulan depan',history:[]},{id:32,text:'Selesaikan 1 modul belajar',history:[]}],
    keuangan:[{id:33,text:'Nabung sesuai target',history:[]},{id:34,text:'Review pengeluaran bulanan',history:[]}],
    personal:[{id:35,text:'Me-time / liburan kecil',history:[]}],
    sosial:  [{id:36,text:'Gathering keluarga / teman',history:[]}],
  },
  yearly:{
    ibadah:[],
    kesehatan:[{id:20,text:'Medical check-up',type:'once',done:false,deadline:'Apr '+YEAR,cat:'kesehatan'}],
    karir:   [{id:21,text:'Dapet promosi',type:'once',done:false,deadline:'Des '+YEAR,cat:'karir'},{id:22,text:'Selesaikan online course',type:'once',done:false,deadline:'Jun '+YEAR,cat:'karir'}],
    keuangan:[
      {id:23,text:'Tabungan darurat',type:'number',accum:true,monthlyTarget:1000,target:12000,unit:'€',logs:{},deadline:'Des '+YEAR,cat:'keuangan'},
      {id:24,text:'Investasi reksa dana',type:'number',accum:false,target:12,current:2,unit:'bulan',logs:{},deadline:'Des '+YEAR,cat:'keuangan'},
    ],
    personal:[
      {id:25,text:'Baca buku',type:'number',accum:true,monthlyTarget:1,target:12,unit:'buku',logs:{},deadline:'Des '+YEAR,cat:'personal'},
      {id:26,text:'Liburan ke tempat baru',type:'once',done:false,deadline:'Agu '+YEAR,cat:'personal'},
    ],
    sosial:[],
  }
};

// STATE
var S = {};
var currentTab = 'dashboard';
var currentHabitType = 'daily';
var openHabitCats = {daily:{},weekly:{},monthly:{}};
var calViewDate = new Date();
var calActiveCat = null;
var progressActiveCat = null;
var addCtx = {tab:null,cat:null,goalType:'once',accum:false};
var logCtx = {cat:null,id:null};
var isDark = false;
var nextId = 500;
var toastTimer = null;

// ── HELPERS ────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2,'0'); }
function getToday() { var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function getThisWeek() { var d=new Date(),j=new Date(d.getFullYear(),0,1),w=Math.ceil(((d-j)/864e5+j.getDay()+1)/7); return d.getFullYear()+'-W'+pad(w); }
function getThisMonth() { var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
function getPeriodKey(tab) { if(tab==='weekly') return getThisWeek(); if(tab==='monthly') return getThisMonth(); return getToday(); }
function fmtDate(s) { return new Date(s+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}); }
function fmtWeek() { var d=new Date(),s=new Date(d);s.setDate(d.getDate()-d.getDay()+1);var e=new Date(s);e.setDate(s.getDate()+6);var f=function(x){return x.toLocaleDateString('id-ID',{day:'numeric',month:'short'});};return f(s)+' – '+f(e); }
function fmtMonth() { return new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'}); }
function monthKey(y,m) { return y+'-'+pad(m); }
function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
function g(id) { return document.getElementById(id); }

// ── STORAGE ────────────────────────────────────────────────────
function loadData() {
  try { S = JSON.parse(localStorage.getItem('lp-v6')||'null') || deepCopy(DEFAULT_DATA); }
  catch(e) { S = deepCopy(DEFAULT_DATA); }
  ['daily','weekly','monthly','yearly'].forEach(function(t) {
    if(!S[t]) S[t]={};
    CATS.forEach(function(c) { if(!S[t][c.id]) S[t][c.id]=[]; });
  });
  CATS.forEach(function(c) {
    (S.yearly[c.id]||[]).forEach(function(goal) { if(goal.type==='number'&&!goal.logs) goal.logs={}; });
  });
  var dm = localStorage.getItem('lp-dark');
  if(dm!==null) applyDark(dm==='1',false);
  else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches) applyDark(true,false);
}
function saveData() {
  try { localStorage.setItem('lp-v6',JSON.stringify(S)); } catch(e){}
  showToast('Tersimpan ✓');
}

// ── DARK MODE ──────────────────────────────────────────────────
function applyDark(on,persist) {
  isDark=on;
  document.documentElement.classList.toggle('dark',on);
  var b=g('darkBtn');
  if(b) b.querySelector('.material-symbols-outlined').textContent = on?'light_mode':'dark_mode';
  if(persist!==false) localStorage.setItem('lp-dark',on?'1':'0');
}
function toggleDark() { applyDark(!isDark); }

// ── PROGRESS CALC ──────────────────────────────────────────────
function getCurrent(goal) {
  if(goal.type!=='number') return 0;
  var logs=goal.logs||{}, keys=Object.keys(logs);
  if(keys.length>0) return keys.reduce(function(s,k){return s+(logs[k]||0);},0);
  return goal.current||0;
}
function isDoneNow(goal,tab) {
  return goal.history && goal.history.indexOf(getPeriodKey(tab))!==-1;
}
function calcStreak(history,tab) {
  if(!history||!history.length) return 0;
  var sorted=history.slice().sort().reverse();
  var check=getPeriodKey(tab), n=0;
  for(var i=0;i<400;i++) {
    if(sorted.indexOf(check)===-1) break; n++;
    if(tab==='monthly'){var pts=check.split('-');var y=parseInt(pts[0]),m=parseInt(pts[1]);check=m===1?(y-1)+'-12':y+'-'+pad(m-1);}
    else if(tab==='weekly'){var wp=check.split('-W');var wy=parseInt(wp[0]),wn=parseInt(wp[1]);check=wn===1?(wy-1)+'-W52':wy+'-W'+pad(wn-1);}
    else{var dt=new Date(check+'T12:00:00');dt.setDate(dt.getDate()-1);check=dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());}
  }
  return n;
}
function getBestStreak() {
  var best=0;
  ['daily','weekly','monthly'].forEach(function(t){CATS.forEach(function(c){(S[t][c.id]||[]).forEach(function(g2){var s=calcStreak(g2.history,t);if(s>best)best=s;});});});
  return best;
}
function calcTabProg(tab) {
  var tot=0,don=0;
  CATS.forEach(function(c){(S[tab][c.id]||[]).forEach(function(goal){tot++;
    if(tab==='yearly'){if(goal.type==='once'&&goal.done)don++;if(goal.type==='number'&&getCurrent(goal)>=goal.target)don++;}
    else if(isDoneNow(goal,tab))don++;
  });});
  return {tot:tot,don:don,pct:tot?Math.round(don/tot*100):0};
}
function calcCatProg(tab,catId) {
  var goals=S[tab][catId]||[];
  if(!goals.length) return {tot:0,don:0,pct:0};
  var don=0;
  goals.forEach(function(goal){
    if(tab==='yearly'){if(goal.type==='once'&&goal.done)don++;if(goal.type==='number'&&getCurrent(goal)>=goal.target)don++;}
    else if(isDoneNow(goal,tab))don++;
  });
  return {tot:goals.length,don:don,pct:Math.round(don/goals.length*100)};
}
function buildHeatmapData() {
  var map={};
  CATS.forEach(function(c){(S.daily[c.id]||[]).forEach(function(goal){(goal.history||[]).forEach(function(d){map[d]=(map[d]||0)+1;});});});
  return map;
}

// ── SWITCH TAB ─────────────────────────────────────────────────
function switchTab(tab) {
  currentTab=tab;
  document.querySelectorAll('.nav-tab').forEach(function(b){b.classList.toggle('active',b.id==='navtab-'+tab);});
  document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id==='page-'+tab);});
  render();
}

function render() {
  try {
    if(currentTab==='dashboard') renderDashboard();
    else if(currentTab==='progress') renderProgress();
    else if(currentTab==='goals') renderGoals();
    else if(currentTab==='habits') renderHabits();
  } catch(e) { console.error('Render error:',e); }
}

// ── DASHBOARD ──────────────────────────────────────────────────
function renderDashboard() {
  var tabs=['daily','weekly','monthly','yearly'];
  var pcts=tabs.map(function(t){return calcTabProg(t).pct;});
  var overall=Math.round(pcts.reduce(function(a,b){return a+b;},0)/pcts.length);
  var dp=calcTabProg('daily');

  g('dashTitle').textContent=overall+'% Consistency';
  g('dashSub').textContent = dp.don>0
    ? dp.don+' dari '+dp.tot+' daily habits selesai hari ini.'
    : 'Mulai centang habits lo hari ini.';
  g('dashStreak').textContent=getBestStreak();
  g('dashOverall').textContent=overall+'%';

  // Bars
  var bars=g('dashBars'); bars.innerHTML='';
  var barItems=[{label:'Daily',tab:'daily'},{label:'Weekly',tab:'weekly'},{label:'Monthly',tab:'monthly'},{label:'Yearly',tab:'yearly'}];
  barItems.forEach(function(item){
    var p=calcTabProg(item.tab);
    var div=document.createElement('div'); div.className='bento-bar-item';
    div.innerHTML='<span class="bento-bar-lbl">'+item.label+'</span>'+
      '<div class="bento-bar-track"><div class="bento-bar-fill" style="width:'+p.pct+'%"></div></div>'+
      '<span class="bento-bar-pct">'+p.pct+'%</span>';
    bars.appendChild(div);
  });

  renderHeatmap();
}

// ── HEATMAP ────────────────────────────────────────────────────
function renderHeatmap() {
  var hmap=buildHeatmapData();
  var vals=Object.values(hmap);
  var maxVal=vals.length?Math.max.apply(null,vals):1;
  if(maxVal===0) maxVal=1;

  var gridEl=g('heatmapGrid'), monthsEl=g('heatmapMonths');
  gridEl.innerHTML=''; monthsEl.innerHTML='';

  var todayStr=getToday();
  var colors=['var(--hm0)','var(--hm1)','var(--hm2)','var(--hm3)','var(--hm4)'];
  var MNAMES=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  var jan1=new Date(YEAR,0,1);
  var startDow=jan1.getDay();
  var offsetDays=startDow===0?6:startDow-1;
  var cur=new Date(YEAR,0,1);
  cur.setDate(cur.getDate()-offsetDays);

  var weeks=[], monthPositions=[], lastMonth=-1;
  for(var w=0;w<53;w++) {
    var week=[];
    for(var d=0;d<7;d++) {
      var y=cur.getFullYear(),m=cur.getMonth(),day=cur.getDate();
      var dateStr=y+'-'+pad(m+1)+'-'+pad(day);
      var inYear=y===YEAR;
      if(inYear&&m!==lastMonth){monthPositions.push({weekIdx:w,month:m});lastMonth=m;}
      week.push({date:dateStr,count:inYear?(hmap[dateStr]||0):-1,isToday:dateStr===todayStr,inYear:inYear});
      cur.setDate(cur.getDate()+1);
    }
    weeks.push(week);
  }

  // Month labels
  monthPositions.forEach(function(mp,i) {
    var nextIdx=i+1<monthPositions.length?monthPositions[i+1].weekIdx:weeks.length;
    var span=Math.max(1,nextIdx-mp.weekIdx);
    var width=span*10+(span-1)*3;
    var lbl=document.createElement('div');
    lbl.className='hm-month-lbl';
    lbl.style.cssText='width:'+width+'px;flex-shrink:0;text-align:left;overflow:hidden;';
    lbl.textContent=MNAMES[mp.month];
    monthsEl.appendChild(lbl);
    if(i<monthPositions.length-1){var gap=document.createElement('div');gap.style.cssText='width:3px;flex-shrink:0';monthsEl.appendChild(gap);}
  });

  // Cells
  weeks.forEach(function(week) {
    week.forEach(function(cell) {
      var div=document.createElement('div'); div.className='hm-day';
      if(cell.inYear&&cell.count>=0) {
        var intensity=cell.count===0?0:Math.min(4,Math.ceil(cell.count/maxVal*4));
        div.style.background=colors[intensity];
        if(cell.isToday) div.style.outline='2px solid var(--primary)';
        div.title=cell.date+' · '+cell.count+' habit';
        div.onclick=(function(date,count){return function(){showDayDetail(date,count);};})(cell.date,cell.count);
      } else {
        div.style.background='transparent'; div.style.cursor='default';
      }
      gridEl.appendChild(div);
    });
  });
}

// ── DAY DETAIL ─────────────────────────────────────────────────
function showDayDetail(dateStr,count) {
  var d=new Date(dateStr+'T12:00:00');
  g('dayTitle').textContent=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
  var body=g('dayBody'); body.innerHTML='';
  var done=[];
  CATS.forEach(function(c){(S.daily[c.id]||[]).forEach(function(habit){if((habit.history||[]).indexOf(dateStr)!==-1)done.push({text:habit.text,cat:c.label});});});
  if(!done.length){body.innerHTML='<p style="font-size:14px;color:var(--on-surf-var);padding:12px 0">Tidak ada habit yang selesai hari ini.</p>';}
  else{done.forEach(function(h){var row=document.createElement('div');row.className='day-item';row.innerHTML='<div class="day-dot"></div><span>'+h.text+'</span><span class="day-cat-lbl">'+h.cat+'</span>';body.appendChild(row);});}
  showOverlay('dayOverlay');
}

// ── PROGRESS PAGE ──────────────────────────────────────────────
function renderProgress() {
  // Pills — categories
  var pillsEl=g('progressPills'); pillsEl.innerHTML='';
  var allPill=document.createElement('button'); allPill.className='progress-pill'+(progressActiveCat===null?' active':'');
  allPill.textContent='Semua'; allPill.onclick=function(){progressActiveCat=null;renderProgress();};
  pillsEl.appendChild(allPill);
  CATS.forEach(function(c){
    var pill=document.createElement('button'); pill.className='progress-pill'+(progressActiveCat===c.id?' active':'');
    pill.textContent=c.label; pill.onclick=(function(id){return function(){progressActiveCat=id;renderProgress();};})(c.id);
    pillsEl.appendChild(pill);
  });

  // Calendar
  renderProgressCalendar();

  // Stats
  var wp=calcTabProg('weekly'), mp=calcTabProg('monthly');
  g('weeklyPulse').textContent=wp.pct+'%';
  g('weeklyTarget').textContent=wp.don+'/'+wp.tot+' selesai';
  g('weeklyBar').style.width=wp.pct+'%';
  g('monthlyPulse').textContent=mp.pct+'%';
  g('monthlyTarget').textContent=mp.don+'/'+mp.tot+' selesai';
  g('monthlyBar').style.width=mp.pct+'%';
  g('progressStreak').textContent=getBestStreak();
}

function renderProgressCalendar() {
  var y=calViewDate.getFullYear(), m=calViewDate.getMonth();
  g('calMonthTitle').textContent=calViewDate.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  var grid=g('calGrid'); grid.innerHTML='';

  var days=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  days.forEach(function(d){var e=document.createElement('div');e.className='cal-dh';e.textContent=d;grid.appendChild(e);});

  var firstDow=new Date(y,m,1).getDay();
  var offset=firstDow===0?6:firstDow-1;
  var daysInMonth=new Date(y,m+1,0).getDate();

  for(var i=0;i<offset;i++){var emp=document.createElement('div');emp.className='cal-d empty';grid.appendChild(emp);}

  var todayStr=getToday();
  for(var day=1;day<=daysInMonth;day++){
    var dateStr=y+'-'+pad(m+1)+'-'+pad(day);
    var doneH=0, totalH=0;
    var filterCats=progressActiveCat?[CATS.filter(function(c){return c.id===progressActiveCat;})[0]]:CATS;
    filterCats.forEach(function(c){
      var goals=S.daily[c.id]||[];
      totalH+=goals.length;
      doneH+=goals.filter(function(goal){return(goal.history||[]).indexOf(dateStr)!==-1;}).length;
    });

    var cell=document.createElement('div'); cell.className='cal-d'; cell.textContent=day;
    if(dateStr===todayStr) cell.classList.add('today');
    if(totalH>0&&doneH>=totalH) cell.classList.add('done');
    else if(doneH>0) cell.classList.add('part');

    cell.onclick=(function(ds,dh){return function(){showDayDetail(ds,dh);};})(dateStr,doneH);
    grid.appendChild(cell);
  }
}

function calPrev() { calViewDate.setMonth(calViewDate.getMonth()-1); renderProgressCalendar(); }
function calNext() { calViewDate.setMonth(calViewDate.getMonth()+1); renderProgressCalendar(); }

// ── GOALS PAGE ─────────────────────────────────────────────────
function renderGoals() {
  g('blueprintYear').textContent=YEAR+' Blueprint';
  g('goalsMonthTitle').textContent=new Date().toLocaleDateString('id-ID',{month:'long'})+' Modules';

  var yp=calcTabProg('yearly');
  g('blueprintPct').textContent=yp.pct+'%';
  g('milestonesDone').textContent=yp.don;
  g('milestonesTotal').textContent='/ '+yp.tot+' Goals';

  // Ring
  var ring=g('blueprintRing');
  if(ring) ring.setAttribute('stroke-dasharray',yp.pct+','+(100-yp.pct));

  // Days active (count unique dates in daily history)
  var datesSet={};
  CATS.forEach(function(c){(S.daily[c.id]||[]).forEach(function(goal){(goal.history||[]).forEach(function(d){datesSet[d]=1;});});});
  g('daysActive').textContent=Object.keys(datesSet).length;

  // Goals list by category
  var listEl=g('goalsCatList'); listEl.innerHTML='';
  CATS.forEach(function(c){
    var goals=S.yearly[c.id]||[];
    if(!goals.length) return;
    goals.forEach(function(goal){
      var item=document.createElement('div'); item.className='goal-item';
      if(goal.type==='once'){
        item.innerHTML=
          '<div class="goal-item-top">'+
            '<div class="check-circle '+(goal.done?'done':'')+'" onclick="toggleOnce(\''+c.id+'\','+goal.id+')" style="margin-top:2px">'+
              '<span class="material-symbols-outlined">check</span>'+
            '</div>'+
            '<div class="goal-info">'+
              '<div class="goal-name '+(goal.done?'style="text-decoration:line-through;opacity:.5"':'')+'">'+(goal.done?'<span style="text-decoration:line-through;opacity:.5">'+goal.text+'</span>':goal.text)+'</div>'+
              (goal.deadline?'<div class="goal-meta">'+goal.deadline+'</div>':'')+
              '<div class="goal-meta">'+c.label+'</div>'+
            '</div>'+
            '<div class="goal-acts">'+
              '<button class="goal-act-btn" onclick="delGoal(\'yearly\',\''+c.id+'\','+goal.id+')" title="Hapus"><span class="material-symbols-outlined">close</span></button>'+
            '</div>'+
          '</div>';
      } else {
        var cur=getCurrent(goal);
        var pct2=goal.target>0?Math.min(100,Math.round(cur/goal.target*100)):0;
        var numStr=(goal.unit==='€'||goal.unit==='Rp')
          ?goal.unit+' '+cur.toLocaleString('id-ID')+' / '+goal.unit+' '+goal.target.toLocaleString('id-ID')
          :cur+' / '+goal.target+' '+goal.unit;
        item.innerHTML=
          '<div class="goal-item-top">'+
            '<div class="goal-icon-wrap"><span class="material-symbols-outlined">'+CAT_ICONS_MAT[c.id]+'</span></div>'+
            '<div class="goal-info">'+
              '<div class="goal-name">'+goal.text+'</div>'+
              (goal.deadline?'<div class="goal-meta">'+goal.deadline+'</div>':'')+
              (goal.accum?'<div class="accum-badge">🔄 '+goal.unit+' '+goal.monthlyTarget+'/bulan</div>':'')+
            '</div>'+
            '<div class="goal-acts">'+
              '<button class="goal-act-btn" onclick="openLog(\''+c.id+'\','+goal.id+')" title="Log"><span class="material-symbols-outlined">edit</span></button>'+
              '<button class="goal-act-btn" onclick="delGoal(\'yearly\',\''+c.id+'\','+goal.id+')" title="Hapus"><span class="material-symbols-outlined">close</span></button>'+
            '</div>'+
          '</div>'+
          '<div class="goal-progress">'+
            '<div class="goal-track"><div class="goal-fill" style="width:'+pct2+'%"></div></div>'+
            '<div class="goal-nums"><span>'+numStr+'</span><span>'+pct2+'%</span></div>'+
          '</div>';
      }
      listEl.appendChild(item);
    });
  });
}

// ── HABITS PAGE ────────────────────────────────────────────────
function setHabitType(type) {
  currentHabitType = type;
  ['daily','weekly','monthly'].forEach(function(t) {
    var p = g('pill-'+t); if (p) p.classList.toggle('active', t === type);
  });
  var eyebrows = {daily:'Daily Curation', weekly:'Weekly Rituals', monthly:'Monthly Modules'};
  var titles   = {daily:"Today's Rituals", weekly:"This Week's Focus", monthly:"This Month's Goals"};
  g('habitsEyebrow').textContent = eyebrows[type];
  g('habitsTitle').textContent   = titles[type];

  var cardEl = g('habitCatList');
  var gridEl = g('habitGridView');

  if (type === 'daily') {
    // Daily always shows grid
    if (cardEl) cardEl.style.display = 'none';
    if (gridEl) gridEl.style.display = 'block';
    renderGrid();
    renderMoodTracker();
  } else {
    // Weekly / Monthly show card view
    if (cardEl) cardEl.style.display = 'block';
    if (gridEl) gridEl.style.display = 'none';
    renderHabitList();
  }
}

function renderHabits() {
  setHabitType(currentHabitType);
}

function renderHabitList() {
  var tab=currentHabitType;
  var listEl=g('habitCatList'); if(!listEl) return;
  listEl.innerHTML='';

  CATS.forEach(function(c){
    var goals=S[tab][c.id]||[];
    var isOpen=openHabitCats[tab][c.id];
    var cp=calcCatProg(tab,c.id);

    var section=document.createElement('div'); section.className='habit-cat-section';

    var header=document.createElement('div'); header.className='habit-cat-header';
    header.onclick=(function(catId,t){return function(){openHabitCats[t][catId]=!openHabitCats[t][catId];renderHabitList();};})(c.id,tab);
    header.innerHTML=
      '<div class="habit-cat-icon" style="background:'+getCatBg(c.id)+'">'+c.icon+'</div>'+
      '<span class="habit-cat-name">'+c.label+'</span>'+
      '<span class="habit-cat-pct">'+cp.pct+'%</span>'+
      '<span class="material-symbols-outlined habit-cat-chevron'+(isOpen?' open':'')+'">expand_more</span>';
    section.appendChild(header);

    if(isOpen) {
      goals.forEach(function(goal){
        var done=isDoneNow(goal,tab);
        var s=calcStreak(goal.history,tab);
        var streakWord={daily:'hari',weekly:'minggu',monthly:'bulan'}[tab];
        var pct3=cp.tot>0?Math.round(cp.don/cp.tot*100):0;

        var card=document.createElement('div'); card.className='habit-card';
        card.innerHTML=
          '<div class="habit-card-top">'+
            '<div class="habit-icon-wrap" style="background:'+getCatBg(c.id)+'">'+
              '<span style="font-size:20px">'+c.icon+'</span>'+
            '</div>'+
            '<div class="habit-info">'+
              '<div class="habit-name" style="'+(done?'opacity:.5;text-decoration:line-through':'')+'">'+goal.text+'</div>'+
              (s>0?'<div class="habit-streak"><span class="streak-badge">🔥 '+s+' '+streakWord+'</span></div>':'')+
            '</div>'+
            '<div class="habit-check '+(done?'done ':'')+'" onclick="toggleHabit(\''+tab+'\',\''+c.id+'\','+goal.id+')">'+
              '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">check</span>'+
            '</div>'+
            '<button class="del-btn" onclick="delGoal(\''+tab+'\',\''+c.id+'\','+goal.id+')">'+
              '<span class="material-symbols-outlined">close</span>'+
            '</button>'+
          '</div>'+
          '<div class="habit-track"><div class="habit-fill" style="width:'+(done?100:0)+'%"></div></div>';
        section.appendChild(card);
      });

      var addBtn=document.createElement('button'); addBtn.className='add-habit-btn';
      addBtn.innerHTML='<span class="material-symbols-outlined">add</span> Tambah habit';
      addBtn.onclick=(function(catId,t){return function(){openAdd(t,catId);};})(c.id,tab); // preserves category context for weekly/monthly
      section.appendChild(addBtn);
    }

    listEl.appendChild(section);
  });
}

function getCatBg(catId) {
  var cat=CATS.filter(function(c){return c.id===catId;})[0];
  return cat?cat.bg:'rgba(53,64,163,.08)';
}

// ── TOGGLE ACTIONS ─────────────────────────────────────────────
function toggleHabit(tab,catId,id) {
  var key=getPeriodKey(tab);
  var goal=(S[tab][catId]||[]).filter(function(x){return x.id===id;})[0];
  if(!goal) return;
  if(!goal.history) goal.history=[];
  var idx=goal.history.indexOf(key);
  if(idx!==-1) goal.history.splice(idx,1); else goal.history.push(key);
  saveData();
  if (currentHabitType === 'daily') {
    renderGrid(); renderMoodTracker();
  } else {
    renderHabitList();
  }
  if (currentTab === 'dashboard') renderDashboard();
}
function toggleOnce(catId,id) {
  var goal=(S.yearly[catId]||[]).filter(function(x){return x.id===id;})[0];
  if(!goal) return; goal.done=!goal.done; saveData(); renderGoals();
}
function delGoal(tab,catId,id) {
  S[tab][catId]=(S[tab][catId]||[]).filter(function(x){return x.id!==id;});
  saveData(); render();
}

// ── ADD MODAL ──────────────────────────────────────────────────
function openAdd(tab,catId) {
  addCtx={tab:tab,cat:catId,goalType:'once',accum:false};
  var isYearly = tab === 'yearly';
  var labels = {daily:'Daily Habit', weekly:'Weekly Habit', monthly:'Monthly Habit', yearly:'Yearly Goal'};
  g('addSheetTitle').textContent = 'New ' + labels[tab];
  g('addText').value = '';
  g('addDeadline').value = '';
  g('addTarget').value = '';
  g('addUnit').value = '';
  g('addMonthly').value = '';
  g('addYearlyExtras').style.display = isYearly ? 'block' : 'none';
  g('addNumExtras').style.display = 'none';
  g('addAccumExtra').style.display = 'none';
  g('segOnce').classList.add('active'); g('segNum').classList.remove('active');
  g('segManual').classList.add('active'); g('segAccum').classList.remove('active');

  // Show category picker for ALL types
  g('addCatRow').style.display = 'block';
  var chips = g('addCatChips'); chips.innerHTML = '';
  // Default: use passed catId, or first cat
  var defaultCat = catId || CATS[0].id;
  addCtx.cat = defaultCat;
  CATS.forEach(function(c) {
    var chip = document.createElement('button');
    chip.className = 'cat-chip' + (c.id === defaultCat ? ' selected' : '');
    chip.textContent = c.icon + ' ' + c.label;
    chip.onclick = (function(cid, el) {
      return function() {
        addCtx.cat = cid;
        document.querySelectorAll('.cat-chip').forEach(function(ch) {
          ch.classList.toggle('selected', ch === el);
        });
      };
    })(c.id, chip);
    chips.appendChild(chip);
  });

  showOverlay('addOverlay');
  setTimeout(function(){g('addText').focus();},100);
}
function setGoalType(type) {
  addCtx.goalType=type;
  g('segOnce').classList.toggle('active',type==='once');
  g('segNum').classList.toggle('active',type==='number');
  g('addNumExtras').style.display=type==='number'?'block':'none';
}
function setAccumType(on) {
  addCtx.accum=on;
  g('segManual').classList.toggle('active',!on);
  g('segAccum').classList.toggle('active',on);
  g('addAccumExtra').style.display=on?'block':'none';
}
function closeAdd() { closeOverlay('addOverlay'); }
function saveAdd() {
  var text=g('addText').value.trim(); if(!text){g('addText').focus();return;}
  var tab=addCtx.tab, catId=addCtx.cat;
  if(!catId) catId=CATS[0].id;
  if(!S[tab][catId]) S[tab][catId]=[];
  if(tab==='yearly'){
    var dl=g('addDeadline').value.trim();
    if(addCtx.goalType==='once'){
      S[tab][catId].push({id:nextId++,text:text,type:'once',done:false,deadline:dl,cat:catId});
    } else {
      var tgt=parseFloat(g('addTarget').value)||0;
      var unit=g('addUnit').value.trim()||'';
      if(addCtx.accum){var mTgt=parseFloat(g('addMonthly').value)||0;S[tab][catId].push({id:nextId++,text:text,type:'number',accum:true,monthlyTarget:mTgt,target:tgt,unit:unit,logs:{},deadline:dl,cat:catId});}
      else{S[tab][catId].push({id:nextId++,text:text,type:'number',accum:false,target:tgt,current:0,unit:unit,logs:{},deadline:dl,cat:catId});}
    }
  } else { S[tab][catId].push({id:nextId++,text:text,history:[]}); }
  saveData(); closeAdd(); render();
}

// ── LOG MODAL ──────────────────────────────────────────────────
function openLog(catId,id) {
  logCtx={cat:catId,id:id};
  var goal=(S.yearly[catId]||[]).filter(function(x){return x.id===id;})[0];
  if(!goal) return;
  g('logTitle').textContent=goal.text;
  g('logHint').textContent=goal.accum
    ?'Target/bulan: '+goal.unit+' '+goal.monthlyTarget+' · Total: '+goal.unit+' '+getCurrent(goal).toLocaleString('id-ID')
    :'Total: '+getCurrent(goal).toLocaleString('id-ID')+' '+goal.unit+' dari '+goal.target.toLocaleString('id-ID')+' '+goal.unit;
  var histEl=g('logHistoryWrap'); histEl.innerHTML='';
  var logs=goal.logs||{}, keys=Object.keys(logs).sort().reverse().slice(0,5);
  if(keys.length){
    var wrap=document.createElement('div'); wrap.style.marginBottom='12px';
    keys.forEach(function(k){
      var row=document.createElement('div'); row.className='log-hist-row';
      var d=new Date(k+'-01');
      row.innerHTML='<span>'+d.toLocaleDateString('id-ID',{month:'long',year:'numeric'})+'</span>'+
        '<span style="font-weight:700;color:var(--primary)">'+goal.unit+' '+(logs[k]||0).toLocaleString('id-ID')+'</span>';
      wrap.appendChild(row);
    });
    histEl.appendChild(wrap);
  }
  g('logMonth').value=getThisMonth();
  g('logVal').value='';
  showOverlay('logOverlay');
  setTimeout(function(){g('logVal').focus();},100);
}
function closeLog() { closeOverlay('logOverlay'); }
function saveLog() {
  var goal=(S.yearly[logCtx.cat]||[]).filter(function(x){return x.id===logCtx.id;})[0];
  if(!goal) return;
  var month=g('logMonth').value, val=parseFloat(g('logVal').value);
  if(isNaN(val)||!month) return;
  if(!goal.logs) goal.logs={};
  goal.logs[month]=val;
  if(!goal.accum) goal.current=getCurrent(goal);
  saveData(); closeLog(); renderGoals();
}

// ── OVERLAY ────────────────────────────────────────────────────
function showOverlay(id) { g(id).classList.add('show'); }
function closeOverlay(id) { g(id).classList.remove('show'); }

// ── TOAST ───────────────────────────────────────────────────────
function showToast(msg) {
  var t=g('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(function(){t.classList.remove('show');},2000);
}


// ── GRID VIEW STATE ────────────────────────────────────────────
var dailyView = 'card'; // 'card' or 'grid'
var gridViewMonth = new Date(); // which month to show in grid

var MOOD_LABELS = ['Happy','Content','Upset','Anxious','Tired'];
// moodData: { 'YYYY-MM-DD': moodIndex (0-4) or null }

function getMoodData() {
  if (!S.moodData) S.moodData = {};
  return S.moodData;
}

function setDailyView(view) {
  dailyView = view;
  var cardBtn = g('btnCardView'), gridBtn = g('btnGridView');
  if (cardBtn) cardBtn.classList.toggle('active', view === 'card');
  if (gridBtn) gridBtn.classList.toggle('active', view === 'grid');
  var cardEl = g('habitCatList'), gridEl = g('habitGridView');
  if (cardEl) cardEl.style.display = view === 'card' ? 'block' : 'none';
  if (gridEl) gridEl.style.display = view === 'grid' ? 'block' : 'none';
  if (view === 'grid') {
    renderGrid();
    renderMoodTracker();
  }
}

// ── RENDER GRID ────────────────────────────────────────────────
function renderGrid() {
  var y = gridViewMonth.getFullYear();
  var m = gridViewMonth.getMonth();
  var daysInMonth = new Date(y, m+1, 0).getDate();
  var todayStr = getToday();

  var lbl = g('gridMonthLabel');
  if (lbl) lbl.textContent = gridViewMonth.toLocaleDateString('id-ID', {month:'long', year:'numeric'});

  var container = g('gridTable');
  if (!container) return;
  container.innerHTML = '';

  // Outer wrapper with two-column layout
  var wrap = document.createElement('div');
  wrap.className = 'grid-wrap';

  var layout = document.createElement('div');
  layout.className = 'grid-layout';

  // ── LEFT: sticky names column ──────────────────────────────
  var namesCol = document.createElement('div');
  namesCol.className = 'grid-names-col';

  // ── RIGHT: scrollable dates column ─────────────────────────
  var datesCol = document.createElement('div');
  datesCol.className = 'grid-dates-col';
  var datesInner = document.createElement('div');
  datesInner.className = 'grid-dates-inner';

  // ── HEADER ────────────────────────────────────────────────
  // Left header
  var namesHeader = document.createElement('div');
  namesHeader.className = 'grid-names-header';
  namesHeader.textContent = 'Habit';
  namesCol.appendChild(namesHeader);

  // Right header — day numbers
  var datesHeader = document.createElement('div');
  datesHeader.className = 'grid-dates-header';
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = y + '-' + pad(m+1) + '-' + pad(d);
    var dh = document.createElement('div');
    dh.className = 'grid-day-header' + (dateStr === todayStr ? ' today' : '');
    dh.textContent = d;
    datesHeader.appendChild(dh);
  }
  datesInner.appendChild(datesHeader);

  // ── ROWS PER CATEGORY ─────────────────────────────────────
  CATS.forEach(function(cat) {
    var goals = S.daily[cat.id] || [];
    if (!goals.length) return;

    // Category separator — left
    var catNameCell = document.createElement('div');
    catNameCell.className = 'grid-cat-name-cell';
    catNameCell.innerHTML = '<span>' + cat.icon + '</span>' + cat.label;
    namesCol.appendChild(catNameCell);

    // Category separator — right (empty filler row)
    var catDatesRow = document.createElement('div');
    catDatesRow.className = 'grid-cat-dates-row';
    for (var i = 0; i < daysInMonth; i++) {
      var fill = document.createElement('div');
      fill.className = 'grid-cat-date-fill';
      catDatesRow.appendChild(fill);
    }
    datesInner.appendChild(catDatesRow);

    // Habit rows
    goals.forEach(function(goal) {
      // Left: name cell
      var nameCell = document.createElement('div');
      nameCell.className = 'grid-name-cell';
      var nameSpan = document.createElement('span');
      nameSpan.textContent = goal.text;
      nameSpan.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      nameCell.appendChild(nameSpan);

      var delBtn = document.createElement('button');
      delBtn.className = 'grid-del-btn';
      delBtn.title = 'Hapus';
      delBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
      delBtn.onclick = (function(catId, id) {
        return function(e) {
          e.stopPropagation();
          delGoal('daily', catId, id);
          renderGrid();
        };
      })(cat.id, goal.id);
      nameCell.appendChild(delBtn);
      namesCol.appendChild(nameCell);

      // Right: date cells row
      var datesRow = document.createElement('div');
      datesRow.className = 'grid-dates-row';

      for (var d2 = 1; d2 <= daysInMonth; d2++) {
        var dateStr2 = y + '-' + pad(m+1) + '-' + pad(d2);
        var isFuture = dateStr2 > todayStr;
        var state = getGridCellState(goal, dateStr2);

        var cell = document.createElement('div');
        cell.className = 'grid-cell' + (isFuture ? ' future' : '') + (state ? ' ' + state : '');
        if (state === 'done') cell.innerHTML = '<span>✓</span>';
        else if (state === 'skip') cell.innerHTML = '<span>✗</span>';

        if (!isFuture) {
          cell.onclick = (function(gl, ds) {
            return function() { cycleGridCell(gl, ds); };
          })(goal, dateStr2);
        }
        datesRow.appendChild(cell);
      }
      datesInner.appendChild(datesRow);
    });
  });

  // ── ADD BUTTON ROW ────────────────────────────────────────
  var addNameCell = document.createElement('div');
  addNameCell.className = 'grid-add-name-cell';
  var addBtn2 = document.createElement('button');
  addBtn2.className = 'grid-add-btn';
  addBtn2.innerHTML = '<span class="material-symbols-outlined">add</span> Tambah';
  addBtn2.onclick = function() { openAdd('daily', null); };
  addNameCell.appendChild(addBtn2);
  namesCol.appendChild(addNameCell);

  var addDatesRow = document.createElement('div');
  addDatesRow.className = 'grid-add-dates-row';
  for (var i2 = 0; i2 < daysInMonth; i2++) {
    var af = document.createElement('div'); af.className = 'grid-add-date-fill';
    addDatesRow.appendChild(af);
  }
  datesInner.appendChild(addDatesRow);

  // ── ASSEMBLE ─────────────────────────────────────────────
  datesCol.appendChild(datesInner);
  layout.appendChild(namesCol);
  layout.appendChild(datesCol);
  wrap.appendChild(layout);
  container.appendChild(wrap);

  // Scroll to today
  var todayCol = Math.max(0, new Date().getDate() - 4);
  datesCol.scrollLeft = todayCol * 32;
}

function getGridCellState(goal, dateStr) {
  if (!goal.gridState) goal.gridState = {};
  return goal.gridState[dateStr] || null; // null, 'done', 'skip'
}

function cycleGridCell(goal, dateStr) {
  if (!goal.gridState) goal.gridState = {};
  var current = goal.gridState[dateStr] || null;
  // Cycle: null -> done -> skip -> null
  if (current === null) {
    goal.gridState[dateStr] = 'done';
    // Also mark in history for compatibility
    if (!goal.history) goal.history = [];
    if (goal.history.indexOf(dateStr) === -1) goal.history.push(dateStr);
  } else if (current === 'done') {
    goal.gridState[dateStr] = 'skip';
    // Remove from history
    if (goal.history) {
      var idx = goal.history.indexOf(dateStr);
      if (idx !== -1) goal.history.splice(idx, 1);
    }
  } else {
    delete goal.gridState[dateStr];
  }
  saveData();
  renderGrid();
}

// ── MOOD TRACKER ───────────────────────────────────────────────
function renderMoodTracker() {
  var y = gridViewMonth.getFullYear();
  var m = gridViewMonth.getMonth();
  var daysInMonth = new Date(y, m+1, 0).getDate();
  var todayStr = getToday();
  var mood = getMoodData();

  var moodLbl = g('moodMonthLabel');
  if (moodLbl) moodLbl.textContent = gridViewMonth.toLocaleDateString('id-ID', {month:'long', year:'numeric'});

  var moodGrid = g('moodGrid');
  if (!moodGrid) return;
  moodGrid.innerHTML = '';
  moodGrid.style.gridTemplateColumns = 'repeat(' + daysInMonth + ', 32px)';

  // Build grid: columns = days, rows = mood levels (0=Happy top, 4=Tired bottom)
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = y + '-' + pad(m+1) + '-' + pad(d);
    var isFuture = dateStr > todayStr;
    var selectedMood = mood[dateStr] !== undefined ? mood[dateStr] : null;
    var isToday = dateStr === todayStr;

    for (var level = 0; level < 5; level++) {
      var cell = document.createElement('div');
      cell.className = 'mood-cell' +
        (selectedMood === level ? ' selected' : '') +
        (isToday && selectedMood === null ? ' today-col' : '');

      if (!isFuture) {
        cell.onclick = (function(ds, lvl) {
          return function() { setMood(ds, lvl); };
        })(dateStr, level);
      } else {
        cell.style.opacity = '0.2';
        cell.style.cursor = 'default';
      }
      moodGrid.appendChild(cell);
    }
  }

  // Draw line chart
  drawMoodLine(y, m, daysInMonth, mood, todayStr);
}

function setMood(dateStr, level) {
  var mood = getMoodData();
  // Toggle: click same = deselect
  if (mood[dateStr] === level) delete mood[dateStr];
  else mood[dateStr] = level;
  saveData();
  renderMoodTracker();
}

function drawMoodLine(y, m, daysInMonth, mood, todayStr) {
  var svg = g('moodLineSvg');
  if (!svg) return;
  svg.innerHTML = '';

  var points = [];
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = y + '-' + pad(m+1) + '-' + pad(d);
    if (mood[dateStr] !== undefined && dateStr <= todayStr) {
      var x = ((d - 0.5) / daysInMonth) * 310;
      // Invert: Happy(0) at top (y=10), Tired(4) at bottom (y=90)
      var y2 = 10 + (mood[dateStr] / 4) * 80;
      points.push({x:x, y:y2, d:d});
    }
  }

  if (points.length < 2) {
    // Just dots
    points.forEach(function(p) {
      var circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', 'var(--primary)');
      svg.appendChild(circle);
    });
    return;
  }

  // Smooth polyline
  var pathD = 'M ' + points[0].x + ' ' + points[0].y;
  for (var i = 1; i < points.length; i++) {
    var prev = points[i-1], curr = points[i];
    var cpx = (prev.x + curr.x) / 2;
    pathD += ' C ' + cpx + ' ' + prev.y + ' ' + cpx + ' ' + curr.y + ' ' + curr.x + ' ' + curr.y;
  }

  var path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d', pathD);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'var(--primary)');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  // Dots on data points
  points.forEach(function(p) {
    var dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx', p.x);
    dot.setAttribute('cy', p.y);
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', 'var(--primary)');
    dot.setAttribute('stroke', 'var(--surface-lowest)');
    dot.setAttribute('stroke-width', '1.5');
    svg.appendChild(dot);
  });
}

// ── EVENTS ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  ['addOverlay','logOverlay','dayOverlay'].forEach(function(id){
    g(id).addEventListener('click',function(e){if(e.target===e.currentTarget) closeOverlay(id);});
  });
  g('addText').addEventListener('keydown',function(e){if(e.key==='Enter') saveAdd();});
  g('logVal').addEventListener('keydown',function(e){if(e.key==='Enter') saveLog();});
});

// ── INIT ────────────────────────────────────────────────────────
loadData();
render();

function toggleSidebar() { /* reserved for future sidebar */ }