// Racha Contas: guarda o app em cache para abrir sem internet.
const CACHE = "racha-contas-v2";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Página e arquivos do app: rede primeiro (pega a versão nova), cache se estiver offline.
// Fontes e outros arquivos externos: cache primeiro.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (sameOrigin) {
        try {
          const res = await fetch(e.request, { cache: "no-cache" });
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        } catch (err) {
          return (await cache.match(e.request, { ignoreSearch: true })) || (await cache.match("index.html")) || Response.error();
        }
      }
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone());
      return res;
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});
