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
  ibadah:'var(--a-daily)',kesehatan:'var(--a-weekly)',
  karir:'var(--a-monthly)',keuangan:'var(--a-yearly)',
  personal:'var(--red-a)',sosial:'rgba(100,100,100,.1)',
};

const DEFAULT = {
  daily:{
    ibadah:   [{id:1,text:'Sholat 5 waktu',history:[]},{id:2,text:'Baca Al-Quran',history:[]}],
    kesehatan:[{id:3,text:'Olahraga 30 menit',history:[]},{id:4,text:'Minum 8 gelas air',history:[]}],
    karir:    [{id:5,text:'Belajar skill baru 30 menit',history:[]}],
    personal: [{id:6,text:'Baca buku 20 halaman',history:[]},{id:7,text:'Jurnal harian',history:[]}],
    keuangan: [],sosial:[],
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
    kesehatan:[{id:20,text:'Medical check-up tahunan',type:'once',done:false,deadline:'Apr '+YEAR}],
    karir:    [{id:21,text:'Dapet promosi',type:'once',done:false,deadline:'Des '+YEAR},{id:22,text:'Selesaikan online course',type:'once',done:false,deadline:'Jun '+YEAR}],
    keuangan: [{id:23,text:'Tabungan darurat',type:'number',target:50000000,current:10000000,unit:'Rp',deadline:'Des '+YEAR},{id:24,text:'Investasi reksa dana',type:'number',target:12,current:2,unit:'bulan',deadline:'Des '+YEAR}],
    personal: [{id:25,text:'Baca 12 buku',type:'number',target:12,current:2,unit:'buku',deadline:'Des '+YEAR},{id:26,text:'Liburan ke tempat baru',type:'once',done:false,deadline:'Agu '+YEAR}],
    sosial:   [],
  }
};

// STATE
let S = {};
let tab = 'dashboard';
let open = {dashboard:{},daily:{},weekly:{},monthly:{},yearly:{}};
let addCtx = {tab:null,cat:null,type:'once'};
let progCtx = {cat:null,id:null};
let isDark = false;
let nid = 500;
let toastT;

// HELPERS
const today    = () => new Date().toISOString().split('T')[0];
const thisWeek = () => { const d=new Date(),j=new Date(d.getFullYear(),0,1),w=Math.ceil(((d-j)/864e5+j.getDay()+1)/7); return d.getFullYear()+'-W'+String(w).padStart(2,'0'); };
const thisMonth= () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };
const periodKey= t => t==='weekly'?thisWeek():t==='monthly'?thisMonth():today();
const fmtDate  = s => new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const fmtWeek  = () => { const d=new Date(),s=new Date(d);s.setDate(d.getDate()-d.getDay()+1);const e=new Date(s);e.setDate(s.getDate()+6);const f=x=>x.toLocaleDateString('id-ID',{day:'numeric',month:'short'});return f(s)+' – '+f(e); };
const fmtMonth = () => new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'});

// STORAGE
function load(){
  try{ S=JSON.parse(localStorage.getItem('lp-v4')||'null')||JSON.parse(JSON.stringify(DEFAULT)); }
  catch(e){ S=JSON.parse(JSON.stringify(DEFAULT)); }
  // ensure all cats exist in monthly (fix for missing keys)
  ['daily','weekly','monthly','yearly'].forEach(t=>{ CATS.forEach(c=>{ if(!S[t][c.id]) S[t][c.id]=[]; }); });
  const dm=localStorage.getItem('lp-dark');
  if(dm!==null) applyDark(dm==='1',false);
  else if(window.matchMedia('(prefers-color-scheme:dark)').matches) applyDark(true,false);
}
function save(){ localStorage.setItem('lp-v4',JSON.stringify(S)); toast('Tersimpan ✓'); }
function applyDark(on,persist=true){
  isDark=on;
  document.body.classList.toggle('force-dark',on);
  document.body.classList.toggle('force-light',!on);
  const b=document.getElementById('darkBtn');
  if(b) b.textContent=on?'☀︎':'☽';
  if(persist) localStorage.setItem('lp-dark',on?'1':'0');
}
function toggleDark(){ applyDark(!isDark); }

