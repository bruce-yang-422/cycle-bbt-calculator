function drawBBTChart(data,result){
  const canvas=document.getElementById('bbtCanvas');
  const dpr=window.devicePixelRatio||1;
  const W=canvas.parentElement.clientWidth-34, H=200;
  if(W<=0)return;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const pts=[...data].sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  if(pts.length<2) return;
  const temps=pts.map(p=>p.temp);
  const minT=Math.min(...temps)-.1, maxT=Math.max(...temps)+.1;
  const PAD={l:38,r:12,t:14,b:26};
  const gW=W-PAD.l-PAD.r, gH=H-PAD.t-PAD.b;
  const xOf=i=>PAD.l+(i/(pts.length-1))*gW;
  const yOf=t=>PAD.t+gH-((t-minT)/(maxT-minT))*gH;

  // Grid
  ctx.strokeStyle='#f0e4e6'; ctx.lineWidth=0.5;
  ctx.fillStyle='#9a8085'; ctx.font='10px system-ui'; ctx.textAlign='right';
  for(let s=0;s<=4;s++){
    const t=minT+(maxT-minT)*(s/4), y=yOf(t);
    ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();
    ctx.fillText(formatNumber(t,2),PAD.l-4,y+3);
  }
  // Cover line
  const cl=result?.coverLine;
  if(cl&&cl>=minT&&cl<=maxT){
    ctx.strokeStyle='#e8637a';ctx.lineWidth=1;ctx.setLineDash([4,3]);
    const cy=yOf(cl);
    ctx.beginPath();ctx.moveTo(PAD.l,cy);ctx.lineTo(W-PAD.r,cy);ctx.stroke();
    ctx.setLineDash([]);ctx.fillStyle='#e8637a';ctx.textAlign='left';
    ctx.fillText(formatNumber(cl,2),PAD.l+4,cy-3);
  }
  // Line
  const hiD=result?.highTempStartDate;
  ctx.strokeStyle='#3d5afe';ctx.lineWidth=2;ctx.setLineDash([]);ctx.beginPath();
  pts.forEach((p,i)=>{
    const x=xOf(i),y=yOf(p.temp);
    const isH=hiD&&p.date>=hiD&&p.date<=localISO(new Date());
    if(i===0){ctx.moveTo(x,y);}
    else{
      const ph=hiD&&pts[i-1].date>=hiD;
      if(isH&&!ph){ctx.lineTo(x,y);ctx.stroke();ctx.beginPath();ctx.strokeStyle='#e74c3c';ctx.moveTo(x,y);}
      else ctx.lineTo(x,y);
    }
  });
  ctx.stroke();
  // Dots
  pts.forEach((p,i)=>{
    const x=xOf(i),y=yOf(p.temp);
    const isO=p.date===result?.ovulationDate;
    const isH=hiD&&p.date>=hiD&&p.date<=localISO(new Date());
    ctx.beginPath();ctx.arc(x,y,isO?5:3,0,Math.PI*2);
    ctx.fillStyle=isO?'#7c5cbf':isH?'#e74c3c':'#3d5afe';ctx.fill();
  });
  // X labels
  ctx.fillStyle='#9a8085';ctx.font='9px system-ui';ctx.textAlign='center';
  pts.forEach((p,i)=>{
    if(i%Math.max(1,Math.floor(pts.length/6))===0||i===pts.length-1){
      const d=new Date(p.date+'T00:00:00');
      ctx.fillText(localizedDate(d,{month:'numeric',day:'numeric'}),xOf(i),H-PAD.b+14);
    }
  });
}
