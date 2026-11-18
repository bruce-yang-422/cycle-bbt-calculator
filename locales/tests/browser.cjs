const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { calculateDays } = require('../../src/cycle.ts');
const { catalogs } = require('../../src/i18n.ts');
const { buildShareResult } = require('../../src/share.ts');

const root = path.resolve(__dirname, '../../dist');
const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
const languages = ['zh-TW', 'en', 'ja', 'ko', 'es', 'de', 'th', 'vi'];
const modes = ['tracking', 'contraception', 'conception'];
const mainPages = ['calendar', 'bbt', 'history', 'emergency'];
const guideTitles = {
  tracking: 'guide.trackingTitle',
  contraception: 'guide.title',
  conception: 'guide.conceptionTitle',
};
const trace = '**/cdn-cgi/trace';

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader('Content-Type', contentTypes[path.extname(file)] || 'text/plain');
  response.end(fs.readFileSync(file));
});

async function goTo(page, name) {
  const mobile = page.locator('#nav-' + name);
  const deskControl = mainPages.indexOf(name) + 3;
  const desktop = page.locator('.desk-tabs [data-control="control-' + deskControl + '"]');
  await (await mobile.isVisible() ? mobile : desktop).click();
  await page.locator('#page-' + name).waitFor({ state: 'visible' });
}

async function cycleSnapshot(page) {
  return {
    settings: await page.evaluate(() => localStorage.getItem('cycleSettings')),
    days: await page.locator('#calGrid button[data-date]').evaluateAll((buttons) => buttons.map((button) => (
      [button.dataset.date, button.className, button.getAttribute('aria-pressed')]
    ))),
  };
}

async function checkLocalizedPages(page) {
  const before = await cycleSnapshot(page);
  assert(await page.locator('#languageSelect').isHidden());
  await page.setViewportSize({ width: 390, height: 844 });
  await goTo(page, 'emergency');

  for (const language of languages) {
    const copy = catalogs[language];
    await page.locator('#languageSelect').selectOption(language);
    assert.equal(await page.locator('html').getAttribute('lang'), language);
    for (const mode of modes) {
      const label = language + '/' + mode;
      await page.locator('#audienceSelect').selectOption(mode);
      assert.equal(await page.locator('#purposeGuideTitle').textContent(), copy[guideTitles[mode]]);
      const guide = page.locator('#purposeGuide');
      assert.equal((await guide.innerText()).includes(copy['help.ecTitle']), mode === 'contraception', label);
      await guide.locator('details').evaluateAll((items) => items.forEach((item) => { item.open = true; }));
      assert(await guide.locator('strong.guide-emphasis').count() > 0, label + ' emphasis');
      for (const item of await guide.locator('[data-topic]').all()) {
        const key = await item.getAttribute('data-topic');
        assert.equal(await item.locator('p').textContent(), copy[key], key);
      }

      for (const name of mainPages) {
        await goTo(page, name);
        for (const width of [320, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + '/' + name + '/' + width + ' overflow');
        }
        const visibleText = await page.locator('#page-' + name).evaluate((element) => {
          const copy = element.cloneNode(true);
          copy.querySelectorAll('select,.hidden,[hidden]').forEach((node) => node.remove());
          return copy.textContent;
        });
        assert(!/\{\w+\}|undefined|NaN/.test(visibleText), label + '/' + name + ' unresolved values');
        if (['en', 'ko', 'es', 'de', 'th', 'vi'].includes(language)) {
          assert(!/[\u3400-\u9fff]/.test(visibleText), label + '/' + name + ' untranslated Chinese');
        }
      }
    }
  }

  assert.deepEqual(await cycleSnapshot(page), before);
}

async function checkPeriodShortcut(page) {
  const settings = () => page.evaluate(() => JSON.parse(localStorage.getItem('cycleSettings')).values.lastPeriod);
  const before = await settings();
  await page.locator('[data-control="control-14"]').click();
  assert.equal(await settings(), '2026-01-31');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('periodHistory')).length), 1);
  assert.match(await page.locator('#calGrid button[data-date="2026-01-31"]').getAttribute('class'), /\bperiod\b/);
  await page.locator('#toast .toast-action').click();
  assert.equal(await settings(), before);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('periodHistory')).length), 0);
}

