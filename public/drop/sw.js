// Buzzyfly Monthly Drop service worker. Lets the installed app open offline.
// The app page is fetched from the network first, so a canceled subscription
// sees the locked page as soon as it's online. Saved work goes to /api/drop/data,
// which this worker never touches.
const CACHE = "bf-drop-v1";
const SHELL = "/drop/";
const STATIC = ["/drop/icon-192.png", "/drop/icon-512.png", "/drop/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bf-drop-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => (res.ok ? c.put(SHELL, copy) : c.delete(SHELL)));
          return res;
        })
        .catch(() => caches.match(SHELL).then((hit) => hit || new Response("You're offline. Connect to open the Monthly Drop for the first time.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }))),
    );
    return;
  }

  if (STATIC.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
