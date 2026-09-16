// Minimal shell service worker.
//
// Its only job is to satisfy Chrome's installability check for the TWA and to
// show a branded offline page instead of the browser's default error page.
// It deliberately does NOT cache anything dynamic: event pages, manage pages
// and API calls always hit the network. Caching an /e/ or /m/ page would risk
// serving stale (or wrong) encrypted content, and caching /api/ would risk a
// stale create/update/delete response.

const CACHE_NAME = 'tagor-shell-v1';
const SHELL_ASSETS = [
  '/offline.html',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/site.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept live content: event/manage pages and API calls pass
  // straight through to the network, untouched.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/e/') ||
    url.pathname.startsWith('/m/') ||
    url.pathname.startsWith('/nuevo') ||
    url.pathname.startsWith('/en/nuevo')
  ) {
    return;
  }

  // Page navigations: try the network first, fall back to the offline page.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // The small fixed set of shell assets: cache-first.
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  }
});
