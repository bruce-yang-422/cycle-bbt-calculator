function cycleBBT(data, asOf=localISO(new Date())){
  const starts=[...new Set([calcParams?.lpv,...getHistory().map(h=>h.date)].filter(Boolean))].sort();
  const start=starts.filter(d=>d<=asOf).at(-1);
  if(!start)return [];
  const next=starts.find(d=>d>start);
  const configuredEnd=calcParams?.lpv===start?localISO(dOff(new Date(start+'T00:00:00'),calcParams.cLen)):null;
  const today=localISO(new Date());
  return data.filter(d=>d.date>=start&&d.date<=asOf&&d.date<=today&&(!next||d.date<next)&&(!configuredEnd||d.date<configuredEnd));
}
function analyzeBBT(data, asOf=localISO(new Date())){
  const sorted=cycleBBT(data,asOf).sort((a,b)=>a.date.localeCompare(b.date));
  if(sorted.length<6)return null;
  const consecutive=(a,b)=>localISO(dOff(new Date(a+'T00:00:00'),1))===b;
  const result={coverLine:null,ovulationDate:null,highTempStartDate:null,consecutiveHighDays:0,sorted};
  // Compare each rise against its preceding six consecutive daily readings.
  // Missing dates or a drop end the run; old runs never carry forward.
  for(let i=6;i<sorted.length;i++){
    const baseline=sorted.slice(i-6,i);
    if(!baseline.every((p,j)=>j===0||consecutive(baseline[j-1].date,p.date))||!consecutive(baseline[5].date,sorted[i].date))continue;
    const cl=+(Math.max(...baseline.map(p=>p.temp))+0.05).toFixed(2);
    let j=i;
    while(j<sorted.length&&sorted[j].temp>=cl&&(j===i||consecutive(sorted[j-1].date,sorted[j].date)))j++;
    if(j===sorted.length&&j-i>=3&&sorted.at(-1).date===asOf){
      return {...result,coverLine:cl,highTempStartDate:sorted[i].date,consecutiveHighDays:j-i};
    }
  }
  return result;
}

function deriveHistory(records){
  if(!Array.isArray(records))return [];
  const dates=[...new Set(records.map(r=>r?.date).filter(date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date))].sort();
  return dates.map((date,i)=>({date,cycle:i+1<dates.length?(Date.parse(dates[i+1])-Date.parse(date))/86400000:null,nextDate:dates[i+1]||null})).reverse();
}
