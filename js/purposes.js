/* Purpose-specific presentation. Calculations are identical for all audiences. */
function previewInitialAudience(){
  const mode=document.getElementById('initialAudience').value;
  document.getElementById('initialAudienceHint').textContent=t(mode?mode+'.hint':'onboard.note');
}
function saveInitialAudience(event){
  event.preventDefault();
  const select=document.getElementById('initialAudience');
  if(!select.reportValidity())return;
  setAudience(select.value);
  document.getElementById('audienceDialog').close();
  document.getElementById('mainContent').focus();
}
function audienceCopy(){
  return {hint:t(audienceMode+'.hint'),note:t(audienceMode+'.note'),empty:t('noData'),low:t(audienceMode==='contraception'?'phase.low':'phase.outside')};
}
function audienceAdvice(info){
  if(audienceMode==='tracking')return t('tracking.'+(info.isRecordedStart?'recorded':info.status==='period'?'period':info.isOvDay?'ovulation':'other'));
  if(audienceMode==='conception')return t('conception.'+(info.isFertileWindow?'fertile':info.status==='period'?'period':'other'));
  return t('contraception.'+(info.isFertileWindow?'high':'low'));
}
function setAudience(mode,persist=true){
  if(!['tracking','contraception','conception'].includes(mode))return;
  audienceMode=mode;
  document.getElementById('audienceSelect').value=mode;
  document.getElementById('purposeNote').textContent=audienceCopy().note;
  document.querySelector('.status-card.saf .sc-label').textContent=audienceCopy().low;
  document.getElementById('lowRiskLegend').textContent=audienceCopy().low;
  document.getElementById('scSafeSub').textContent=t(mode==='contraception'?'contraception.note':'basis');
  document.getElementById('scFertileSub').textContent=t(mode==='conception'?'conception.fertile':mode==='tracking'?'basis':'contraception.high');
  document.querySelector('#page-bbt .page-intro').textContent=t(mode+'.bbt')+' '+t('bbt.intro');
  document.querySelector('#page-history .page-intro').textContent=t('history.intro')+' '+t(mode+'.history');
  document.getElementById('helpIntro').textContent=t(mode+'.hint');
  document.getElementById('helpPlan').textContent=t(mode+'.note');
  if(typeof renderRegion==='function')renderRegion();
  renderSelectedSummary();
  renderBBT();
  if(!document.getElementById('detailPanel').classList.contains('hidden'))renderDayDetail(selectedDate);
  renderCal();
  if(persist){try{localStorage.setItem('audienceMode',mode);}catch{notifyUser(t('error.storage'));}}
}
