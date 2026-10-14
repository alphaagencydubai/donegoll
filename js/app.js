// Wiring. Routes, the two bars, the theme, and the handful of things that have
// to stay in step with state whichever screen is up.

import { BRAND } from "./config.js";
import { WORDMARK } from "./brand.js";
import { $, $$ } from "./util.js";
import { icon } from "./icons.js";
import { route, startRouter, path, go, back as goBack } from "./router.js";
import { bagCount, subscribe, prefs } from "./store.js";
import { mountTabs } from "./tabs.js";
import { runBoot } from "./boot.js";
import { wireGlobal, wireImages, observeReveals, closeSheet } from "./ui.js";

import home from "./views/home.js";
import shop from "./views/shop.js";
import product from "./views/product.js";
import bagView from "./views/bag.js";
import checkout from "./views/checkout.js";
import thanks from "./views/thanks.js";
import profile from "./views/profile.js";
import club from "./views/club.js";
import { ordersView, orderView } from "./views/orders.js";
import saved from "./views/saved.js";

/* ----------------------------------------------------------------- routes */
route("/", home);
route("/shop", shop);
route("/p/:id", product);
route("/bag", bagView);
route("/checkout", checkout);
route("/thanks/:id", thanks);
route("/profile", profile);
route("/club", club);
route("/orders", ordersView);
route("/order/:id", orderView);
route("/saved", saved);

// which tab owns a path, how deep it sits, and where "back" goes with no history
const rootOf = (p) => "/" + ((p || "/").split("/")[1] || "");
const OWNER = { "/": "home", "/shop": "shop", "/p": "shop", "/bag": "bag", "/checkout": "bag", "/thanks": "bag",
  "/profile": "profile", "/club": "profile", "/orders": "profile", "/order": "profile", "/saved": "profile" };
const DEPTH = { "/": 0, "/shop": 0, "/bag": 0, "/profile": 0, "/p": 1, "/checkout": 1, "/club": 1, "/orders": 1, "/saved": 1, "/thanks": 2, "/order": 2 };
const PARENT = { "/p": "#/shop", "/checkout": "#/bag", "/thanks": "#/shop", "/club": "#/profile", "/orders": "#/profile", "/saved": "#/profile", "/order": "#/orders" };
const TITLES = { "/shop": "Shop", "/p": "Shop", "/bag": "Bag", "/checkout": "Checkout", "/thanks": "Thank you", "/profile": "Profile",
  "/club": "Club", "/orders": "Orders", "/order": "Order", "/saved": "Saved" };

/* ---------------------------------------------------------------- tab bar */
const nav = $("#tabs");
const TAB_ICONS = { home: ["home", "homeFill"], shop: ["shop", "shopFill"], bag: ["bag", "bagFill"], profile: ["person", "personFill"] };
const tabEls = [...nav.querySelectorAll(".tab")];
tabEls.forEach((t) => {
  const [a, b] = TAB_ICONS[t.dataset.tab];
  t._icons = [icon(a), icon(b)];
  t.querySelector(".tab-ico").innerHTML = t._icons[0];
});
const tabs = mountTabs({ nav, lens: $("#tabs-lens"), onPick: (i, tab) => go(tab.getAttribute("href")) });
// tapping the tab you are on goes to its root, or to the top if you are already there (iOS)
nav.addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (!t) return;
  if (location.hash === t.getAttribute("href") || (location.hash === "" && t.dataset.tab === "home")) {
    e.preventDefault();
    scrollTo({ top: 0, behavior: "smooth" });
  }
});

function paintBadge() {
  const n = bagCount();
  const b = $("#bag-badge");
  b.textContent = n > 9 ? "9+" : String(n);
  b.classList.toggle("on", n > 0);
  $('.tab[data-tab="bag"]').setAttribute("aria-label", n ? `Bag, ${n} item${n === 1 ? "" : "s"}` : "Bag");
}

