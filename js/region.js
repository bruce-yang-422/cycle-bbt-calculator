/* Region changes local guidance, never the selected language or cycle calculation.
 * Cloudflare's same-origin trace works with proxied GitHub Pages custom domains.
 * Read only `loc`; never persist/log the response (it also contains the IP).
 */
let regionPreference = (() => {
  try {
    const value = localStorage.getItem('regionPreference');
    if (['auto', 'TW', 'global'].includes(value)) return value;
  } catch {}
  return 'auto';
})();
let detectedCountry = null;
let regionChecking = false;
let regionRequest = 0;
function isTaiwanRegion() {
  return regionPreference === 'TW' || (regionPreference === 'auto' && detectedCountry === 'TW');
}
function renderRegion() {
  const select = document.getElementById('regionSelect');
  if (!select) return;
  select.value = regionPreference;
  const state = regionPreference !== 'auto' ? (isTaiwanRegion() ? 'taiwan' : 'global')
    : regionChecking ? 'checking' : !detectedCountry ? 'unknown'
    : detectedCountry === 'TW' ? 'detectedTW' : 'detectedGlobal';
  document.getElementById('regionStatus').textContent = t('region.' + state);
  document.getElementById('taiwanHelp').classList.toggle('hidden', !isTaiwanRegion());
  document.getElementById('taiwanPurpose').textContent = t('tw.' + audienceMode);
}
async function detectRegion() {
  const request = ++regionRequest;
  detectedCountry = null;
  regionChecking = true;
  renderRegion();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch('/cdn-cgi/trace', {
      cache: 'no-store', credentials: 'omit', redirect: 'error',
      referrerPolicy: 'no-referrer', signal: controller.signal
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/plain')) return;
    const country = (await response.text()).match(/^loc=([A-Z]{2})\s*$/m)?.[1];
    if (request === regionRequest && country && country !== 'XX') detectedCountry = country;
  } catch { /* Static hosting, offline, timeout: keep generic guidance. */ }
  finally {
    clearTimeout(timeout);
    if (request === regionRequest) { regionChecking = false; renderRegion(); }
  }
}
function setRegion(value) {
  if (!['auto', 'TW', 'global'].includes(value)) return;
  regionPreference = value;
  ++regionRequest; // A late automatic response must not override a manual choice.
  regionChecking = false;
  try { localStorage.setItem('regionPreference', value); }
  catch { notifyUser(t('error.storage')); }
  renderRegion();
  if (value === 'auto') void detectRegion();
}
document.getElementById('regionSelect').addEventListener('change', event => setRegion(event.target.value));
renderRegion();
if (regionPreference === 'auto') void detectRegion();
