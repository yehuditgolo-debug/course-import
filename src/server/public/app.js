// Dashboard front-end. Talks to the JSON API in src/server/server.js.
let STATE = null;
let LANG = 'he';

const I18N = {
  he: { new:'פוסט ליבה חדש', lang:'שפה', hook1:'הוק ראשי', hook2:'הוק משני', body:'גוף הפוסט',
        create:'צור + שכפל', posts:'פוסטי ליבה', pipelineH:'פייפליין לפי סטטוס', calH:'לוח פרסום',
        render:'רנדר', next:'קדם', sched:'תזמן', auto:'תזמון אוטומטי', view:'צפה', repurpose:'שכפל מחדש',
        hint:'כתבי פוסט ליבה אחד — המערכת תייצר ממנו 5 פורמטים אוטומטית.',
        tabContent:'תוכן', tabAgents:'סוכנים',
        agentsH:'כל סוכן במערכת — מה רץ, מה לא, מה צריך את העיניים שלך',
        thStatus:'סטטוס', thAgent:'סוכן', thSchedule:'תזמון', thLast:'ריצה אחרונה', thOutput:'פלט אחרון',
        runNow:'הרץ עכשיו', historyH:'היסטוריית ריצות', totalAgents:'סוכנים', onTrack:'במסלול',
        needsAttention:'דורש תשומת לב', never:'טרם רץ',
        st_on_track:'במסלול', st_needs_attention:'דורש תשומת לב', st_overdue:'באיחור', st_idle:'טרם רץ', st_planned:'מתוכנן',
        advisorH:'יועץ A4 — לפי המתודה', ideaL:'רעיון / סיטואציה מהחיים', pillarL:'עמוד תוכן',
        suggestHooks:'הצע הוקים', critiqueDraft:'בדוק טיוטה', useHook:'השתמש', strongest:'החזק ביותר',
        verdict_pass:'✓ עובר את מבחן הזהב', verdict_warn:'⚠ עובר — עם הערות', verdict_fail:'✗ לא עובר — קו אדום',
        thinking:'בודק מול המתודה...', fitsPillar:'מתאים לעמוד' },
  en: { new:'New core post', lang:'Language', hook1:'Main hook', hook2:'Sub hook', body:'Body',
        create:'Create + repurpose', posts:'Core posts', pipelineH:'Pipeline by status', calH:'Publishing calendar',
        render:'Render', next:'Advance', sched:'Schedule', auto:'Auto-schedule', view:'View', repurpose:'Re-repurpose',
        hint:'Write one core post — the system fans it out into 5 formats automatically.',
        tabContent:'Content', tabAgents:'Agents',
        agentsH:'Every agent in the system — what ran, what didn\'t, what wants your eyes',
        thStatus:'Status', thAgent:'Agent', thSchedule:'Schedule', thLast:'Last run', thOutput:'Last output',
        runNow:'Run now', historyH:'Run history', totalAgents:'Total agents', onTrack:'On track',
        needsAttention:'Needs attention', never:'Never ran',
        st_on_track:'On track', st_needs_attention:'Needs attention', st_overdue:'Overdue', st_idle:'Never ran', st_planned:'Planned',
        advisorH:'Advisor A4 — per the method', ideaL:'Idea / real-life situation', pillarL:'Content pillar',
        suggestHooks:'Suggest hooks', critiqueDraft:'Critique draft', useHook:'Use', strongest:'Strongest',
        verdict_pass:'✓ Passes the golden test', verdict_warn:'⚠ Passes — with notes', verdict_fail:'✗ Fails — red line',
        thinking:'Checking against the method...', fitsPillar:'Fits pillar' },
};

function t(k){ return (I18N[LANG]||I18N.he)[k] || k; }
function lbl(map, key){ const m = STATE?.meta?.[map]?.[key]; return m ? (m[LANG]||m.he||key) : key; }

async function api(path, method='GET', body){
  const r = await fetch(path, { method, headers:{'content-type':'application/json'}, body: body?JSON.stringify(body):undefined });
  if(!r.ok){ const e = await r.json().catch(()=>({})); alert(e.error||('HTTP '+r.status)); throw new Error(e.error); }
  return r.json();
}

let AGENTS = [];
let TAB = 'content';

async function load(){
  [STATE, AGENTS] = await Promise.all([
    api('/api/state'),
    api('/api/agents').then(r=>r.agents),
  ]);
  render();
}

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
  renderAgents();
  // tab visibility
  document.getElementById('view-content').style.display = TAB==='content'?'':'none';
  document.getElementById('view-agents').style.display = TAB==='agents'?'':'none';
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===TAB));
}

function fmtWhen(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(LANG==='he'?'he-IL':'en-US',{dateStyle:'short',timeStyle:'short'});
}

