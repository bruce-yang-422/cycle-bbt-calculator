/* npm install && npx playwright install chromium && npm run test:browser */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch();
  try{
    const context=await browser.newContext({locale:'en-US',timezoneId:'Asia/Taipei'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/?lang=zh-TW');
    assert(await page.locator('#audienceDialog').isVisible());
    await page.locator('#initialLanguage').selectOption('de');
    assert.equal(await page.locator('html').getAttribute('lang'),'de');
    await page.locator('#initialAudience').selectOption('conception');
    await page.locator('#audienceDialog button[type=submit]').click();
    await page.locator('#startCard button').click();
    await page.locator('#lastPeriod').fill('2026-01-01');
    await page.locator('.sheet .btn-primary').click();
    await page.evaluate(()=>selectDate('2026-01-14'));
    const before=await page.evaluate(()=>JSON.stringify({calcParams,selectedDate,dayMap}));
    assert(await page.locator('#languageSelect').isHidden());
    await page.setViewportSize({width:390,height:844});
    await page.locator('#nav-emergency').click();
    assert(await page.locator('#languageSelect').isVisible());
    for(const lang of ['zh-TW','en','ja','ko','es','de','th','vi']){
      await page.locator('#languageSelect').selectOption(lang);
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      for(const mode of ['tracking','contraception','conception']){
        await page.locator('#audienceSelect').selectOption(mode);
        const guide=await page.locator('#purposeGuide').innerText();
        const emergency=await page.evaluate(()=>t('help.ecTitle'));
        assert.equal(guide.includes(emergency),mode==='contraception',`${lang}/${mode} emergency guidance`);
        const expectedTitle={tracking:'guide.trackingTitle',contraception:'guide.title',conception:'guide.conceptionTitle'}[mode];
        assert.equal(await page.locator('#purposeGuideTitle').textContent(),await page.evaluate(key=>t(key),expectedTitle));
        await page.locator('#purposeGuide details').evaluateAll(items=>items.forEach(item=>item.open=true));
        assert(await page.locator('#purposeGuide strong.guide-emphasis').count()>0,`${lang}/${mode} emphasis`);
        for(const item of await page.locator('#purposeGuide [data-topic]').all()){
          const key=await item.getAttribute('data-topic');
          assert.equal(await item.locator('p').textContent(),await page.evaluate(key=>t(key),key));
        }
        for(const name of ['calendar','bbt','history','emergency']){
          await page.evaluate(n=>gotoPage(n),name);
          for(const width of [320,768,1440]){
            await page.setViewportSize({width,height:900});
            assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lang}/${mode}/${name}/${width} overflow`);
          }
          const text=await page.locator('#page-'+name).evaluate(el=>{
            const copy=el.cloneNode(true);
            copy.querySelectorAll('select,.hidden').forEach(node=>node.remove());
            return copy.textContent;
          });
          assert(!/\{\w+\}|undefined|NaN/.test(text),`${lang}/${name} unresolved values`);
          if(['en','ko','es','de','th','vi'].includes(lang))assert(!/[\u3400-\u9fff]/.test(text),`${lang}/${name} untranslated Chinese`);
        }
      }
    }
    assert.equal(await page.evaluate(()=>JSON.stringify({calcParams,selectedDate,dayMap})),before);
    // A language change must not apply unfinished settings.
    await page.evaluate(()=>gotoPage('calendar'));await page.locator('.setup-btn').click();
    await page.locator('#cycleLength').fill('35');await page.evaluate(()=>setLanguage('en'));
    assert.equal(await page.locator('#cycleLength').inputValue(),'35');
    assert.equal(await page.evaluate(()=>calcParams.cLen),28);await page.keyboard.press('Escape');
    // Date-derived history and BBT updates remain usable in translated UIs.
    await page.evaluate(()=>gotoPage('history'));
    for(const date of ['2026-01-01','2026-01-31']){await page.locator('#hDate').fill(date);await page.locator('#page-history .btn-primary').click();}
    assert.equal(await page.evaluate(()=>getHistory()[1].cycle),30);
    await page.evaluate(()=>gotoPage('bbt'));await page.locator('#bbtDate').fill('2026-01-03');await page.locator('#bbtTemp').fill('36.5');await page.locator('.bbt-entry button').click();
    await page.locator('#bbtTemp').fill('36.6');await page.locator('.bbt-entry button').click();assert.equal(await page.locator('#bbtList li').count(),1);
    await page.locator('#bbtTemp').fill('99');await page.locator('.bbt-entry button').click();assert(await page.locator('#bbtTempError').isVisible());
    // Country is independent of language and must never alter cycle state.
    const cycleBeforeRegion=await page.evaluate(()=>JSON.stringify({calcParams,selectedDate,dayMap}));
    await page.route('**/cdn-cgi/trace',route=>route.fulfill({contentType:'text/plain',body:'loc=TW\n'}));
    await page.evaluate(()=>{setLanguage('vi');setRegion('auto');gotoPage('emergency');});
    await page.waitForFunction(()=>!regionChecking);
    assert(await page.locator('#taiwanHelp').isVisible());
    assert.equal(await page.locator('html').getAttribute('lang'),'vi');
    for(const lang of ['zh-TW','en','ja','ko','es','de','th','vi']){
      await page.evaluate(lang=>setLanguage(lang),lang);
      for(const mode of ['tracking','contraception','conception']){
        await page.evaluate(mode=>setAudience(mode,false),mode);
        assert.equal(await page.locator('#taiwanPurpose').textContent(),await page.evaluate(mode=>t('tw.'+mode),mode));
        for(const width of [320,768,1440]){
          await page.setViewportSize({width,height:900});
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lang}/${mode} regional overflow`);
        }
      }
    }
    for(const body of ['loc=US\n','loc=XX\n','colo=TPE\n']){
      await page.unroute('**/cdn-cgi/trace');
      await page.route('**/cdn-cgi/trace',route=>route.fulfill({contentType:'text/plain',body}));
      await page.evaluate(()=>setRegion('auto'));await page.waitForFunction(()=>!regionChecking);
      assert(await page.locator('#taiwanHelp').isHidden());
    }
    await page.unroute('**/cdn-cgi/trace');
    await page.route('**/cdn-cgi/trace',async route=>{
      await new Promise(resolve=>setTimeout(resolve,100));
      await route.fulfill({contentType:'text/plain',body:'loc=TW\n'});
    });
    await page.evaluate(()=>{setRegion('auto');setRegion('global');});
    await page.waitForTimeout(180);
    assert(await page.locator('#taiwanHelp').isHidden());
    await page.unroute('**/cdn-cgi/trace');
    await page.evaluate(()=>{setRegion('TW');setLanguage('en');});
    assert.equal(await page.evaluate(()=>JSON.stringify({calcParams,selectedDate,dayMap})),cycleBeforeRegion);
    // Save, reload, and switch all languages offline.
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await page.reload();assert(await page.locator('#audienceDialog').isHidden());
    assert.equal(await page.locator('#languageSelect').inputValue(),'en');
    await context.setOffline(true);await page.reload();
    assert.equal(await page.locator('#regionSelect').inputValue(),'TW');
    await page.evaluate(()=>gotoPage('emergency'));
    for(const lang of ['zh-TW','en','ja','ko','es','de','th','vi']){
      await page.locator('#languageSelect').selectOption(lang);await page.evaluate(()=>gotoPage('emergency'));
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      assert(await page.locator('#taiwanHelp').isVisible());
    }
    await page.evaluate(()=>setRegion('auto'));await page.waitForFunction(()=>!regionChecking);
    assert(await page.locator('#taiwanHelp').isHidden());
    assert.equal(await page.locator('#regionStatus').textContent(),await page.evaluate(()=>t('region.unknown')));
    // Export a maximum-length, cross-year cycle while viewing an unrelated month.
    await page.evaluate(()=>{
      setCycleType('irregular');
      document.getElementById('lastPeriod').value='2026-12-20';
      document.getElementById('minLength').value='45';
      document.getElementById('maxLength').value='50';
      document.getElementById('periodLength').value='10';
      calculate();calYear=2025;calMonth=0;renderCal();gotoPage('calendar');
    });
    for(const lang of ['zh-TW','en','ja','ko','es','de','th','vi']){
      for(const mode of ['tracking','contraception','conception']){
        await page.evaluate(({lang,mode})=>{setLanguage(lang);setAudience(mode,false);},{lang,mode});
        const result=await page.evaluate(()=>buildShareResult());
        assert.equal(result.days.length,50);assert.equal(result.days[0].iso,'2026-12-20');assert.equal(result.days.at(-1).iso,'2027-02-07');
        assert(!/\*\*|^#{1,6} |```/m.test(result.text));assert(result.text.includes(result.note));
        await page.locator('#shareCycleBtn').click();
        await page.waitForFunction(()=>document.getElementById('shareDialog').open && document.getElementById('sharePreview').naturalWidth===1080);
        assert.equal(await page.locator('#sharePreview').evaluate(img=>img.naturalHeight),1620);
        for(const width of [320,768]){
          await page.setViewportSize({width,height:900});
          assert(await page.locator('#shareDialog').evaluate(el=>el.scrollWidth<=el.clientWidth));
        }
        await page.locator('#shareTextTab').click();
        assert.equal(await page.locator('#sharePlainText').inputValue(),result.text);
        if(lang==='zh-TW' && mode==='contraception'){
          await page.evaluate(()=>{
            navigator.share=async data=>{window.testSharedPayload=data;};
            navigator.canShare=()=>true;
          });
          await page.locator('#shareNative').click();
          assert.equal(await page.evaluate(()=>window.testSharedPayload.text),result.text);
          await page.locator('#shareImageTab').click();await page.locator('#shareNative').click();
          assert.equal(await page.evaluate(()=>window.testSharedPayload.files[0].type),'image/png');
          await page.locator('#shareTextTab').click();
          await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('denied');};});
          await page.locator('#shareCopy').click();
          assert.equal(await page.locator('#shareFeedback').textContent(),await page.evaluate(()=>t('share.manual')));
          const [download]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>downloadShare())]);
          const data=fs.readFileSync(await download.path());
          assert.equal(data.readUInt32BE(16),1080);assert.equal(data.readUInt32BE(20),1620);
          fs.writeFileSync(path.join(require('node:os').tmpdir(),'cycle-share-preview.png'),data);
        }
        await page.keyboard.press('Escape');
      }
    }
    // A known following period bounds the export, and draft inputs cannot change it.
    await page.evaluate(()=>{document.getElementById('lastPeriod').value='2026-01-01';calculate();});
    assert.equal(await page.evaluate(()=>buildShareResult().days.at(-1).iso),'2026-01-30');
    const exportBefore=await page.evaluate(()=>buildShareResult().text);
    await page.evaluate(()=>{document.getElementById('lastPeriod').value='2025-01-01';});
    assert.equal(await page.evaluate(()=>buildShareResult().text),exportBefore);
    await page.evaluate(()=>{
      setCycleType('regular');document.getElementById('cycleLength').value='28';
      document.getElementById('lastPeriod').value='2028-02-20';calculate();
    });
    const leapResult=await page.evaluate(()=>buildShareResult());
    assert.equal(leapResult.days.length,28);assert.equal(leapResult.days.at(-1).iso,'2028-03-18');
    assert(leapResult.days.some(day=>day.iso==='2028-02-29'));
    assert.deepEqual(errors,[]);
    console.log('PASS: 8 languages × 3 purposes × 4 pages × 3 widths; persistence, drafts, history, BBT, offline; 2:3 PNG/text export, cross-year/leap dates, sharing payloads and clipboard fallback.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