// STREAK
function streak(history,t){
  if(!history||!history.length) return 0;
  const sorted=[...history].sort().reverse();
  let n=0,check=periodKey(t);
  for(let i=0;i<400;i++){
    if(!sorted.includes(check)) break;
    n++;
    if(t==='monthly'){
      const[y,m]=check.split('-').map(Number);
      check=m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0');
    } else if(t==='weekly'){
      const[y,w]=check.split('-W').map(Number);
      check=w===1?(y-1)+'-W52':y+'-W'+String(w-1).padStart(2,'0');
    } else {
      const d=new Date(check);d.setDate(d.getDate()-1);check=d.toISOString().split('T')[0];
    }
  }
  return n;
}
function bestStreak(){ let b=0;['daily','weekly','monthly'].forEach(t=>CATS.forEach(c=>(S[t][c.id]||[]).forEach(g=>{const s=streak(g.history,t);if(s>b)b=s;}))); return b; }
const isDone = (g,t) => g.history&&g.history.includes(periodKey(t));

// PROGRESS
function tabProg(t){
  let tot=0,don=0;
  CATS.forEach(c=>(S[t][c.id]||[]).forEach(g=>{
    tot++;
    if(t==='yearly'){ if(g.type==='once'&&g.done) don++; if(g.type==='number'&&g.current>=g.target) don++; }
    else if(isDone(g,t)) don++;
  }));
  return {tot,don,pct:tot?Math.round(don/tot*100):0};
}
function catProg(t,cid){
  const gs=S[t][cid]||[];
  if(!gs.length) return {tot:0,don:0,pct:0};
  let don=0;
  gs.forEach(g=>{ if(t==='yearly'){ if(g.type==='once'&&g.done) don++; if(g.type==='number'&&g.current>=g.target) don++; } else if(isDone(g,t)) don++; });
  return {tot:gs.length,don,pct:Math.round(don/gs.length*100)};
}

// SWITCH TAB
function switchTab(t){
  tab=t;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.id==='tab-'+t));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+t));
  render();
}

function render(){
  if(tab==='dashboard') rDash();
  else if(tab==='yearly') rYearly();
  else rHabit(tab);
}

// ICONS SVG
const iCheck='<polyline points="20 6 9 17 4 12"/>';
const iCal='<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>';
const iX='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
const iEdit='<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>';
const iPlus='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
const iChev='<polyline points="6 9 12 15 18 9"/>';
const svgAct=(paths,fn,title)=>`<button class="act-btn" onclick="${fn}" title="${title}"><svg viewBox="0 0 24 24">${paths}</svg></button>`;
const svgChev=(isOpen)=>`<div class="chevron${isOpen?' open':''}"><svg viewBox="0 0 24 24">${iChev}</svg></div>`;