function renderAgents(){
  const counts = { total: AGENTS.length,
    on: AGENTS.filter(a=>a.status==='on_track').length,
    attn: AGENTS.filter(a=>a.status==='needs_attention'||a.status==='overdue').length };
  document.getElementById('agentsStats').innerHTML = `
    <div class="stat"><div class="n">${counts.total}</div><div class="l">${t('totalAgents')}</div></div>
    <div class="stat"><div class="n ok">${counts.on}</div><div class="l">${t('onTrack')}</div></div>
    <div class="stat"><div class="n ${counts.attn?'fail':''}">${counts.attn}</div><div class="l">${t('needsAttention')}</div></div>`;

  document.getElementById('agentsBody').innerHTML = AGENTS.map(a=>{
    const last = a.lastRuns[0];
    return `<tr>
      <td><span class="dot ${a.status}"></span>${t('st_'+a.status)}</td>
      <td><b>${a.name[LANG]||a.name.he}</b><div class="muted">${a.desc[LANG]||a.desc.he}</div></td>
      <td>${a.code}</td>
      <td>${a.schedule}</td>
      <td>${fmtWhen(last?.at)}</td>
      <td class="${last? (last.ok?'ok':'fail'):''}">${last? esc(last.summary):'—'}</td>
      <td>${a.live?`<button class="btn sm" onclick="runAgentNow('${a.id}')">${t('runNow')}</button>`:''}</td>
    </tr>`;
  }).join('');

  const allRuns = AGENTS.flatMap(a=>a.lastRuns.map(r=>({...r, agent:a.name[LANG]||a.name.he})))
    .sort((x,y)=>y.at.localeCompare(x.at)).slice(0,12);
  document.getElementById('agentHistory').innerHTML = allRuns.map(r=>`
    <div class="hist"><span class="when">${fmtWhen(r.at)}</span>
      <b>${r.agent}</b>
      <span class="${r.ok?'ok':'fail'}">${r.ok?'✓':'✗'}</span>
      <span>${esc(r.summary)}</span></div>`).join('') || `<p class="muted">—</p>`;
}

async function runAgentNow(id){
  await api(`/api/agents/${encodeURIComponent(id)}/run`,'POST',{});
  load();
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

// --- advisor (A4) ---
let LAST_HOOKS = [];

async function adviseHooks(){
  const out = document.getElementById('advisorOut');
  out.innerHTML = `<p class="muted">${t('thinking')}</p>`;
  const r = await api('/api/advisor/hooks','POST',{ idea: val('a-idea'), pillar: val('a-pillar'), lang: LANG });
  LAST_HOOKS = r.hooks;
  out.innerHTML = r.hooks.map((h,i)=>`
    <div class="card">
      <div class="t">${esc(h.text)}</div>
      <div class="meta">
        <span class="tag">${esc(h.typeLabel?.[LANG]||h.typeLabel?.he||h.type)}</span>
        ${h.strongest?`<span class="tag" style="border-color:var(--accent);color:var(--accent)">★ ${t('strongest')}</span>`:''}
        ${h.fit&&!h.strongest?`<span class="tag">${t('fitsPillar')}</span>`:''}
      </div>
      ${h.why?`<div class="muted" style="margin-top:4px">${esc(h.why[LANG]||h.why.he||'')}</div>`:''}
      <div class="row"><button class="btn ghost sm" onclick="useHook(${i})">${t('useHook')} ←</button></div>
    </div>`).join('') || `<p class="muted">—</p>`;
}

function useHook(i){
  const h = LAST_HOOKS[i];
  if(!h) return;
  document.getElementById('f-hook1').value = h.text;
}

async function adviseCritique(){
  const out = document.getElementById('advisorOut');
  out.innerHTML = `<p class="muted">${t('thinking')}</p>`;
  const r = await api('/api/advisor/critique','POST',{
    hook1: val('f-hook1'), hook2: val('f-hook2'), body: val('f-body'), cta: val('f-cta'),
    tags: { pillar: val('a-pillar') },
  });
  const mark = p => p==='pass'?'✓':(p==='warn'?'⚠':'✗');
  const cls = p => p==='pass'?'ok':(p==='warn'?'':'fail');
  out.innerHTML = `
    <div class="card">
      <div class="t ${cls(r.verdict)}">${t('verdict_'+r.verdict)}</div>
      ${r.goldenTest.map(c=>`<div class="${cls(c.pass)}" style="font-size:12px; margin-top:3px">${mark(c.pass)} ${esc(c.q[LANG]||c.q.he)}${c.note?` — <span class="muted">${esc(c.note)}</span>`:''}</div>`).join('')}
      ${r.redLines.length?`<div style="margin-top:8px" class="fail">${r.redLines.map(v=>`✗ ${esc(v.label[LANG]||v.label.he)}: «${esc(v.match)}»`).join('<br>')}</div>`:''}
    </div>`;
}

function val(id){ return document.getElementById(id).value.trim(); }
function esc(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

document.getElementById('create').onclick = create;
document.getElementById('langToggle').onclick = ()=>{ LANG = LANG==='he'?'en':'he'; render(); };
document.querySelectorAll('.tab').forEach(b=> b.onclick = ()=>{ TAB = b.dataset.tab; render(); });
document.getElementById('adviseHooksBtn').onclick = adviseHooks;
document.getElementById('adviseCritiqueBtn').onclick = adviseCritique;
window.repurpose=repurpose; window.autoSched=autoSched; window.doRender=doRender; window.adv=adv; window.setDate=setDate;
window.runAgentNow=runAgentNow; window.useHook=useHook;

load();
