const CACHE_NAME = 'cricket-score-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function staleWhileRevalidate(event, request) {
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const networkFetch = fetch(request).then(response => {
      cache.put(request, response.clone());
      return response;
    }).catch(() => undefined);
    return cached || networkFetch || fetch(request);
  })());
}

function cacheFirst(event, request) {
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request, { mode: 'no-cors' });
      // Response may be opaque; still cache for reuse
      cache.put(request, response.clone());
      return response;
    } catch (err) {
      return caches.match(request);
    }
  })());
}

function networkFirst(event, request) {
  event.respondWith((async () => {
    try {
      const preload = await event.preloadResponse;
      if (preload) return preload;
    } catch (_) {}
    try {
      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    } catch (err) {
      const cached = await caches.match(request);
      return cached || Response.error();
    }
  })());
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // App shell navigation
  if (request.mode === 'navigate') {
    return networkFirst(event, request);
  }

  const url = new URL(request.url);

  // Google Fonts stylesheets: SWR
  if (url.origin === 'https://fonts.googleapis.com') {
    return staleWhileRevalidate(event, request);
  }
  // Google Fonts files: cache-first
  if (url.origin === 'https://fonts.gstatic.com') {
    return cacheFirst(event, request);
  }

  if (url.origin === location.origin) {
    if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.startsWith('/icons/')) {
      return staleWhileRevalidate(event, request);
    }
  }

  // Default: pass-through
  return event.respondWith(fetch(request));
});