/* ---------------------------------------------------------------- top bar */
const bar = $("#bar");
const barBack = $("#bar-back");
const barTitle = $("#bar-title");
const barR = $("#bar-r");
$("#bar-logo").innerHTML = WORDMARK;
barBack.innerHTML = icon("chevronL");
barBack.addEventListener("click", () => goBack(PARENT[rootOf(path())] || "#/"));

// Scroll-derived state is recomputed on every render as well as on scroll:
// replacing the DOM fires no scroll event, and a short page must not keep the
// bar a long page earned.
let anchorTitle = null, anchorLogo = null, ticking = false;
function chrome() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const scrollable = document.documentElement.scrollHeight - innerHeight > 40;
    const y = scrollY;
    const barBottom = bar.getBoundingClientRect().bottom;
    bar.dataset.edge = scrollable && y > 4 ? "1" : "0";
    const titled = !!anchorTitle && anchorTitle.getBoundingClientRect().bottom < barBottom - 2;
    bar.dataset.titled = titled ? "1" : "0";
    const mode = bar.dataset.logoMode;
    const logoGone = anchorLogo ? anchorLogo.getBoundingClientRect().bottom < barBottom + 6 : true;
    bar.dataset.logo = mode === "always" || (mode === "scroll" && logoGone && !titled) ? "1" : "0";
    $$(".sticky-strip").forEach((s) => s.classList.toggle("stuck", y > 8 && s.getBoundingClientRect().top <= barBottom + 1));
  });
}
addEventListener("scroll", chrome, { passive: true });
addEventListener("resize", chrome);

/* ------------------------------------------------------------------ theme */
const media = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  const t = prefs().theme;
  const dark = t === "dark" || (t === "system" && media.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $('meta[name="theme-color"]').setAttribute("content", dark ? "#0F0E0D" : "#F4F2EE");
}
media.addEventListener?.("change", applyTheme);

subscribe((what) => {
  if (what === "prefs" || what === "all") applyTheme();
  paintBadge();
});

/* ----------------------------------------------------------- after render */
document.addEventListener("view:rendered", (e) => {
  const { path: p, prev, screen, out } = e.detail;
  const r = rootOf(p);
  document.body.dataset.route = r;          // lets the stylesheet give reading pages a reading width
  if (prev !== p) closeSheet({ instant: true });
  tabs.select(tabEls.findIndex((t) => t.dataset.tab === OWNER[r]));
  const cfg = out.bar || {};
  const deep = (DEPTH[r] ?? 0) > 0;
  barBack.hidden = !(cfg.back ?? deep);
  barTitle.textContent = cfg.title ?? TITLES[r] ?? "";
  bar.dataset.logoMode = cfg.logo || (deep ? "never" : r === "/" ? "scroll" : "never");
  barR.innerHTML = cfg.right || "";
  cfg.mountBar?.(barR);
  anchorTitle = screen.querySelector("[data-bar-anchor], .lt");
  anchorLogo = screen.querySelector("[data-logo-anchor]");
  const dockRoot = $("#dock-root");
  dockRoot.innerHTML = out.dock || "";
  out.mountDock?.(dockRoot);
  document.body.classList.toggle("has-dock", !!out.dock);
  paintBadge();
  observeReveals(screen);
  wireImages(screen);
  wireImages(barR);
  chrome();
  const t = cfg.docTitle || TITLES[r];
  document.title = t ? `${t} · ${BRAND.name}` : `${BRAND.name} — Bags, ${BRAND.city}`;
});

/* -------------------------------------------------------------------- go */
applyTheme();
wireGlobal();
runBoot();
startRouter({ depth: (p) => DEPTH[rootOf(p)] ?? 0 });

// never on localhost: a worker there only ever serves yesterday's edit
const local = ["localhost", "127.0.0.1"].includes(location.hostname) || location.hostname.endsWith(".local");
if ("serviceWorker" in navigator && !local && !location.search.includes("nosw")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
