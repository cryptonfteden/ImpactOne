// ImpactOne service worker — installable-PWA offline shell.
// Strategy: cache the app shell (HTML/JS/CSS/icons) so the app can open
// offline; never cache API responses, since financial data must always
// reflect a real fetch or an honest "unavailable" state, not a stale cache
// pretending to be live. Bump CACHE_VERSION to force old caches out.
const CACHE_VERSION = "impactone-shell-v2";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

// Sprint 34 — the hashed JS/CSS bundle filenames (e.g. /assets/index-
// AbC123.js) change every build and can't be hardcoded into this static
// sw.js. Worse, the very first page load's own script/link requests
// happen *before* this worker has registered and can intercept anything,
// so the opportunistic fetch-handler caching below never sees them
// either — leaving an offline reload with a cached index.html whose own
// script/style tags 404. Fix: fetch index.html during install and parse
// its real script/link src/href values, so the shell always caches
// whatever the current build actually references.
async function cacheAppShellAndBundle(cache) {
  await cache.addAll(APP_SHELL);
  const indexResponse = await fetch("/index.html");
  const html = await indexResponse.text();
  const assetUrls = new Set();
  const srcHrefPattern = /(?:src|href)="(\/assets\/[^"]+)"/g;
  let match;
  while ((match = srcHrefPattern.exec(html))) {
    assetUrls.add(match[1]);
  }
  await Promise.all(
    [...assetUrls].map((assetUrl) =>
      fetch(assetUrl)
        .then((response) => (response.ok ? cache.put(assetUrl, response) : null))
        .catch(() => null)
    )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cacheAppShellAndBundle(cache)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/v2/");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // API/data calls: always go to the network. Never serve a cached
  // financial response — a failed fetch must surface as a real failure
  // the UI can render an honest "unavailable" state for, not silently
  // fall back to old numbers.
  if (isApiRequest(url)) return;

  // Navigations: try network first so users get fresh content when
  // online, fall back to the cached shell only when the network is down.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html", { ignoreVary: true }))
    );
    return;
  }

  // Static assets (JS/CSS/icons): cache-first with a network fallback,
  // and opportunistically refresh the cache from a live response.
  event.respondWith(
    caches.match(event.request, { ignoreVary: true }).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
