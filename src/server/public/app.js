// Dashboard front-end. Talks to the JSON API in src/server/server.js.
let STATE = null;
let LANG = 'he';

const I18N = {
  he: { new:'פוסט ליבה חדש', lang:'שפה', hook1:'הוק ראשי', hook2:'הוק משני', body:'גוף הפוסט',
        create:'צור + שכפל', posts:'פוסטי ליבה', pipelineH:'פייפליין לפי סטטוס', calH:'לוח פרסום',
        render:'רנדר', next:'קדם', sched:'תזמן', auto:'תזמון אוטומטי', view:'צפה', repurpose:'שכפל מחדש',
        hint:'כתבי פוסט ליבה אחד — המערכת תייצר ממנו 5 פורמטים אוטומטית.' },
  en: { new:'New core post', lang:'Language', hook1:'Main hook', hook2:'Sub hook', body:'Body',
        create:'Create + repurpose', posts:'Core posts', pipelineH:'Pipeline by status', calH:'Publishing calendar',
        render:'Render', next:'Advance', sched:'Schedule', auto:'Auto-schedule', view:'View', repurpose:'Re-repurpose',
        hint:'Write one core post — the system fans it out into 5 formats automatically.' },
};

function t(k){ return (I18N[LANG]||I18N.he)[k] || k; }
function lbl(map, key){ const m = STATE?.meta?.[map]?.[key]; return m ? (m[LANG]||m.he||key) : key; }

async function api(path, method='GET', body){
  const r = await fetch(path, { method, headers:{'content-type':'application/json'}, body: body?JSON.stringify(body):undefined });
  if(!r.ok){ const e = await r.json().catch(()=>({})); alert(e.error||('HTTP '+r.status)); throw new Error(e.error); }
  return r.json();
}

async function load(){ STATE = await api('/api/state'); render(); }

function applyI18n(){
  document.documentElement.lang = LANG; document.documentElement.dir = LANG==='he'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el=> el.textContent = t(el.dataset.i18n));
  document.getElementById('hint').textContent = t('hint');
}

function render(){
  applyI18n();
  const posts = STATE.posts, formats = STATE.formats;
  document.getElementById('stats').textContent =
    `${posts.length} core · ${formats.length} formats · ${formats.filter(f=>f.status==='scheduled').length} scheduled`;
  const ig = STATE.meta.integrations;
  document.getElementById('integ').innerHTML = Object.entries(ig)
    .map(([k,v])=>`<span class="${v?'on':'off'}">${v?'●':'○'} ${k}</span>`).join('');

  // Core post list
  document.getElementById('postList').innerHTML = posts.map(p=>`
    <div class="card">
      <div class="t">${esc(p.hook1)||'(no hook)'} <span class="tag">${p.lang}</span></div>
      <div class="meta"><span>${p.id}</span><span>${p.formats.length} formats</span></div>
      <div class="row">
        <button class="btn ghost sm" onclick="repurpose('${p.id}')">${t('repurpose')}</button>
        <button class="btn ghost sm" onclick="autoSched('${p.id}')">${t('auto')}</button>
      </div>
    </div>`).join('') || `<p class="muted">—</p>`;

  // Pipeline columns by status
  const statuses = STATE.meta.STATUSES;
  document.getElementById('pipeline').innerHTML = statuses.map(s=>{
    const items = formats.filter(f=>f.status===s);
    return `<div class="col"><h3><span>${lbl('STATUS_LABELS',s)}</span><span>${items.length}</span></h3>
      ${items.map(card).join('')}</div>`;
  }).join('');

  renderCalendar(formats);
}

function card(f){
  const canRender = f.status==='to_edit'||f.status==='editing';
  const nextMap = { to_edit:'editing', editing:'review', review:'approved', approved:'scheduled', scheduled:'published' };
  const nxt = nextMap[f.status];
  return `<div class="card">
    <div class="t">${esc(f.coreHook)||f.coreId}</div>
    <div class="meta"><span class="tag">${lbl('FORMAT_LABELS',f.type)}</span><span>${f.lang}</span></div>
    ${f.scheduleDate?`<div class="meta"><span>📅 ${f.scheduleDate}</span></div>`:''}
    <div class="row">
      ${canRender?`<button class="btn sm" onclick="doRender('${f.id}')">${t('render')}</button>`:''}
      ${f.render?`<a class="view" target="_blank" href="/${f.render}">${t('view')} ↗</a>`:''}
      ${nxt?`<button class="btn ghost sm" onclick="adv('${f.id}','${nxt}')">${t('next')} → ${lbl('STATUS_LABELS',nxt)}</button>`:''}
      <button class="btn ghost sm" onclick="setDate('${f.id}')">${t('sched')}</button>
    </div>
  </div>`;
}

function renderCalendar(formats){
  const dated = formats.filter(f=>f.scheduleDate);
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today); start.setDate(start.getDate()-start.getDay()); // week start (Sun)
  const days = [];
  for(let i=0;i<28;i++){ const d=new Date(start); d.setDate(d.getDate()+i); days.push(d); }
  document.getElementById('cal').innerHTML = days.map(d=>{
    const iso = d.toISOString().slice(0,10);
    const pips = dated.filter(f=>f.scheduleDate===iso);
    return `<div class="day"><div class="dn">${d.getDate()}/${d.getMonth()+1}</div>
      ${pips.map(f=>`<div class="pip" title="${esc(f.coreHook)}">${lbl('FORMAT_LABELS',f.type)}</div>`).join('')}</div>`;
  }).join('');
}

// --- actions ---
async function create(){
  const body = {
    lang: val('f-lang'), hook1: val('f-hook1'), hook2: val('f-hook2'),
    body: val('f-body'), cta: val('f-cta'),
  };
  if(!body.hook1){ alert(t('hook1')); return; }
  const post = await api('/api/posts','POST',body);
  await api(`/api/posts/${encodeURIComponent(post.id)}/repurpose`,'POST',{});
  ['f-hook1','f-hook2','f-body','f-cta'].forEach(id=>document.getElementById(id).value='');
  load();
}
async function repurpose(id){ await api(`/api/posts/${encodeURIComponent(id)}/repurpose`,'POST',{}); load(); }
async function autoSched(id){ await api(`/api/posts/${encodeURIComponent(id)}/autoschedule`,'POST',{}); load(); }
async function doRender(id){ await api(`/api/formats/${encodeURIComponent(id)}/render`,'POST',{}); load(); }
async function adv(id,status){ await api(`/api/formats/${encodeURIComponent(id)}/status`,'POST',{status}); load(); }
async function setDate(id){
  const d = prompt('YYYY-MM-DD', new Date().toISOString().slice(0,10));
  if(d) { await api(`/api/formats/${encodeURIComponent(id)}/schedule`,'POST',{date:d}); load(); }
}

function val(id){ return document.getElementById(id).value.trim(); }
function esc(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

document.getElementById('create').onclick = create;
document.getElementById('langToggle').onclick = ()=>{ LANG = LANG==='he'?'en':'he'; render(); };
window.repurpose=repurpose; window.autoSched=autoSched; window.doRender=doRender; window.adv=adv; window.setDate=setDate;

load();