async function checkUnprotected(page) {
  await goTo(page, 'emergency');
  await page.locator('#languageSelect').selectOption('en');
  await page.locator('#audienceSelect').selectOption('contraception');
  await goTo(page, 'calendar');
  await page.locator('[data-control="control-34"]').click();
  await page.locator('#unprotectedDialog').waitFor({ state: 'visible' });

  await page.locator('#uDate').fill('2026-02-05');
  await page.locator('#unpSave').click();
  assert.equal(await page.locator('#uDateError').textContent(), catalogs.en['error.future']);

  // 72 hours from Jan 28 ends today (Jan 31); the 5-day windows are still open.
  await page.locator('#uDate').fill('2026-01-28');
  const deadlines = await page.locator('.unp-deadline').allTextContents();
  assert.equal(deadlines[0].trim(), catalogs.en['unp.lastDay']);
  assert.notEqual(deadlines[1].trim(), catalogs.en['unp.expired']);
  await page.locator('#unpSave').click();
  await page.locator('#unprotectedDialog').waitFor({ state: 'hidden' });
  assert((await page.locator('#unpReminder').innerText()).includes(catalogs.en['unp.cardEc']));
  await page.locator('[data-control="control-13"]').click();
  assert.equal(await page.locator('#calGrid [data-date="2026-01-28"] .cell-unp').count(), 1);
  assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('unprotectedLog'))), ['2026-01-28']);

  // Other purposes never see the feature or its markers.
  for (const mode of ['tracking', 'conception']) {
    await goTo(page, 'emergency');
    await page.locator('#audienceSelect').selectOption(mode);
    await goTo(page, 'calendar');
    assert.equal(await page.locator('[data-control="control-34"], #unpReminder, .cell-unp').count(), 0, mode);
  }

  await goTo(page, 'emergency');
  await page.locator('#audienceSelect').selectOption('contraception');
  await goTo(page, 'calendar');
  await page.locator('#unpReminder').click();
  await page.locator('#unpRemove').click();
  assert.equal(await page.locator('#unpReminder').count(), 0);
}

async function checkDraftAndRecords(page) {
  await goTo(page, 'calendar');
  await page.locator('.setup-btn').click();
  await page.locator('#cycleLength').fill('35');
  // The settings tab is mounted behind the form, so exercise its native change event.
  await page.locator('#languageSelect').selectOption('en', { force: true });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('#cycleLength').inputValue(), '35');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cycleSettings')).values.cycleLength), '28');
  await page.keyboard.press('Escape');
  await page.locator('#overlay.open').waitFor({ state: 'hidden' });

  await goTo(page, 'history');
  for (const date of ['2026-01-01', '2026-01-31']) {
    await page.locator('#hDate').fill(date);
    await page.locator('[data-control="control-18"]').click();
  }
  assert.equal(await page.locator('#histList li').count(), 2);
  assert.match(await page.locator('#histList').innerText(), /30 days/);

  await goTo(page, 'bbt');
  await page.locator('#bbtDate').fill('2026-01-03');
  for (const value of ['36.5', '36.6']) {
    await page.locator('#bbtTemp').fill(value);
    await page.locator('[data-control="control-16"]').click();
  }
  assert.equal(await page.locator('#bbtList li').count(), 1);
  assert.match(await page.locator('#bbtList').innerText(), /36\.60/);
  await page.locator('#bbtTemp').fill('99');
  await page.locator('[data-control="control-16"]').click();
  await page.locator('#bbtTempError').waitFor({ state: 'visible' });
}

async function expectRegionStatus(page, text) {
  await page.waitForFunction((expected) => document.getElementById('regionStatus')?.textContent === expected, text);
}

async function checkRegion(page) {
  const before = await cycleSnapshot(page);
  await goTo(page, 'emergency');
  await page.locator('#languageSelect').selectOption('vi');
  const select = page.locator('#regionSelect');
  const details = page.locator('#taiwanHelp');
  const respond = (body) => (route) => route.fulfill({ contentType: 'text/plain', body });

  await page.route(trace, respond('loc=TW\n'));
  await select.selectOption('auto');
  await expectRegionStatus(page, catalogs.vi['region.detectedTW']);
  assert(await details.isVisible());
  assert.equal(await page.locator('html').getAttribute('lang'), 'vi');
  for (const language of languages) {
    await page.locator('#languageSelect').selectOption(language);
    for (const mode of modes) {
      await page.locator('#audienceSelect').selectOption(mode);
      assert.equal(await page.locator('#taiwanPurpose').textContent(), catalogs[language]['tw.' + mode]);
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), language + '/' + mode + ' region overflow');
      }
    }
  }

  for (const body of ['loc=US\n', 'loc=XX\n', 'colo=TPE\n']) {
    await page.unroute(trace);
    await page.route(trace, respond(body));
    await select.selectOption('auto');
    const key = body.includes('loc=US') ? 'region.detectedGlobal' : 'region.unknown';
    await expectRegionStatus(page, catalogs.vi[key]);
    assert(await details.isHidden());
  }

  await page.unroute(trace);
  let releaseResponse;
  const pendingResponse = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route(trace, async (route) => {
    await pendingResponse;
    await respond('loc=TW\n')(route).catch(() => {});
  });
  await select.selectOption('auto');
  await expectRegionStatus(page, catalogs.vi['region.checking']);
  await select.selectOption('global');
  releaseResponse();
  await page.unrouteAll({ behavior: 'wait' });
  await expectRegionStatus(page, catalogs.vi['region.global']);
  assert(await details.isHidden());

  await select.selectOption('TW');
  await page.locator('#languageSelect').selectOption('en');
  assert.deepEqual(await cycleSnapshot(page), before);
}

