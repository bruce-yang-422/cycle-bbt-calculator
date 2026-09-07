const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const langs=['zh-TW','en','ja','ko','es','de','th','vi'];
const ctx=vm.createContext({window:{}});
for(const lang of langs)vm.runInContext(fs.readFileSync(path.join(root,'locales',lang+'.js'),'utf8'),ctx);
const catalogs=ctx.window.CYCLE_LOCALES;
test('eight complete catalogs with matching placeholders',()=>{
  const keys=Object.keys(catalogs.en).sort();
  for(const lang of langs){
    assert.deepEqual(Object.keys(catalogs[lang]).sort(),keys,lang);
    for(const key of keys){
      assert(catalogs[lang][key].trim(),`${lang}:${key}`);
      const params=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
      assert.deepEqual(params(catalogs[lang][key]),params(catalogs.en[key]),`${lang}:${key}`);
    }
  }
});
test('static translation keys and local assets exist',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const match of html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g))assert(catalogs.en[match[1]],match[1]);
  for(const match of html.matchAll(/(?:src|href)="((?:js|css|locales)\/[^"]+)"/g))assert(fs.existsSync(path.join(root,match[1])),match[1]);
  assert(!/<style\b|\sstyle=|\son(?:click|change|submit)=/.test(html));
});
test('localized manifests use one application identity and valid icons',()=>{
  for(const lang of langs){
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'locales','manifest.'+lang+'.json'),'utf8'));
    assert.equal(manifest.lang,lang);assert.equal(manifest.id,'../');
    for(const icon of manifest.icons)assert(fs.existsSync(path.join(root,'locales',icon.src)));
  }
});
test('404 loads actual language scripts, not the website root',()=>{
  const html=fs.readFileSync(path.join(root,'404.html'),'utf8');
  const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(scripts.length,10);
  for(const src of scripts){assert(src.endsWith('.js'),src);assert(fs.existsSync(path.join(root,src.slice(1))),src);}
});
