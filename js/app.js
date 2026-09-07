/* ════════════════════════════════════════
   State
════════════════════════════════════════ */
let cycleType  = 'regular';
let calcParams = null;
let dayMap     = {};        // isoDate → { dayNum, status, isOvDay, isBBTOv, isBBTHigh, bbtTemp, desc, isToday }
let calYear, calMonth;
let appliedSettings=null;
let selectedDate=localISO(new Date());
let audienceMode='contraception';
let deferredInstallPrompt = null;
let installInProgress = false;
let appInstalled = false;

/* ════════════════════════════════════════
   Init
════════════════════════════════════════ */


/* ════════════════════════════════════════
   PWA: install + service worker
════════════════════════════════════════ */

/* ════════════════════════════════════════
   Navigation
════════════════════════════════════════ */
function gotoPage(name, btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');

  syncNav(name);
  if(name==='bbt') renderBBT();
  window.scrollTo({top:0});
}
function syncNav(name){
  ['calendar','bbt','history','emergency'].forEach((page,i)=>{
    [document.getElementById('nav-'+page),document.querySelectorAll('.desk-tab')[i]].forEach(b=>{
      b.classList.toggle('active',page===name);
      if(page===name) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
  });
}

/* ════════════════════════════════════════
   Sheet
════════════════════════════════════════ */
let sheetTrigger=null;
function openSheet(){
  sheetTrigger=document.activeElement;
  checkHint(); document.getElementById('overlay').classList.add('open');
  document.querySelector('main').inert=true;
  document.querySelectorAll('header,nav.bottom-nav,#installBanner').forEach(el=>el.inert=true);
  document.body.style.overflow='hidden';
  document.getElementById('lastPeriod').focus();
}
function closeSheet(){
  document.getElementById('overlay').classList.remove('open');
  document.querySelector('main').inert=false;
  document.querySelectorAll('header,nav.bottom-nav,#installBanner').forEach(el=>el.inert=false);
  document.body.style.overflow='';
  if(sheetTrigger&&!sheetTrigger.closest('.hidden')) sheetTrigger.focus();
  else document.querySelector('.setup-btn').focus();
}
function overlayClick(e){ if(e.target===document.getElementById('overlay')) closeSheet(); }
function calcAndClose(){
  if(!calculate()) return;
  selectDate(selectedDate);
  let saved=true;
  try{localStorage.setItem('cycleSettings',JSON.stringify(appliedSettings));}catch{saved=false;}
  closeSheet();renderBBT();notifyUser(saved?t('saved'):t('error.storage'));
}
document.addEventListener('keydown',e=>{
  if(!document.getElementById('overlay').classList.contains('open')) return;
  if(e.key==='Escape'){e.preventDefault();closeSheet();}
  if(e.key==='Tab'){
    const items=[...document.querySelectorAll('.sheet button,.sheet input')].filter(el=>el.getClientRects().length&&!el.disabled);
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  if(e.key==='Enter'&&e.target.matches('input:not([type=radio])')){e.preventDefault();calcAndClose();}
});
document.querySelectorAll('[name=ctype]').forEach(el=>el.addEventListener('change',()=>setCycleType(el.value)));
document.getElementById('bbtTemp').addEventListener('keydown',e=>{if(e.key==='Enter')addBBT();});
document.getElementById('hDate').addEventListener('keydown',e=>{if(e.key==='Enter')addHistory();});
function localISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function goToday(){selectDate(localISO(new Date()));}
let toastTimer;
function notifyUser(message){
  const el=document.getElementById('toast');el.textContent=message;el.classList.remove('hidden');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),3500);
}
function fieldError(id,message){
  const field=document.getElementById(id);
  let error=document.getElementById(id+'Error');
  if(!error){error=document.createElement('div');error.id=id+'Error';error.className='field-error';error.setAttribute('role','alert');field.after(error);}
  error.textContent=message;field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',error.id);field.focus();
  return false;
}
function clearFieldErrors(){
  document.querySelectorAll('.field-error').forEach(el=>el.remove());
  document.querySelectorAll('[aria-invalid]').forEach(el=>{el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');});
}
document.addEventListener('input',e=>{
  if(e.target.hasAttribute('aria-invalid')){document.getElementById(e.target.id+'Error')?.remove();e.target.removeAttribute('aria-invalid');e.target.removeAttribute('aria-describedby');}
});

/* ════════════════════════════════════════
   Cycle type
════════════════════════════════════════ */
function setCycleType(t){
  cycleType = t;
  document.getElementById('inp-regular').classList.toggle('hidden', t!=='regular');
  document.getElementById('inp-irregular').classList.toggle('hidden', t!=='irregular');
  document.getElementById('rp-regular').classList.toggle('on', t==='regular');
  document.getElementById('rp-irregular').classList.toggle('on', t==='irregular');
  document.querySelector('[name=ctype][value="'+t+'"]').checked=true;
}

/* ════════════════════════════════════════
   History hint / auto-fill
════════════════════════════════════════ */
function checkHint(){
  const h = getHistory();
  const el = document.getElementById('sheetHint');
  if(h.length>=2){ el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}
function autoFill(){
  const h = getHistory(); if(!h.length) return;
  document.getElementById('lastPeriod').value = h[0].date;
  if(h.length>=2){
    const cs = h.map(x=>x.cycle).filter(Number.isFinite);
    const mn = Math.min(...cs), mx = Math.max(...cs);
    const av = Math.round(cs.reduce((a,b)=>a+b,0)/cs.length);
    const supported=mn===mx?av>=20&&av<=45:mn>=18&&mn<=45&&mx>=20&&mx<=50;
    if(!supported){notifyUser(t('error.unsupported'));return;}
    if(mn===mx){ setCycleType('regular'); document.getElementById('cycleLength').value=av; }
    else{ setCycleType('irregular'); document.getElementById('minLength').value=mn; document.getElementById('maxLength').value=mx; }
  }
}

/* ════════════════════════════════════════
   BBT analysis
════════════════════════════════════════ */
/* ════════════════════════════════════════
   Main calculate
════════════════════════════════════════ */
function calculate(){
  clearFieldErrors();
  const lpv = document.getElementById('lastPeriod').value;
  if(!lpv) return fieldError('lastPeriod',t('error.date'));
  const fields=cycleType==='regular'?['cycleLength','periodLength']:['minLength','maxLength','periodLength'];
  for(const id of fields){const el=document.getElementById(id);if(!el.value||!el.checkValidity())return fieldError(id,t('error.range',{min:el.min,max:el.max}));}

  const start = new Date(lpv+'T00:00:00');
  const pd    = Math.max(2,Math.min(10, parseInt(document.getElementById('periodLength').value)||5));
  const today = new Date(); today.setHours(0,0,0,0);

  let ovDay, startD, endD, total, cLen;
  if(cycleType==='regular'){
    cLen   = parseInt(document.getElementById('cycleLength').value)||28;
    ovDay  = cLen-14;
    startD = ovDay-5; endD = ovDay+2; total = cLen;
  } else {
    const mn = parseInt(document.getElementById('minLength').value)||25;
    const mx = parseInt(document.getElementById('maxLength').value)||32;
    if(mn>=mx) return fieldError('maxLength',t('error.order'));
    ovDay=null; startD=mn-18; endD=mx-11; cLen=mx; total=mx;
  }
  // Only show dates inside the configured cycle.
  total = cLen;
  const nextKnown=getHistory().map(h=>h.date).filter(d=>d>lpv).sort()[0];
  calcParams = {lpv, cLen:cLen||28, pd};
  appliedSettings={type:cycleType,values:Object.fromEntries(['lastPeriod','cycleLength','minLength','maxLength','periodLength'].map(id=>[id,document.getElementById(id).value]))};

  const bbtRaw = getBBT();
  const bbtRes = analyzeBBT(bbtRaw);
  const bbtMap = {}; bbtRaw.forEach(b=>{ bbtMap[b.date]=b.temp; });
  const bbtOvD  = bbtRes?.ovulationDate||null;

  dayMap = {};

  for(let i=1;i<=total;i++){
    const d = new Date(start); d.setDate(start.getDate()+i-1);
    const iso = localISO(d);
    if(nextKnown&&iso>=nextKnown)break;
    const bt  = iso<=localISO(today)?bbtMap[iso]:null;
    const dayBBT=analyzeBBT(bbtRaw,iso);
    const isBBTOv = iso===bbtOvD;
    const isBBTHi = !!dayBBT?.highTempStartDate;
    const isTd    = d.getTime()===today.getTime();

    let st='safe', isOv=!!ovDay&&i===ovDay;
    if(i<=pd){ st='period'; }
    else if(ovDay&&i===ovDay){ st='ovulation'; isOv=true; }
    else if(i>=startD&&i<=endD){ st='fertile'; }

    const isRecordedStart=i===1&&iso<=localISO(today);

    dayMap[iso] = {dayNum:i,status:st,isFertileWindow:i>=startD&&i<=endD,isRecordedStart,isOvDay:isOv,isBBTOv,isBBTHi,bbtTemp:bt,isToday:isTd};
  }

  calcParams.ovDay=ovDay;calcParams.startD=startD;calcParams.endD=endD;
  renderOverview();
  renderSelectedSummary();
  document.getElementById('saveCycleBtn').classList.remove('hidden');
  document.getElementById('shareCycleBtn').classList.remove('hidden');
  renderCal();
  document.getElementById('detailPanel').classList.add('hidden');
  document.getElementById('startCard').classList.add('hidden');
  setAudience(audienceMode,false);
  return true;
}

function dayStatusLabel(info){
  if(info.isRecordedStart)return t('phase.recorded');
  return info.status==='safe'?audienceCopy().low:t('phase.'+info.status);
}


/* ════════════════════════════════════════
   STM Banner
════════════════════════════════════════ */
function renderSelectedSummary(){
  const info=dayMap[selectedDate];
  const card=document.getElementById('stmCard'),title=document.getElementById('stmTitle'),rows=document.getElementById('stmRows');
  document.getElementById('stmDate').textContent=fmt(new Date(selectedDate+'T00:00:00'));
  const signalLabel=document.getElementById('signalLabel');
  signalLabel.textContent=t(calcParams?'noData':'notSet');card.className='stm-card grey';
  if(!info){title.textContent=t('noData');rows.textContent=t(calcParams?'outsideCycle':'setupFirst');return;}
  title.textContent=dayStatusLabel(info);
  document.getElementById('stmDate').textContent=fmt(new Date(selectedDate+'T00:00:00'))+' · '+t('day',{n:formatNumber(info.dayNum)});
  const color=info.status==='period'?'period':info.isOvDay?'red':info.isFertileWindow?'orange':'green';
  card.className='stm-card '+color;
  const caption=document.createElement('span');caption.className='signal-caption';
  caption.textContent=t(color==='green'?(audienceMode==='contraception'?'risk':'estimated'):color==='period'?(info.isRecordedStart?'recorded':'bleedingEstimate'):'estimated');
  const value=document.createElement('strong');value.textContent=t(color==='period'?'short.period':color==='red'?'short.ovulation':color==='orange'?'short.fertile':audienceMode==='contraception'?'short.lower':'short.outside');
  signalLabel.replaceChildren(caption,value);rows.textContent=audienceAdvice(info);
}

function selectDate(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||!Number.isFinite(new Date(iso+'T00:00:00').getTime()))return;
  selectedDate=iso;const d=new Date(iso+'T00:00:00');calYear=d.getFullYear();calMonth=d.getMonth();
  renderCal();renderSelectedSummary();document.getElementById('detailPanel').classList.add('hidden');
}
function restoreSettings(){
  try{
    const saved=JSON.parse(localStorage.getItem('cycleSettings')||'null');
    if(!saved||!['regular','irregular'].includes(saved.type)||!saved.values)return;
    const ids=['lastPeriod','cycleLength','minLength','maxLength','periodLength'];
    const valid=ids.every(id=>{const probe=document.getElementById(id).cloneNode();probe.value=saved.values[id]??'';return !!probe.value&&probe.checkValidity();});
    if(!valid||saved.type==='irregular'&&Number(saved.values.minLength)>=Number(saved.values.maxLength))return;
    setCycleType(saved.type);ids.forEach(id=>document.getElementById(id).value=saved.values[id]);calculate();renderBBT();
  }catch{/* Ignore missing or invalid saved settings. */}
}

/* ════════════════════════════════════════
   Calendar render
════════════════════════════════════════ */
function renderCal(){
  const y=calYear, m=calMonth;
  document.getElementById('calMonthTitle').textContent=localizedDate(new Date(y,m,1),{year:'numeric',month:'long'});

  const grid=document.getElementById('calGrid'); grid.innerHTML='';
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  const today=new Date(); today.setHours(0,0,0,0);

  // pad start
  for(let i=0;i<first.getDay();i++){
    const d=new Date(y,m,1-(first.getDay()-i));
    const c=document.createElement('div');
    c.className='cal-cell other'; c.textContent=formatNumber(d.getDate());
    grid.appendChild(c);
  }

  for(let d=1;d<=last.getDate();d++){
    const date=new Date(y,m,d);
    const iso=localISO(date);
    const info=dayMap[iso];
    const isTd=date.getTime()===today.getTime();

    const cell=document.createElement('button');
    cell.type='button';

    cell.setAttribute('aria-label',localizedDate(date,{year:'numeric',month:'long',day:'numeric'})+(isTd?' · '+t('today'):'')+' · '+(info?dayStatusLabel(info):t('noData')));
    cell.setAttribute('aria-pressed',String(iso===selectedDate));
    if(isTd)cell.setAttribute('aria-current','date');
    let cls='cal-cell';
    if(info){
      if(info.isBBTOv)        cls+=' bbt-ov';
      else if(info.isBBTHi)   cls+=' bbt-hi';
      else if(info.status==='period')    cls+=' period';
      else if(info.status==='ovulation') cls+=' ovulation';
      else if(info.status==='fertile')   cls+=' fertile';
      else if(info.status==='safe')      cls+=' safe';
    }
    if(isTd) cls+=' today';
    if(iso===selectedDate)cls+=' sel';
    cell.className=cls;
    cell.textContent=formatNumber(d);

    if(info?.bbtTemp!=null){
      const dot=document.createElement('div'); dot.className='cell-bbt-dot';
      cell.appendChild(dot);
    }
    cell.onclick=()=>showDay(iso,cell);
    grid.appendChild(cell);
  }

  // pad end
  const rem=7-(first.getDay()+last.getDate())%7;
  if(rem<7){ for(let i=1;i<=rem;i++){ const c=document.createElement('div');c.className='cal-cell other';c.textContent=formatNumber(i);grid.appendChild(c); } }
}

function moveMonth(d){
  calMonth+=d;
  if(calMonth>11){calMonth=0;calYear++;}
  if(calMonth<0){calMonth=11;calYear--;}
  renderCal();
  document.getElementById('detailPanel').classList.add('hidden');
}

function showDay(iso,cell){
  selectedDate=iso;renderSelectedSummary();
  document.querySelectorAll('button.cal-cell').forEach(c=>{c.classList.remove('sel');c.setAttribute('aria-pressed','false');});
  cell.classList.add('sel');
  cell.setAttribute('aria-pressed','true');
  renderDayDetail(iso);
  document.getElementById('detailPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderDayDetail(iso){
  const info=dayMap[iso],panel=document.getElementById('detailPanel');
  if(!info){panel.className='detail-panel';panel.textContent=t('outsideCycle');return;}
  panel.className='detail-panel is-'+(info.isBBTHi?'bbt':info.status);
  const title=document.createElement('strong');title.textContent=fmt(new Date(iso+'T00:00:00'))+' · '+t('day',{n:formatNumber(info.dayNum)})+' · '+dayStatusLabel(info);
  const detail=document.createElement('div');detail.textContent=t(info.isRecordedStart?'phase.recorded':'basis');
  const advice=document.createElement('div');advice.className='audience-advice';advice.textContent=audienceAdvice(info);
  panel.replaceChildren(title,detail,advice);
  if(info.bbtTemp!=null){const temp=document.createElement('div');temp.textContent=t('bbt.temp')+': '+formatNumber(info.bbtTemp,2);panel.appendChild(temp);}
}

/* ════════════════════════════════════════
   Helpers
════════════════════════════════════════ */
function dOff(b,n){ const d=new Date(b);d.setDate(b.getDate()+n);return d; }
function fmt(d){return localizedDate(d);}

/* ════════════════════════════════════════
   History
════════════════════════════════════════ */



function addHistory(){
  clearFieldErrors();
  const date=document.getElementById('hDate').value;
  if(!date) return fieldError('hDate',t('error.date'));
  if(date>localISO(new Date()))return fieldError('hDate',t('error.future'));
  const h=getHistory();
  if(h.find(x=>x.date===date)) return fieldError('hDate',t('error.duplicate'));
  h.push({date}); h.sort((a,b)=>b.date.localeCompare(a.date));
  saveHistoryData(h); renderHistory(); checkHint(); refreshPrediction(); renderBBT();
  notifyUser(t('saved'));
}
function deleteHistory(date){
  saveHistoryData(getHistory().filter(h=>h.date!==date));
  renderHistory(); checkHint(); refreshPrediction(); renderBBT();
}
function renderHistory(){
  const h=getHistory(),list=document.getElementById('histList'),stats=document.getElementById('histStats'),advice=document.getElementById('histAdvice');
  list.replaceChildren();
  document.getElementById('histEmpty').classList.toggle('hidden',!!h.length);
  document.getElementById('histListCard').classList.toggle('hidden',!h.length);
  stats.classList.toggle('hidden',h.length<2);advice.classList.toggle('hidden',!h.length);
  if(h.length>=2){
    const cs=h.map(x=>x.cycle).filter(Number.isFinite),avg=cs.reduce((a,b)=>a+b,0)/cs.length;
    stats.textContent=t('history.stats',{records:formatNumber(h.length),cycles:formatNumber(cs.length)})+' · '+t('history.range',{avg:formatNumber(avg,1),min:formatNumber(Math.min(...cs)),max:formatNumber(Math.max(...cs))});
    advice.textContent=t(cs.length===1?'history.one':'history.check');
  }else advice.textContent=t('history.wait');
  h.forEach(x=>{
    const li=document.createElement('li');li.className='hist-item';const text=document.createElement('div');
    const date=document.createElement('div');date.className='hd';date.textContent=fmt(new Date(x.date+'T00:00:00'));
    const interval=document.createElement('div');interval.className='hc';interval.textContent=x.cycle===null?t('history.wait'):t('history.interval',{date:fmt(new Date(x.nextDate+'T00:00:00')),n:formatNumber(x.cycle)});
    text.append(date,interval);const button=document.createElement('button');button.className='btn-del';button.textContent='×';button.setAttribute('aria-label',t('delete'));button.onclick=()=>deleteHistory(x.date);
    li.append(text,button);list.appendChild(li);
  });
}
function saveCurrentCycle(){
  if(!calcParams) return alert(t('setupFirst'));
  const {lpv}=calcParams;
  if(lpv>localISO(new Date()))return notifyUser(t('error.future'));
  const h=getHistory();
  if(h.find(x=>x.date===lpv)) return notifyUser(t('error.duplicate'));
  h.push({date:lpv}); h.sort((a,b)=>b.date.localeCompare(a.date));
  saveHistoryData(h); renderHistory(); checkHint(); refreshPrediction(); renderBBT(); notifyUser(t('saved'));
}

/* ════════════════════════════════════════
   BBT
════════════════════════════════════════ */

function refreshPrediction(){
  if(!appliedSettings)return;
  const draft={type:cycleType,values:Object.fromEntries(Object.keys(appliedSettings.values).map(id=>[id,document.getElementById(id).value]))};
  setCycleType(appliedSettings.type);
  Object.entries(appliedSettings.values).forEach(([id,value])=>document.getElementById(id).value=value);
  calculate();
  setCycleType(draft.type);
  Object.entries(draft.values).forEach(([id,value])=>document.getElementById(id).value=value);
}

function addBBT(){
  clearFieldErrors();
  const date=document.getElementById('bbtDate').value;
  const temp=parseFloat(document.getElementById('bbtTemp').value);
  if(!date) return fieldError('bbtDate',t('error.date'));
  if(date>localISO(new Date()))return fieldError('bbtDate',t('error.future'));
  if(isNaN(temp)||!document.getElementById('bbtTemp').checkValidity()) return fieldError('bbtTemp',t('error.temp'));
  const updating=getBBT().some(b=>b.date===date);
  const d=getBBT().filter(b=>b.date!==date);
  d.push({date,temp}); d.sort((a,b)=>b.date.localeCompare(a.date));
  saveBBT(d); renderBBT(); document.getElementById('bbtTemp').value='';
  refreshPrediction();
  notifyUser(updating?t('updated'):t('saved'));
}
function deleteBBT(date){ saveBBT(getBBT().filter(b=>b.date!==date)); renderBBT(); refreshPrediction();notifyUser(t('deleted')); }
function clearBBT(){ if(!confirm(t('bbt.confirm')))return; saveBBT([]); renderBBT(); refreshPrediction();notifyUser(t('deleted')); }

function renderBBT(){
  const data=getBBT(),list=document.getElementById('bbtList'),analysis=document.getElementById('bbtAnalysis');
  list.replaceChildren();document.getElementById('bbtEmpty').classList.toggle('hidden',!!data.length);
  ['bbtListCard','bbtClearBtn','bbtChartCard','bbtAnalysis'].forEach(id=>document.getElementById(id).classList.toggle('hidden',!data.length));
  if(!data.length)return;
  const res=analyzeBBT(data);
  analysis.className='bbt-analysis '+(res?.highTempStartDate?'confirmed':'warning');
  analysis.textContent=res?.highTempStartDate?t('bbt.rise',{n:formatNumber(res.consecutiveHighDays)})+' · '+t('bbt.line',{n:formatNumber(res.coverLine,2)})+' · '+t(audienceMode+'.bbt'):t('bbt.insufficient');
  drawBBTChart(data,res);
  [...data].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).forEach(b=>{
    const li=document.createElement('li');li.className='bbt-item';const date=document.createElement('div');date.className='d';date.textContent=fmt(new Date(b.date+'T00:00:00'));
    const value=document.createElement('div');value.className='tv';value.textContent=formatNumber(b.temp,2)+'°C';
    const button=document.createElement('button');button.className='btn-del';button.textContent='×';button.setAttribute('aria-label',t('delete'));button.onclick=()=>deleteBBT(b.date);
    li.append(date,value,button);list.appendChild(li);
  });
}

window.addEventListener('resize',()=>{if(document.getElementById('page-bbt').classList.contains('active')){const data=getBBT();if(data.length)drawBBTChart(data,analyzeBBT(data));}});

(function(){
  translatePage();
  const t = new Date();
  ['lastPeriod','hDate','bbtDate'].forEach(id=>document.getElementById(id).value=localISO(t));
  calYear  = t.getFullYear();
  calMonth = t.getMonth();
  renderCal();
  renderHistory();
  renderBBT();
  checkHint();
  initInstallCTA();
  syncNav('calendar');
  restoreSettings();
  let hasAudience=false;
  try{const saved=localStorage.getItem('audienceMode');if(['tracking','contraception','conception'].includes(saved)){audienceMode=saved;hasAudience=true;}}catch{}
  setAudience(audienceMode,false);
  renderOverview();
  if(!hasAudience)document.getElementById('audienceDialog').showModal();
})();

function renderOverview(){
  const put=(id,text)=>document.getElementById(id).textContent=text;
  if(!calcParams){['scOvulation','scFertile','scSafe','scNextPeriod'].forEach(id=>put(id,'—'));put('scOvulationSub',t('setupFirst'));put('scNextPeriodSub',t('setupFirst'));put('scBBT',t('bbt.empty'));put('scBBTSub','');return;}
  const {lpv,cLen,ovDay,startD,endD}=calcParams,start=new Date(lpv+'T00:00:00'),next=dOff(start,cLen),today=new Date();today.setHours(0,0,0,0);
  put('scOvulation',ovDay?fmt(dOff(start,ovDay-1)):t('setup.irregular'));
  put('scOvulationSub',t('basis'));
  put('scFertile',fmt(dOff(start,startD-1))+' – '+fmt(dOff(start,endD-1)));
  put('scSafe',t('fromDate',{date:fmt(dOff(start,endD))}));
  put('scNextPeriod',fmt(next));const days=Math.round((next-today)/86400000);
  put('scNextPeriodSub',t(days>0?'dueIn':days===0?'dueToday':'pastDue',{n:formatNumber(Math.abs(days))}));
  const res=analyzeBBT(getBBT());put('scBBT',res?.highTempStartDate?t('bbt.rise',{n:formatNumber(res.consecutiveHighDays)}):t('noData'));
  put('scBBTSub',t('bbt.count',{n:formatNumber(cycleBBT(getBBT()).length)}));
}
