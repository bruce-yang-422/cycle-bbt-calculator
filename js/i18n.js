/* Local, offline-ready language catalogs. No translation service or data upload. */
const supportedLanguages = ['zh-TW', 'en', 'ja', 'ko', 'es', 'de', 'th', 'vi'];
function resolveLanguage(value) {
  if (supportedLanguages.includes(value)) return value;
  const base = String(value || '').toLowerCase().split('-')[0];
  return base === 'zh' ? 'zh-TW' : supportedLanguages.includes(base) ? base : null;
}
let currentLanguage = (() => {
  const url = resolveLanguage(new URL(location.href).searchParams.get('lang'));
  let saved;
  try { saved = resolveLanguage(localStorage.getItem('language')); } catch {}
  return url || saved || resolveLanguage(navigator.language) || 'en';
})();
function t(key, values = {}) {
  const text = window.CYCLE_LOCALES[currentLanguage]?.[key] ?? window.CYCLE_LOCALES.en[key];
  if (text === undefined) throw new Error('Missing translation: ' + key);
  return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}
function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat(currentLanguage, {minimumFractionDigits: digits, maximumFractionDigits: digits}).format(value);
}
function localizedDate(date, options = {month:'numeric', day:'numeric', weekday:'short'}) {
  return new Intl.DateTimeFormat(currentLanguage, {calendar:'gregory', ...options}).format(date);
}
function translatePage() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelectorAll('.language-select').forEach(el => el.value = currentLanguage);
  document.querySelectorAll('.cal-wd').forEach((el, i) => el.textContent = localizedDate(new Date(2026, 0, 4 + i), {weekday:'short'}));
  document.title = t('app.name');
  document.querySelector('link[rel=manifest]').href='locales/manifest.'+currentLanguage+'.json';
  document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"],meta[name="apple-mobile-web-app-title"]').forEach(el=>el.content=t('app.name'));
  const ld=document.querySelector('script[type="application/ld+json"]');
  if(ld){const schema=JSON.parse(ld.textContent);schema.name=t('app.name');schema.description=t('app.subtitle');schema.inLanguage=currentLanguage;ld.textContent=JSON.stringify(schema);}
  document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').forEach(el => el.content=t('app.subtitle'));
}
function setLanguage(language) {
  if (!supportedLanguages.includes(language)) return;
  currentLanguage = language;
  try {
    localStorage.setItem('language', language);
    const url = new URL(location.href); url.searchParams.set('lang', language);
    history.replaceState(null, '', url);
  } catch {}
  translatePage();
  // Re-render derived copy only. Never recalculate from an unfinished settings form.
  clearFieldErrors();
  document.getElementById('toast').classList.add('hidden');
  renderCal(); renderHistory(); renderBBT(); renderOverview();
  setAudience(audienceMode, false); previewInitialAudience();
  if (typeof renderRegion === 'function') renderRegion();
  if (!document.getElementById('installHelp').classList.contains('hidden')) updateInstallHelp();
  if (!document.getElementById('installBanner').classList.contains('hidden')) updateInstallBanner();
}
