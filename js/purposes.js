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
  renderPurposeGuide();
  if(typeof renderRegion==='function')renderRegion();
  renderSelectedSummary();
  renderBBT();
  if(!document.getElementById('detailPanel').classList.contains('hidden'))renderDayDetail(selectedDate);
  renderCal();
  if(persist){try{localStorage.setItem('audienceMode',mode);}catch{notifyUser(t('error.storage'));}}
}

function renderPurposeGuide(){
  const sources={
    pain:'https://www.nhs.uk/symptoms/period-pain/',
    irregular:'https://www.nhs.uk/symptoms/irregular-periods/',
    heavy:'https://www.nhs.uk/conditions/heavy-periods/',
    ec:'https://www.who.int/news-room/fact-sheets/detail/emergency-contraception',
    test:'https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/',
    options:'https://www.nhs.uk/contraception/methods-of-contraception/',
    signals:'https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/',
    partner:'https://www.nhs.uk/contraception/methods-of-contraception/vasectomy-male-sterilisation/what-is-it/',
    trying:'https://www.nhs.uk/pregnancy/trying-for-a-baby/trying-to-get-pregnant/',
    urgent:'https://www.nhs.uk/symptoms/vaginal-bleeding-between-periods-or-after-sex/'
  };
  const plans={
    contraception:{title:'guide.title',cards:[['help.ecTitle','help.ec','ec'],['help.testTitle','help.test','test']],faq:[['guide.ecTitle','guide.ec','ec'],['guide.optionsTitle','guide.options','options'],['guide.signalsTitle','guide.signals','signals'],['guide.partnerTitle','guide.partner','partner']]},
    conception:{title:'guide.conceptionTitle',cards:[['guide.timingTitle','guide.timing','trying'],['help.testTitle','help.test','test'],['guide.urgentTitle','guide.urgent','urgent']],faq:[['guide.prepareTitle','guide.prepare','trying'],['guide.tempQuestion','conception.note','test'],['guide.estimateQuestion','tracking.note']]},
    tracking:{title:'guide.trackingTitle',cards:[['guide.painTitle','guide.pain','pain'],['guide.irregularTitle','guide.irregular','irregular'],['guide.urgentTitle','guide.urgent','urgent']],faq:[['guide.heavyTitle','guide.heavy','heavy'],['help.testTitle','help.test','test'],['guide.recordTitle','guide.record'],['guide.estimateQuestion','tracking.note']]}
  };
  const plan=plans[audienceMode],container=document.getElementById('purposeGuide');
  const openKeys=new Set([...container.querySelectorAll('details[open]')].map(el=>el.dataset.question));
  document.getElementById('purposeGuideTitle').textContent=t(plan.title);
  const make=(tag,key)=>{const el=document.createElement(tag);el.textContent=t(key);return el;};
  const item=([heading,body,source],expanded,index)=>{
    const card=document.createElement(expanded?'div':'details');
    card.className=expanded?'emrg-box':'guide-detail';
    card.dataset.topic=body;
    if(['help.ec','guide.urgent'].includes(body))card.classList.add('guide-priority');
    else if(['help.test','guide.heavy'].includes(body))card.classList.add('guide-timing');
    const title=make(expanded?'div':'summary',heading);
    if(expanded)title.className='emrg-title';
    else{card.dataset.question=heading;card.open=openKeys.has(heading);}
    card.append(title);
    const content=document.createElement('div');
    const paragraph=make('p',body);
    emphasizeGuide(paragraph,body);
    content.append(paragraph);
    if(source){const link=make('a','help.source');link.href=sources[source];content.append(link);}
    card.append(content);return card;
  };
  const heading=make('h3','guide.faq');heading.className='settings-help-title';
  container.replaceChildren(...plan.cards.map((row,i)=>item(row,true,i)),heading,...plan.faq.map(row=>item(row,false)));
}

function emphasizeGuide(element,key){
  // Literal, reviewed phrases only: no HTML parsing and no blanket number highlighting.
  const phrases=window.CYCLE_GUIDE_EMPHASIS?.[currentLanguage]?.[key]||[];
  const source=element.textContent;
  const ranges=phrases.map(phrase=>({start:source.indexOf(phrase),phrase})).filter(item=>item.start>=0).sort((a,b)=>a.start-b.start);
  let cursor=0;const fragment=document.createDocumentFragment();
  for(const {start,phrase} of ranges){
    if(start<cursor)continue;
    fragment.append(document.createTextNode(source.slice(cursor,start)));
    const strong=document.createElement('strong');strong.className='guide-emphasis';strong.textContent=phrase;fragment.append(strong);
    cursor=start+phrase.length;
  }
  fragment.append(document.createTextNode(source.slice(cursor)));element.replaceChildren(fragment);
}
