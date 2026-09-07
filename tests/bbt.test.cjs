const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/cycle.js'),'utf8');
function setup(history=[]){
  const ctx=vm.createContext({Date,calcParams:{lpv:'2026-01-01',cLen:28},getHistory:()=>history,
    localISO:d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
    dOff:(d,n)=>{const c=new Date(d);c.setDate(c.getDate()+n);return c;}});
  vm.runInContext(source,ctx);return ctx;
}
const readings=Array.from({length:9},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,'0')}`,temp:i<6?36.3:36.6}));
test('six baseline days and three consecutive high days show a trend, not an ovulation date',()=>{
  const r=setup().analyzeBBT(readings,'2026-01-09');
  assert.equal(r.consecutiveHighDays,3);assert.equal(r.highTempStartDate,'2026-01-07');assert.equal(r.ovulationDate,null);
});
test('later readings do not confirm a past date',()=>assert.equal(setup().analyzeBBT(readings,'2026-01-08').consecutiveHighDays,0));
test('missing high day breaks the run',()=>assert.equal(setup().analyzeBBT(readings.filter(r=>r.date!=='2026-01-08'),'2026-01-09').consecutiveHighDays,0));
test('missing baseline day cannot be replaced with an older low reading',()=>assert.equal(setup().analyzeBBT(readings.filter(r=>r.date!=='2026-01-03'),'2026-01-09').consecutiveHighDays,0));
test('drop and stale last reading do not carry forward a trend',()=>{
  assert.equal(setup().analyzeBBT([...readings,{date:'2026-01-10',temp:36.2}],'2026-01-10').consecutiveHighDays,0);
  assert.equal(setup().analyzeBBT(readings,'2026-01-10').consecutiveHighDays,0);
});
test('a recorded next period starts a separate analysis',()=>assert.equal(setup([{date:'2026-01-08'}]).analyzeBBT(readings,'2026-01-09'),null));
test('no configured or recorded start yields no trend',()=>{const c=setup();c.calcParams=null;assert.equal(c.analyzeBBT(readings,'2026-01-09'),null);});
test('future measurements and previous cycle readings are excluded',()=>{
  const c=setup();assert.equal(c.cycleBBT([{date:'2099-01-01',temp:36.6},{date:'2025-12-31',temp:36.2}],'2099-01-01').length,0);
});
