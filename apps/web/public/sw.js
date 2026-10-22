/*
 * ProofBridge service worker — caches the APP SHELL ONLY (prerendered route HTML and hashed
 * /_next/static assets) so the app opens offline. Vault data lives in IndexedDB and is never
 * fetched over HTTP, so no private data can end up in this cache. Anything that is not a
 * same-origin GET for a shell route or a static asset is passed straight to the network.
 */
const CACHE = "proofbridge-shell-v2";
const SHELL_ROUTES = ["/", "/evidence", "/opportunities", "/graph", "/plan", "/inbox", "/share"];
const SHELL_FILES = ["/icon.svg", "/manifest.webmanifest"];
const STATIC_PREFIX = "/_next/static/";

const assetsIn = (html) => [...new Set([...html.matchAll(/\/_next\/static\/[^"'\s)\\<>]+/g)].map((m) => m[0]))];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const route of SHELL_ROUTES) {
        const res = await fetch(route, { cache: "no-store", credentials: "omit" });
        if (!res.ok) continue;
        const html = await res.clone().text();
        await cache.put(route, res);
        await Promise.all(assetsIn(html).map((url) => cache.add(url).catch(() => undefined)));
      }
      await Promise.all(SHELL_FILES.map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("proofbridge-shell-") && n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

const shellRoute = (pathname) => {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return SHELL_ROUTES.includes(p) ? p : null;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build assets are immutable: cache-first.
  if (url.pathname.startsWith(STATIC_PREFIX)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(url.pathname);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) await cache.put(url.pathname, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Page loads of known shell routes: network-first, fall back to the cached shell offline.
  const route = shellRoute(url.pathname);
  if (req.mode === "navigate" && route) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res.ok) await cache.put(route, res.clone());
          return res;
        } catch {
          return (await cache.match(route)) ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (SHELL_FILES.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((hit) => hit ?? fetch(req)));
  }
});