// RENDER DASHBOARD
function rDash(){
  el('headerTitle').textContent='Life Planner';
  el('headerSub').textContent=YEAR;
  const ps=['daily','weekly','monthly','yearly'].map(t=>tabProg(t).pct);
  const ov=Math.round(ps.reduce((a,b)=>a+b,0)/ps.length);
  el('headerPct').textContent=ov+'%';
  el('overallBar').style.width=ov+'%';
  const y=tabProg('yearly');
  el('statDone').textContent=y.don;
  el('statStreak').textContent=bestStreak();
  el('statPct').textContent=ov+'%';

  // Summary
  const sum=el('dashSummary');
  sum.innerHTML='';
  const tabs=[
    {id:'daily',  label:'Daily Habits',   icon:'⏰',bg:'var(--a-daily)'},
    {id:'weekly', label:'Weekly Habits',  icon:'📅',bg:'var(--a-weekly)'},
    {id:'monthly',label:'Monthly Habits', icon:'📆',bg:'var(--a-monthly)'},
    {id:'yearly', label:'Yearly Goals',   icon:'🎯',bg:'var(--a-yearly)'},
  ];
  tabs.forEach(t=>{
    const p=tabProg(t.id);
    const row=document.createElement('div');
    row.className='sum-row';
    row.innerHTML=`
      <div class="sum-icon" style="background:${t.bg}">${t.icon}</div>
      <div class="sum-info">
        <div class="sum-name">${t.label}</div>
        <div class="sum-track">
          <div class="sum-bar-bg"><div class="sum-bar-fill" style="width:${p.pct}%;background:var(--c-${t.id==='yearly'?'yearly':t.id})"></div></div>
          <div class="sum-pct">${p.pct}%</div>
        </div>
      </div>
      <div class="sum-arrow">›</div>`;
    row.onclick=()=>switchTab(t.id);
    sum.appendChild(row);
  });

  // Cats
  const cl=el('dashCats');
  cl.innerHTML='';
  let hasAny=false;
  CATS.forEach(c=>{
    let tot=0,don=0;
    ['daily','weekly','monthly','yearly'].forEach(t=>{ const p=catProg(t,c.id);tot+=p.tot;don+=p.don; });
    if(!tot) return;
    hasAny=true;
    const pct=Math.round(don/tot*100);
    const d=document.createElement('div');
    d.className='cat-card';
    d.innerHTML=`<div class="cat-head" style="cursor:default">
      <div class="cat-top">
        <div class="cat-emoji" style="background:${CAT_BG[c.id]}">${c.icon}</div>
        <div class="cat-meta"><div class="cat-name">${c.label}</div><div class="cat-sub">${don} dari ${tot} selesai</div></div>
        <div class="cat-stat"><div class="cat-pct dash">${pct}%</div></div>
      </div>
      <div class="pbar dash"><div class="pbar-fill dash" style="width:${pct}%"></div></div>
    </div>`;
    cl.appendChild(d);
  });
  if(!hasAny) cl.innerHTML='<div style="padding:20px 16px;font-size:14px;color:var(--ink3)">Belum ada goals. Mulai dari tab Daily!</div>';
}

// RENDER HABIT TAB
function rHabit(t){
  const listEl=el(t+'CatList');
  const dateEl=el(t+'Date');
  const p=tabProg(t);
  const titles={daily:'Daily Habits',weekly:'Weekly Habits',monthly:'Monthly Habits'};
  const subs={daily:fmtDate(today()),weekly:fmtWeek(),monthly:fmtMonth()};
  const dateLabels={daily:'Hari ini — '+fmtDate(today()),weekly:'Minggu ini — '+fmtWeek(),monthly:'Bulan ini — '+fmtMonth()};
  const words={daily:'hari ini',weekly:'minggu ini',monthly:'bulan ini'};
  const sw={daily:'hari',weekly:'minggu',monthly:'bulan'};

  el('headerTitle').textContent=titles[t];
  el('headerSub').textContent=subs[t];
  el('headerPct').textContent=p.pct+'%';
  el('overallBar').style.width=p.pct+'%';
  if(dateEl) dateEl.textContent=dateLabels[t];

  listEl.innerHTML='';
  CATS.forEach(c=>{
    const goals=S[t][c.id]||[];
    const {tot,don,pct}=catProg(t,c.id);
    const isOpen=open[t][c.id];
    const div=document.createElement('div');
    div.className='cat-card';
    div.innerHTML=`
      <div class="cat-head" onclick="toggleCat('${t}','${c.id}')">
        <div class="cat-top">
          <div class="cat-emoji" style="background:${CAT_BG[c.id]}">${c.icon}</div>
          <div class="cat-meta">
            <div class="cat-name">${c.label}</div>
            <div class="cat-sub">${don} dari ${tot} selesai ${words[t]}</div>
          </div>
          <div class="cat-stat">
            <div class="cat-pct ${t}">${pct}%</div>
            ${svgChev(isOpen)}
          </div>
        </div>
        <div class="pbar ${t}"><div class="pbar-fill ${t}" style="width:${pct}%"></div></div>
      </div>
      <div class="cat-body" style="display:${isOpen?'block':'none'}">
        ${goals.map(g=>{
          const done=isDone(g,t);
          const s=streak(g.history,t);
          return `<div class="goal-row">
            <div class="check-wrap ${done?'on '+t:''}" onclick="toggleHabit('${t}','${c.id}',${g.id})">
              <svg viewBox="0 0 24 24">${iCheck}</svg>
            </div>
            <div class="goal-body">
              <div class="goal-text ${done?'done':''}">${g.text}</div>
              ${s>0?`<div class="streak">🔥 ${s} ${sw[t]}</div>`:''}
            </div>
            <div class="goal-acts">
              ${svgAct(iCal,`openCal('${t}','${c.id}',${g.id})`,'History')}
              ${svgAct(iX,`delGoal('${t}','${c.id}',${g.id})`,'Hapus')}
            </div>
          </div>`;
        }).join('')}
        <button class="add-btn" onclick="openAdd('${t}','${c.id}')">
          <svg viewBox="0 0 24 24">${iPlus}</svg> Tambah habit
        </button>
      </div>`;
    listEl.appendChild(div);
  });
}