async function checkOffline(context, page) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert(await page.locator('#audienceDialog').isHidden());
  await goTo(page, 'emergency');
  assert.equal(await page.locator('#languageSelect').inputValue(), 'en');

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await goTo(page, 'emergency');
  assert.equal(await page.locator('#regionSelect').inputValue(), 'TW');
  for (const language of languages) {
    await page.locator('#languageSelect').selectOption(language);
    assert.equal(await page.locator('html').getAttribute('lang'), language);
    assert(await page.locator('#taiwanHelp').isVisible());
    assert.match(await page.locator('link[rel="manifest"]').getAttribute('href'), new RegExp('manifest\\.' + language + '\\.json$'));
  }
  await page.locator('#regionSelect').selectOption('auto');
  await expectRegionStatus(page, catalogs.vi['region.unknown']);
  assert(await page.locator('#taiwanHelp').isHidden());
}

async function applyCycle(page, start, type = 'regular') {
  await goTo(page, 'calendar');
  await page.locator('.setup-btn').click();
  await page.locator('#rp-' + type).click();
  await page.locator('#lastPeriod').fill(start);
  if (type === 'irregular') {
    await page.locator('#minLength').fill('45');
    await page.locator('#maxLength').fill('50');
    await page.locator('#periodLength').fill('10');
  } else {
    await page.locator('#cycleLength').fill('28');
    await page.locator('#periodLength').fill('5');
  }
  await page.locator('[data-control="control-30"]').click();
  await page.locator('#overlay.open').waitFor({ state: 'hidden' });
}

async function shareText(page, widths = []) {
  await page.locator('#shareCycleBtn').click();
  await page.waitForFunction(() => (
    document.getElementById('shareDialog')?.open && document.getElementById('sharePreview')?.naturalWidth === 1080
  ));
  assert.equal(await page.locator('#sharePreview').evaluate((image) => image.naturalHeight), 1620);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.locator('#shareDialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth));
  }
  await page.locator('#shareTextTab').click();
  return page.locator('#sharePlainText').inputValue();
}

async function expectedRange(page, language, start, end) {
  return page.evaluate(({ language, start, end }) => {
    const format = new Intl.DateTimeFormat(language, { calendar: 'gregory', year: 'numeric', month: 'numeric', day: 'numeric' });
    return [start, end].map((date) => format.format(new Date(date + 'T00:00:00'))).join(' – ');
  }, { language, start, end });
}

async function checkNativeShare(page, text) {
  await page.evaluate(() => {
    navigator.share = async (data) => { window.testSharedPayload = data; };
    navigator.canShare = () => true;
    navigator.clipboard.writeText = async () => { throw new Error('denied'); };
  });
  await page.locator('#shareNative').click();
  assert.equal(await page.evaluate(() => window.testSharedPayload.text), text);
  await page.locator('#shareCopy').click();
  assert.equal(await page.locator('#shareFeedback').textContent(), catalogs['zh-TW']['share.manual']);
  await page.locator('#shareImageTab').click();
  await page.locator('#shareNative').click();
  assert.equal(await page.evaluate(() => window.testSharedPayload.files[0].type), 'image/png');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#shareDownload').click()]);
  const data = fs.readFileSync(await download.path());
  assert.equal(data.readUInt32BE(16), 1080);
  assert.equal(data.readUInt32BE(20), 1620);
}

