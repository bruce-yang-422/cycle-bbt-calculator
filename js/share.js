/* Local Canvas export. Shares only after the user chooses an action. */
let shareFile = null;
let shareURL = null;
let shareView = 'image';
let shareGeneration = 0;
const shareColors = {period:['#f5d2df','#88435d'], fertile:['#fae5c5','#885912'], ovulation:['#f5c4bf','#9d302e'], safe:['#dfede4','#32664a']};
function shareDate(iso, full=false) {
  return localizedDate(new Date(iso+'T00:00:00'), {year:full?'numeric':undefined, month:'numeric', day:'numeric'});
}
function shareRanges(days) {
  const groups=[];
  for(const day of days){
    const last=groups.at(-1);
    if(last && day.info.dayNum===last.at(-1).info.dayNum+1)last.push(day);
    else groups.push([day]);
  }
  return groups.map(group=>group.length===1?shareDate(group[0].iso):shareDate(group[0].iso)+' – '+shareDate(group.at(-1).iso)).join(' / ') || '—';
}
function buildShareResult() {
  if(!calcParams)return null;
  // Use the applied result, never the draft form or the month currently displayed.
  const days=Object.entries(dayMap).sort(([a],[b])=>a.localeCompare(b)).map(([iso,info])=>({iso,info:{...info}}));
  if(!days.length)return null;
  const lowLabel=t(audienceMode==='contraception'?'phase.low':'phase.outside');
  const rows=[
    {emoji:'🌸',label:t('phase.period'),value:shareRanges(days.filter(d=>d.info.status==='period')),color:'period'},
    {emoji:'🟠',label:t('phase.fertile'),value:shareRanges(days.filter(d=>d.info.isFertileWindow)),color:'fertile'},
    {emoji:'🔴',label:t('phase.ovulation'),value:calcParams.ovDay?shareRanges(days.filter(d=>d.info.isOvDay)):t('setup.irregular'),color:'ovulation'},
    {emoji:'🟢',label:lowLabel,value:shareRanges(days.filter(d=>d.info.status==='safe')),color:'safe'}
  ];
  const range=shareDate(days[0].iso,true)+' – '+shareDate(days.at(-1).iso,true);
  const mode=t('mode.'+audienceMode), note=t(audienceMode+'.note');
  const recorded=days[0].info.isRecordedStart ? t('phase.recorded')+': '+shareDate(days[0].iso,true) : '';
  const text=['📅 '+t('share.cycle'),range,'💬 '+mode,recorded? '✍️ '+recorded:'','',...rows.map(row=>row.emoji+' '+row.label+': '+row.value),'','ℹ️ '+note].filter((line,i,all)=>line!==''||all[i-1]!=='').join('\n');
  return {days,rows,range,mode,note,recorded,text,title:t('share.cycle'),summary:t('summary'),filename:'cycle-'+days[0].iso+'.png'};
}
function drawShareImage(result) {
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1620;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas unavailable');
  const font='"Huninn", "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
  const box=(x,y,w,h,r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
  const text=(value,x,y,size=28,color='#51464b',weight=400,maxWidth)=>{
    ctx.font=weight+' '+size+'px '+font;ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='top';
    if(maxWidth)ctx.fillText(value,x,y,maxWidth);else ctx.fillText(value,x,y);
  };
  // Grapheme wrapping handles CJK, Thai marks and Latin without clipping.
  const wrap=(value,width,size,weight=400)=>{
    ctx.font=weight+' '+size+'px '+font;
    const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(currentLanguage,{granularity:'grapheme'}).segment(value)].map(s=>s.segment):Array.from(value);
    const lines=[];let line='';
    for(const char of segments){if(line && ctx.measureText(line+char).width>width){lines.push(line);line=char;}else line+=char;}
    if(line)lines.push(line);return lines;
  };
  box(0,0,1080,1620,0,'#faf7f5');
  // The complete calendar occupies the upper 1080 × 1080 square.
  box(30,30,1020,1020,30,'#ffffff');
  text(result.title,64,60,38,'#513f48',600,950);
  text(result.range,64,116,28,'#76616c',400,950);
  const offset=new Date(result.days[0].iso+'T00:00:00').getDay();
  const rows=Math.ceil((offset+result.days.length)/7), gap=8, cellW=128, cellH=Math.min(119,Math.floor(744/rows)-gap);
  for(let col=0;col<7;col++){
    const weekday=localizedDate(new Date(2026,0,4+col),{weekday:'short'});
    text(weekday,64+col*136,181,23,'#76616c',400,120);
  }
  result.days.forEach((day,i)=>{
    const slot=offset+i,x=64+slot%7*136,y=225+Math.floor(slot/7)*(cellH+gap);
    const info=day.info,[bg,fg]=shareColors[info.status];
    box(x,y,cellW,cellH,15,bg);
    // Every date includes its month so month/year boundaries are unambiguous.
    text(shareDate(day.iso),x+12,y+cellH*.32,27,fg,500,104);
    if(info.isRecordedStart){ctx.strokeStyle=fg;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x+2,y+2,cellW-4,cellH-4,13);ctx.stroke();}
    if(info.status==='period' && info.isFertileWindow)box(x+12,y+cellH-12,cellW-24,4,2,shareColors.fertile[1]);
  });
  result.rows.forEach((row,i)=>{
    const x=64+i%2*480,y=971+Math.floor(i/2)*34;
    box(x,y+3,16,16,5,shareColors[row.color][0]);
    text(row.label,x+26,y,22,'#66535d',400,437);
  });
  text(result.summary,64,1090,32,'#513f48',600,950);
  text(result.mode,64,1132,23,'#76616c',400,950);
  // Four compact cards retain the full dates while fitting the 2:3 export.
  result.rows.forEach((row,i)=>{
    const x=64+(i%2)*484,y=1170+Math.floor(i/2)*151,w=468,h=137;
    const [bg,fg]=shareColors[row.color];
    box(x,y,w,h,20,bg);
    box(x+19,y+23,9,9,4,fg);
    const labels=wrap(row.label,w-65,22);
    let size=30,values;
    do {
      values=wrap(row.value,w-40,size,600);
      if(labels.length*27+values.length*size*1.25+38<=h)break;
      size--;
    } while(size>17);
    let lineY=y+18;
    for(const line of labels){text(line,x+38,lineY,22,fg);lineY+=27;}
    lineY+=8;
    for(const line of values){text(line,x+20,lineY,size,fg,600);lineY+=size*1.25;}
  });
  const footer=[...(result.recorded?[result.recorded]:[]),result.note];
  let size=23,wrapped;
  do {
    wrapped=footer.map(line=>wrap(line,950,size));
    if(wrapped.reduce((n,lines)=>n+lines.length,0)*size*1.5+footer.length*7<=112)break;
    size--;
  } while(size>16);
  let y=1482;
  for(const paragraph of wrapped){
    for(const line of paragraph){text(line,64,y,size,'#76616c');y+=size*1.5;}
    y+=7;
  }
  return canvas;
}
function setShareView(view) {
  shareView=view;
  document.getElementById('shareFeedback').textContent='';
  document.getElementById('shareImagePanel').classList.toggle('hidden',view!=='image');
  document.getElementById('shareTextPanel').classList.toggle('hidden',view!=='text');
  document.getElementById('shareImageTab').setAttribute('aria-pressed',String(view==='image'));
  document.getElementById('shareTextTab').setAttribute('aria-pressed',String(view==='text'));
}
async function openShare() {
  const result=buildShareResult();if(!result){notifyUser(t('setupFirst'));return;}
  const generation=++shareGeneration;
  try {
    const canvas=drawShareImage(result);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(generation!==shareGeneration)return;
    if(!blob)throw new Error('PNG unavailable');
    if(shareURL)URL.revokeObjectURL(shareURL);
    shareFile=new File([blob],result.filename,{type:'image/png'});
    shareURL=URL.createObjectURL(blob);
    document.getElementById('sharePreview').src=shareURL;
    document.getElementById('sharePlainText').value=result.text;
    setShareView('image');document.getElementById('shareDialog').showModal();
  } catch { notifyUser(t('share.failed')); }
}
function downloadShare() {
  if(!shareFile)return;
  const link=document.createElement('a');link.href=shareURL;link.download=shareFile.name;document.body.append(link);link.click();link.remove();
}
async function copyShare() {
  const field=document.getElementById('sharePlainText');
  try { await navigator.clipboard.writeText(field.value);document.getElementById('shareFeedback').textContent=t('share.copied'); }
  catch { field.focus();field.select();document.getElementById('shareFeedback').textContent=t('share.manual'); }
}
async function sendShare() {
  const data=shareView==='image'?{files:[shareFile]}:{text:document.getElementById('sharePlainText').value};
  if(!navigator.share || (shareView==='image' && (!shareFile || !navigator.canShare?.(data)))){document.getElementById('shareFeedback').textContent=t('share.unavailable');return;}
  try { await navigator.share(data); }
  catch(error){if(error.name!=='AbortError')document.getElementById('shareFeedback').textContent=t('share.unavailable');}
}
document.getElementById('shareCycleBtn').addEventListener('click',openShare);
document.getElementById('shareClose').addEventListener('click',()=>document.getElementById('shareDialog').close());
document.getElementById('shareDialog').addEventListener('close',()=>document.getElementById('shareCycleBtn').focus());
document.getElementById('shareImageTab').addEventListener('click',()=>setShareView('image'));
document.getElementById('shareTextTab').addEventListener('click',()=>setShareView('text'));
document.getElementById('shareDownload').addEventListener('click',downloadShare);
document.getElementById('shareCopy').addEventListener('click',copyShare);
document.getElementById('shareNative').addEventListener('click',sendShare);