// RENDER YEARLY
function rYearly(){
  const listEl=el('yearlyCatList');
  const p=tabProg('yearly');
  el('headerTitle').textContent='Yearly Goals';
  el('headerSub').textContent='Target '+YEAR;
  el('headerPct').textContent=p.pct+'%';
  el('overallBar').style.width=p.pct+'%';
  el('yearlyDate').textContent='Target Tahun '+YEAR;
  listEl.innerHTML='';
  CATS.forEach(c=>{
    const goals=S.yearly[c.id]||[];
    const {tot,don,pct}=catProg('yearly',c.id);
    const isOpen=open.yearly[c.id];
    const div=document.createElement('div');
    div.className='cat-card';
    div.innerHTML=`
      <div class="cat-head" onclick="toggleCat('yearly','${c.id}')">
        <div class="cat-top">
          <div class="cat-emoji" style="background:${CAT_BG[c.id]}">${c.icon}</div>
          <div class="cat-meta">
            <div class="cat-name">${c.label}</div>
            <div class="cat-sub">${don} dari ${tot} selesai</div>
          </div>
          <div class="cat-stat">
            <div class="cat-pct yearly">${pct}%</div>
            ${svgChev(isOpen)}
          </div>
        </div>
        <div class="pbar yearly"><div class="pbar-fill yearly" style="width:${pct}%"></div></div>
      </div>
      <div class="cat-body" style="display:${isOpen?'block':'none'}">
        ${goals.map(g=>{
          if(g.type==='once') return `<div class="goal-row">
            <div class="check-wrap ${g.done?'on yearly':''}" onclick="toggleOnce('${c.id}',${g.id})">
              <svg viewBox="0 0 24 24">${iCheck}</svg>
            </div>
            <div class="goal-body">
              <div class="goal-text ${g.done?'done':''}">${g.text}</div>
              ${g.deadline?`<div class="goal-dl">${g.deadline}</div>`:''}
            </div>
            <div class="goal-acts">${svgAct(iX,`delGoal('yearly','${c.id}',${g.id})`,'Hapus')}</div>
          </div>`;
          const pct2=g.target>0?Math.min(100,Math.round(g.current/g.target*100)):0;
          const numStr=g.unit==='Rp'?'Rp '+g.current.toLocaleString('id-ID')+' / Rp '+g.target.toLocaleString('id-ID'):g.current+' / '+g.target+' '+g.unit;
          return `<div class="y-goal">
            <div class="y-top">
              <div class="goal-body">
                <div class="goal-text">${g.text}</div>
                ${g.deadline?`<div class="goal-dl">${g.deadline}</div>`:''}
              </div>
              <div class="goal-acts">
                ${svgAct(iEdit,`openProg('${c.id}',${g.id})`,'Update')}
                ${svgAct(iX,`delGoal('yearly','${c.id}',${g.id})`,'Hapus')}
              </div>
            </div>
            <div class="y-bar-bg"><div class="y-bar-fill" style="width:${pct2}%"></div></div>
            <div class="y-nums">${numStr} · ${pct2}%</div>
          </div>`;
        }).join('')}
        <button class="add-btn" onclick="openAdd('yearly','${c.id}')">
          <svg viewBox="0 0 24 24">${iPlus}</svg> Tambah goal
        </button>
      </div>`;
    listEl.appendChild(div);
  });
}

