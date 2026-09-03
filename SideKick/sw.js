// SideKick Service Worker

// âš ï¸ Bump this on every release so the new version takes effect for all users.
const CACHE_NAME = 'sidekick-v165';

// Files to cache on install â€” the core app shell (relative paths)
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// External Firebase/CDN URLs we do NOT cache â€” they must always be live
const NEVER_CACHE = [
  'firebaseio.com',
  'googleapis.com',
  'gstatic.com',
  'firebaseapp.com',
];

// â”€â”€ INSTALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// No skipWaiting here â€” the new worker waits so the page can
// confirm with the user before the update takes over.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE);
    })
  );
});

// â”€â”€ ACTIVATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// â”€â”€ MESSAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Page confirms the update â†’ activate the new worker so the reload picks it up.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// â”€â”€ FETCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always go to network for Firebase and external APIs
  const isLiveOnly = NEVER_CACHE.some(domain => url.includes(domain));
  if (isLiveOnly) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For page navigations, bypass the HTTP cache (GitHub Pages sends
  // Cache-Control: max-age=600) so we always get the latest HTML.
  const fetchOpts = event.request.mode === 'navigate' ? { cache: 'no-cache' } : {};

  // Network-first: try network, fall back to cache if offline
  event.respondWith(
    fetch(event.request, fetchOpts)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});













