const CACHE_VERSION = "scoopscream-v1";
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/about.html",
  "/menu.html",
  "/order.html",
  "/cart.html",
  "/account.html",
  "/agreement.html",
  "/payment.html",
  "/order-success.html",
  "/admin-login.html",
  "/admin.html",
  "/styles.css",
  "/app.js",
];

const EXTERNAL_ASSETS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
];

const isSupabaseRequest = (url) =>
  url.pathname.startsWith("/supabase/") || url.hostname.endsWith(".supabase.co");

const addToCache = async (cacheName, request, response) => {
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  return response;
};

const networkFirst = async (request, cacheName, fallbackUrl = "/index.html") => {
  try {
    const response = await fetch(request);
    if (response.ok) await addToCache(cacheName, request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const fallback = await caches.match(fallbackUrl);
    if (fallback) return fallback;

    throw error;
  }
};

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") await addToCache(cacheName, request, response);
  return response;
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") return addToCache(cacheName, request, response);
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await refresh;
  if (response) return response;

  throw new Error("Network unavailable and no cached asset found.");
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(PAGE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
      caches.open(ASSET_CACHE).then((cache) =>
        Promise.all(
          EXTERNAL_ASSETS.map((url) =>
            cache.add(new Request(url, { mode: "no-cors" })).catch(() => null)
          )
        )
      ),
    ])
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![PAGE_CACHE, ASSET_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isSupabaseRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  if (["image", "font"].includes(request.destination)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (["script", "style"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
  }
});
