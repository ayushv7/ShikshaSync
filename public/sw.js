const CACHE_NAME = "shikshasync-v1";
const SHELL_URLS = [
  "/",
  "/teacher",
  "/learn/aarav",
  "/learn/kavya",
  "/learn/rohan",
  "/learn/meera",
  "/manifest.webmanifest",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  if (url.searchParams.has("_rsc")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          const cacheKey =
            request.mode === "navigate" ? url.pathname : request;
          caches.open(CACHE_NAME).then((c) => c.put(cacheKey, copy));
        }
        return res;
      })
      .catch(async () => {
        const exact = await caches.match(request);
        if (exact) return exact;
        const pathOnly = await caches.match(url.pathname);
        if (pathOnly) return pathOnly;
        return caches.match("/");
      })
  );
});
