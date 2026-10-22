/* Elowen offline shell ("install as app") — hand-rolled service worker.
 *
 * - Precaches the shell and every hashed build asset discovered in index.html
 *   at install time, so the whole app works on the first unlock-airplane.
 * - Network-first for document navigations with a cache fallback.
 * - Cache-first for same-origin assets (hashed filenames = immutable).
 * - Cache-first for cross-origin GETs into elowen-cdn: this is how engine
 *   scripts and downloaded assets are reused without refetching. Requests made
 *   inside third-party blob workers can bypass this cache; the browser's HTTP
 *   cache still applies to them.
 * - Never respond with invented content: a miss is an error, not a fake page.
 */
const VERSION = 'elowen-v1.0.0';
const CORE = ['./', './index.html'];
const CDN_CACHE = 'elowen-cdn';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(CORE);
      // Discover the hashed assets actually referenced by the built index.
      try {
        const res = await fetch('./', { cache: 'reload' });
        const html = await res.text();
        const urls = new Set();
        for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
          const raw = m[1];
          if (!/^(https?:)?\/\//.test(raw) && !raw.startsWith('data:')) urls.add(new URL(raw, self.registration.scope).href);
        }
        await Promise.all([...urls].map((u) => cache.add(u)));
      } catch {
        /* offline install: runtime cache-first below still fills it on use */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== VERSION && key !== CDN_CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Documents: network-first with cache fallback.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/' || url.pathname === './') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(VERSION);
          cache.put('./index.html', fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(VERSION);
          return (await cache.match('./index.html')) ?? (await cache.match('./')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Same-origin assets: cache-first (hashed build output is immutable).
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200 && fresh.type === 'basic') cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return Response.error();
        }
      })(),
    );
    return;
  }

  // Cross-origin GETs (CDN engines + model files): cache-first into elowen-cdn.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CDN_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      // opaque/no-cors responses carry status 0 but can still be cached
      cache.put(req, fresh.clone()).catch(() => undefined);
      return fresh;
    })(),
  );
});
