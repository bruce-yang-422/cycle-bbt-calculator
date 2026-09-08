const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/storage.js'),'utf8');
function setup({confirm=true,fail=false}={}){
  const keys=['periodHistory','bbtData','cycleSettings','audienceMode','language','regionPreference','installBannerDismissed'];
  const data=new Map([...keys,'unrelatedApp'].map(key=>[key,'saved']));
  const redirects=[],messages=[];
  const ctx=vm.createContext({URL,confirm:()=>confirm,t:key=>key,notifyUser:message=>messages.push(message),
    localStorage:{removeItem(key){if(fail)throw new Error('Storage blocked');data.delete(key);}},
    location:{href:'https://example.com/app/?lang=ja&other=1',replace:url=>redirects.push(url)}});
  vm.runInContext(source,ctx);
  return {ctx,data,redirects,messages};
}
test('reset deletes all app records and preferences and removes the URL language override',()=>{
  const s=setup();s.ctx.resetAllData();
  assert.deepEqual([...s.data.keys()],['unrelatedApp']);
  assert.deepEqual(s.redirects,['https://example.com/app/?other=1']);
  assert.deepEqual(s.messages,[]);
});
test('canceling reset leaves data and page intact',()=>{
  const s=setup({confirm:false});const before=[...s.data];s.ctx.resetAllData();
  assert.deepEqual([...s.data],before);assert.deepEqual(s.redirects,[]);
});
test('storage failure reports incomplete deletion without redirecting',()=>{
  const s=setup({fail:true});s.ctx.resetAllData();
  assert.deepEqual(s.redirects,[]);assert.deepEqual(s.messages,['reset.failed']);
});
