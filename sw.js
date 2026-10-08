// Service worker — cache the app shell so Mapownik opens instantly and
// works offline for the UI. Live data always goes to the network (never
// cached), since it must stay current and private.
const CACHE_NAME = "mapownik-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./config.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests for our own shell files.
  // Everything else (Supabase API, auth, storage, CDN scripts, fonts)
  // passes straight through to the network untouched.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (!SHELL_FILES.includes(url.pathname) && url.pathname !== "/" ) {
    // allow other same-origin static pages (privacy policy etc.) to just hit network
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