async function checkShare(page) {
  const crossYearStart = '2026-12-20';
  const crossYearEnd = '2027-02-07';
  const crossYear = calculateDays({
    lpv: crossYearStart, cLen: 50, pd: 10, ovDay: null, startD: 27, endD: 39,
  }, [], [], '2026-01-31');
  const crossYearShare = buildShareResult(crossYear, 'tracking', false);
  assert.equal(crossYearShare.days.length, 50);
  assert.equal(crossYearShare.days[0].iso, crossYearStart);
  assert.equal(crossYearShare.days.at(-1).iso, crossYearEnd);

  await applyCycle(page, crossYearStart, 'irregular');
  await page.locator('[data-control="control-13"]').click();
  assert.match(await page.locator('#calGrid button[data-date]').first().getAttribute('data-date'), /^2026-01-/);
  for (const language of languages) {
    await goTo(page, 'emergency');
    await page.locator('#languageSelect').selectOption(language);
    const range = await expectedRange(page, language, crossYearStart, crossYearEnd);
    for (const mode of modes) {
      await goTo(page, 'emergency');
      await page.locator('#audienceSelect').selectOption(mode);
      await goTo(page, 'calendar');
      const text = await shareText(page, [320, 768]);
      assert.equal(text.split('\n')[1], range);
      assert(text.includes(catalogs[language][mode + '.note']));
      assert(!/\*\*|^#{1,6} |\x60{3}/m.test(text));
      if (language === 'zh-TW' && mode === 'contraception') await checkNativeShare(page, text);
      await page.keyboard.press('Escape');
      await page.locator('#shareDialog').waitFor({ state: 'hidden' });
    }
  }

  // A known next period bounds a 35-day estimate at the 30 recorded days.
  await goTo(page, 'emergency');
  await page.locator('#languageSelect').selectOption('en');
  await goTo(page, 'calendar');
  await page.locator('.setup-btn').click();
  await page.locator('#rp-regular').click();
  await page.locator('#lastPeriod').fill('2026-01-01');
  await page.locator('#cycleLength').fill('35');
  await page.locator('[data-control="control-30"]').click();
  const complete = await shareText(page);
  assert.equal(complete.split('\n')[1], await expectedRange(page, 'en', '2026-01-01', '2026-01-30'));
  await page.keyboard.press('Escape');
  await page.locator('.setup-btn').click();
  await page.locator('#lastPeriod').fill('2025-01-01');
  await page.keyboard.press('Escape');
  assert.equal(await shareText(page), complete);
  await page.keyboard.press('Escape');

  const leapStart = '2028-02-20';
  const leapDates = calculateDays({
    lpv: leapStart, cLen: 28, pd: 5, ovDay: 14, startD: 9, endD: 16,
  }, [], [], '2026-01-31');
  const leapShare = buildShareResult(leapDates, 'tracking', true);
  assert.equal(leapShare.days.length, 28);
  assert(leapShare.days.some(({ iso }) => iso === '2028-02-29'));
  await applyCycle(page, leapStart);
  assert.equal((await shareText(page)).split('\n')[1], await expectedRange(page, 'en', leapStart, '2028-03-18'));
  await page.keyboard.press('Escape');
}

async function main() {
  assert(fs.existsSync(path.join(root, 'index.html')), 'Build the site before running browser tests.');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Asia/Taipei' });
    await context.route('https://fonts.googleapis.com/**', (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-01-31T04:00:00Z'));

    await page.goto(origin + '/?lang=zh-TW', { waitUntil: 'domcontentloaded' });
    await page.locator('#audienceDialog').waitFor({ state: 'visible' });
    await page.locator('#initialLanguage').selectOption('de');
    assert.equal(await page.locator('html').getAttribute('lang'), 'de');
    await page.locator('#audienceDialog [data-mode="conception"]').click();
    await page.locator('#audienceDialog').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => localStorage.getItem('audienceMode')), 'conception');
    await page.locator('#startCard button').click();
    await page.locator('#lastPeriod').fill('2026-01-01');
    await page.locator('[data-control="control-30"]').click();
    await checkPeriodShortcut(page);
    await page.locator('#calGrid button[data-date="2026-01-14"]').click();

    await checkLocalizedPages(page);
    await checkDraftAndRecords(page);
    await checkRegion(page);
    await checkOffline(context, page);
    await checkShare(page);
    await checkUnprotected(page);

    await context.setOffline(false);
    await page.goto(origin + '/404.html?lang=ja', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('h1').textContent(), catalogs.ja['notFound.title']);
    const homeURL = new URL(await page.locator('#homeLink').getAttribute('href'), page.url());
    assert.equal(homeURL.href, origin + '/?lang=ja');
    assert.deepEqual(errors, []);
    console.log('PASS: 8 languages × 3 purposes × 4 pages × 3 widths; persistence, drafts, history, BBT, regional guidance, offline, localized 404, PNG/text export and sharing.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => server.close());
