// Offline shell.
//
// Everything the app is made of — the HTML, the CSS, every module, the manifest —
// goes to the network first, with `cache: "reload"` so the request reaches the
// origin rather than the browser's own HTTP cache (GitHub Pages sends max-age=600,
// and a worker's plain fetch() would honour it). A redeploy changes the shell and
// the code together, and half a build is worse than an old one.
//
// Fonts, the wordmark, the photographs and the icons change name when they change
// at all, so they are cache-first.
//
// clients.claim() runs only when this worker REPLACES an older one. On a cold
// install the page keeps the network it started with — claiming mid-flight hands
// the new worker every in-flight image request, and they fail.
//
// VERSION, SHELL and PRECACHE are written by build.py. Do not edit them by hand.

const VERSION = "dg-f288cfe01c";
const MARKER = "./__installed__";

const SHELL = [
  "./",
  "./css/app.css",
  "./index.html",
  "./js/app.js",
  "./js/assets.gen.js",
  "./js/boot.js",
  "./js/brand.js",
  "./js/config.js",
  "./js/data.js",
  "./js/icons.js",
  "./js/install.js",
  "./js/motion.js",
  "./js/qr.js",
  "./js/rail.js",
  "./js/router.js",
  "./js/store.js",
  "./js/tabs.js",
  "./js/ui.js",
  "./js/util.js",
  "./js/views/bag.js",
  "./js/views/checkout.js",
  "./js/views/club.js",
  "./js/views/home.js",
  "./js/views/orders.js",
  "./js/views/product.js",
  "./js/views/profile.js",
  "./js/views/saved.js",
  "./js/views/shop.js",
  "./js/views/thanks.js",
  "./manifest.webmanifest"
];
const PRECACHE = [
  "./assets/brand/alpha-black.png",
  "./assets/brand/alpha-white.png",
  "./assets/brand/wordmark.svg",
  "./assets/fonts/caslon-display.woff2",
  "./assets/fonts/caslon-text-italic.woff2",
  "./assets/fonts/caslon-text.woff2",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon.png",
  "./assets/icons/icon-192.png",
  "./assets/photos/t/crescent-bone-s.webp",
  "./assets/photos/t/crescent-mocha-s.webp",
  "./assets/photos/t/fringe-cognac-s.webp",
  "./assets/photos/t/fringe-navy-s.webp",
  "./assets/photos/t/pocket-espresso-s.webp",
  "./assets/photos/t/slouch-black-s.webp",
  "./assets/photos/t/slouch-cocoa-s.webp",
  "./assets/photos/t/slouch-sand-s.webp",
  "./assets/photos/t/tote-chocolate-s.webp",
  "./assets/photos/t/tote-ecru-s.webp",
  "./assets/photos/t/tote-navy-s.webp",
  "./assets/photos/t/varsity-cherry-s.webp",
  "./assets/photos/t/varsity-cream-s.webp"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const had = (await caches.keys()).some((k) => k.startsWith("dg-") && k !== VERSION);
    const cache = await caches.open(VERSION);
    await Promise.allSettled([...SHELL, ...PRECACHE].map((url) => cache.add(new Request(url, { cache: "reload" }))));
    // whether this is an update or a first install lives in the cache itself —
    // install and activate need not run in the same worker instance
    await cache.put(MARKER, new Response(had ? "update" : "cold"));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("dg-") && k !== VERSION).map((k) => caches.delete(k)));
    const cache = await caches.open(VERSION);
    const marker = await cache.match(MARKER);
    if (marker && (await marker.text()) === "update") await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("/__installed__")) return;

  const shell = request.mode === "navigate" || /\.(?:html|css|js|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (shell) {
    e.respondWith((async () => {
      try {
        const res = await fetch(new Request(request, { cache: "reload" }));
        if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
        return res;
      } catch {
        const hit = (await caches.match(request, { ignoreSearch: true }))
          || (request.mode === "navigate" ? await caches.match("./index.html") : null);
        return hit || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    try {
      const res = await fetch(request);
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch { return Response.error(); }
  })());
});
