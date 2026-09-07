/* All languages are cached together, so switching also works offline. */
const CACHE_NAME = 'cycle-bbt-v4-guide-6';
const LANGUAGES = ['zh-TW', 'en', 'ja', 'ko', 'es', 'de', 'th', 'vi'];
const PRECACHE_URLS = [
  './locales/guide-emphasis.js',
  './404.html', './css/not-found.css', './js/not-found.js', './', './index.html', './manifest.json', './css/app.css',
  ...['i18n', 'cycle', 'storage', 'chart', 'pwa', 'purposes', 'app', 'events', 'region', 'share'].map(name => `./js/${name}.js`),
  ...LANGUAGES.flatMap(lang => [`./locales/${lang}.js`, `./locales/manifest.${lang}.json`]),
  './images/favicon.ico', './images/icon-96.png', './images/icon-192.png', './images/icon-512.png', './images/apple-touch-icon.png',
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('cycle-bbt-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (new URL(event.request.url).pathname === '/cdn-cgi/trace') return;
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (event.request.mode !== 'navigate') {
      const cached = await cache.match(event.request);
      return cached || fetch(event.request);
    }
    const url = new URL(event.request.url);
    const home = new URL('./', self.location.href).pathname;
    if (url.pathname === home || url.pathname === home + 'index.html') {
      return (await cache.match('./index.html')) || fetch(event.request);
    }
    return fetch(event.request);
  })());
});
