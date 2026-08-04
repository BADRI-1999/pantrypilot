// Minimal service worker for PantryIQ.
// Strategy:
//  - Precache the app shell so the UI opens offline.
//  - Navigations: network-first, fall back to cached shell when offline.
//  - Static assets (icons, _next static): cache-first.
//  - API calls (the backend): never cached here (always go to network).
const CACHE = 'pantryiq-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Don't intercept cross-origin API traffic — let it hit the network directly.
  if (url.origin !== self.location.origin) return;

  // The API and uploads are now proxied same-origin (/api/*, /uploads/*), but
  // they're live, mutable data — never treat them as cacheable static assets.
  // Without this, this SW would cache-first them just like a JS chunk and
  // serve stale data forever, ignoring every server Cache-Control header.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  // App navigations: network-first with offline shell fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Static assets: cache-first, then network.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }),
    ),
  );
});