// ACTIONS
function toggleCat(t,cid){ open[t][cid]=!open[t][cid]; render(); }

function toggleHabit(t,cid,id){
  const key=periodKey(t);
  const g=(S[t][cid]||[]).find(x=>x.id===id);
  if(!g) return;
  if(!g.history) g.history=[];
  if(g.history.includes(key)) g.history=g.history.filter(h=>h!==key);
  else g.history.push(key);
  save(); render();
}

function toggleOnce(cid,id){
  const g=(S.yearly[cid]||[]).find(x=>x.id===id);
  if(!g) return;
  g.done=!g.done; save(); render();
}

function delGoal(t,cid,id){
  S[t][cid]=(S[t][cid]||[]).filter(g=>g.id!==id);
  save(); render();
}

// ADD MODAL
function openAdd(t,cid){
  addCtx={tab:t,cat:cid,type:'once'};
  const c=CATS.find(x=>x.id===cid);
  const labels={daily:'Daily',weekly:'Weekly',monthly:'Monthly',yearly:'Yearly'};
  el('addTitle').textContent=`${labels[t]} — ${c.label}`;
  el('addText').value=''; el('addDeadline').value='';
  el('addTarget').value=''; el('addUnit').value='';
  el('addDeadline').style.display=t==='yearly'?'block':'none';
  el('typeToggleWrap').style.display=t==='yearly'?'block':'none';
  el('numberWrap').style.display='none';
  el('segOnce').classList.add('active'); el('segNumber').classList.remove('active');
  showOverlay('addOverlay');
  setTimeout(()=>el('addText').focus(),100);
}
function setType(type){
  addCtx.type=type;
  el('segOnce').classList.toggle('active',type==='once');
  el('segNumber').classList.toggle('active',type==='number');
  el('numberWrap').style.display=type==='number'?'block':'none';
}
function closeAdd(){ hideOverlay('addOverlay'); }
function saveAdd(){
  const text=el('addText').value.trim();
  if(!text){ el('addText').focus(); return; }
  const {tab:t,cat:cid,type}=addCtx;
  if(!S[t][cid]) S[t][cid]=[];
  if(t==='yearly'){
    const dl=el('addDeadline').value.trim();
    if(type==='once') S[t][cid].push({id:nid++,text,type:'once',done:false,deadline:dl});
    else { const tgt=parseFloat(el('addTarget').value)||0,unit=el('addUnit').value.trim()||''; S[t][cid].push({id:nid++,text,type:'number',target:tgt,current:0,unit,deadline:dl}); }
  } else {
    S[t][cid].push({id:nid++,text,history:[]});
  }
  save(); closeAdd(); render();
}

// PROGRESS MODAL
function openProg(cid,id){
  progCtx={cat:cid,id};
  const g=(S.yearly[cid]||[]).find(x=>x.id===id);
  if(!g) return;
  el('progTitle').textContent=g.text;
  el('progHint').textContent=`Sekarang: ${g.current.toLocaleString('id-ID')} ${g.unit} dari target ${g.target.toLocaleString('id-ID')} ${g.unit}`;
  el('progInput').value=g.current;
  showOverlay('progOverlay');
  setTimeout(()=>el('progInput').focus(),100);
}
function closeProg(){ hideOverlay('progOverlay'); }
function saveProg(){
  const g=(S.yearly[progCtx.cat]||[]).find(x=>x.id===progCtx.id);
  if(!g) return;
  const v=parseFloat(el('progInput').value);
  if(isNaN(v)) return;
  g.current=v; save(); closeProg(); render();
}

