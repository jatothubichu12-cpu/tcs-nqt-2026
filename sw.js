// ============================================================
//  TCS NQT 2026 — Service Worker (Offline PWA Support)
//  Cache version: bump this string whenever you update files
// ============================================================
const CACHE_NAME = 'tcs-nqt-v1';

// Files to cache for offline use
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // Google Fonts (cached on first load, available offline after)
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap'
];

// ── INSTALL: cache all core files ──────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // activate immediately
});

// ── ACTIVATE: remove old caches ───────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // take control of all tabs immediately
});

// ── FETCH: serve from cache, fallback to network ──────────
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network and cache dynamically
      return fetch(event.request)
        .then(networkResponse => {
          // Only cache valid responses
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'opaque'
          ) {
            return networkResponse;
          }

          // Clone response (can only be consumed once)
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Network failed — return offline fallback for HTML requests
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
