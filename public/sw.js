/* Elowen offline shell — small hand-rolled service worker.
 * Strategy: cache-first for same-origin build assets; network-first for pages;
 * never caches cross-origin CDN assets (tesseract.js/vosk load lazily).
 */
const VERSION = 'elowen-v1';
const CORE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== VERSION) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(event.request);
          const cache = await caches.open(VERSION);
          cache.put('./index.html', await fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(VERSION);
          return (await cache.match('./index.html')) ?? (await cache.match('./')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const fresh = await fetch(event.request);
        if (fresh.ok && fresh.type === 'basic') cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        return Response.error();
      }
    })(),
  );
});