// CALENDAR
function openCal(t,cid,id){
  const g=(S[t][cid]||[]).find(x=>x.id===id);
  if(!g) return;
  el('calTitle').textContent=g.text;
  const body=el('calBody'); body.innerHTML='';
  if(t==='monthly') buildMonthChips(g.history||[],body);
  else if(t==='weekly') buildWeekChips(g.history||[],body);
  else buildDayCal(g.history||[],body);
  showOverlay('calOverlay');
}
function closeCal(){ hideOverlay('calOverlay'); }

function buildDayCal(hist,container){
  const now=new Date();
  for(let m=now.getMonth()-2;m<=now.getMonth();m++){
    const d=new Date(now.getFullYear(),m,1);
    const lbl=document.createElement('div'); lbl.className='cal-label';
    lbl.textContent=d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
    container.appendChild(lbl);
    const grid=document.createElement('div'); grid.className='cal-grid';
    ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].forEach(h=>{
      const e=document.createElement('div'); e.className='cal-dh'; e.textContent=h; grid.appendChild(e);
    });
    const first=new Date(now.getFullYear(),m,1).getDay();
    const offset=first===0?6:first-1;
    const days=new Date(now.getFullYear(),m+1,0).getDate();
    for(let i=0;i<offset;i++){const e=document.createElement('div');e.className='cal-d empty';grid.appendChild(e);}
    for(let day=1;day<=days;day++){
      const key=now.getFullYear()+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
      const e=document.createElement('div'); e.className='cal-d'; e.textContent=day;
      if(key===today()) e.classList.add('now');
      else if(hist.includes(key)) e.classList.add('hit');
      grid.appendChild(e);
    }
    container.appendChild(grid);
  }
}

function buildWeekChips(hist,container){
  const lbl=document.createElement('div'); lbl.className='cal-label'; lbl.textContent='12 Minggu Terakhir';
  container.appendChild(lbl);
  const wrap=document.createElement('div'); wrap.className='cal-chips';
  const now=new Date();
  for(let i=11;i>=0;i--){
    const d=new Date(now); d.setDate(now.getDate()-i*7);
    const j=new Date(d.getFullYear(),0,1);
    const w=Math.ceil(((d-j)/864e5+j.getDay()+1)/7);
    const key=d.getFullYear()+'-W'+String(w).padStart(2,'0');
    const e=document.createElement('div'); e.className='cal-chip';
    e.textContent='W'+w;
    if(key===thisWeek()) e.classList.add('now');
    else if(hist.includes(key)) e.classList.add('hit');
    wrap.appendChild(e);
  }
  container.appendChild(wrap);
}

function buildMonthChips(hist,container){
  const lbl=document.createElement('div'); lbl.className='cal-label'; lbl.textContent='12 Bulan Terakhir';
  container.appendChild(lbl);
  const wrap=document.createElement('div'); wrap.className='cal-chips';
  const now=new Date();
  for(let i=11;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const e=document.createElement('div'); e.className='cal-chip';
    e.textContent=d.toLocaleDateString('id-ID',{month:'short',year:'2-digit'});
    if(key===thisMonth()) e.classList.add('now');
    else if(hist.includes(key)) e.classList.add('hit');
    wrap.appendChild(e);
  }
  container.appendChild(wrap);
}

// OVERLAY
function showOverlay(id){ el(id).classList.add('show'); }
function hideOverlay(id){ el(id).classList.remove('show'); }

// TOAST
function toast(msg){
  const t=el('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2000);
}

// UTIL
function el(id){ return document.getElementById(id); }

// EVENTS
el('addOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closeAdd();});
el('progOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closeProg();});
el('calOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closeCal();});
el('addText').addEventListener('keydown',e=>{if(e.key==='Enter')saveAdd();});
el('progInput').addEventListener('keydown',e=>{if(e.key==='Enter')saveProg();});
document.getElementById('modalSave') && document.getElementById('modalSave').addEventListener('click',saveAdd);
document.getElementById('modalCancel') && document.getElementById('modalCancel').addEventListener('click',closeAdd);

// INIT
load(); render();