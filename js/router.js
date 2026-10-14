// Hash routing, built around the three traps every one of these previews has hit:
//
//  1. Every render builds a fresh screen node and hands THAT to the view's mount(),
//     so listeners die with the node and nothing stacks on a second visit.
//  2. Setting the hash you already have fires no hashchange, so go() to the
//     current hash delegates to refresh(), which re-renders in place.
//  3. Scroll-derived chrome is recomputed by whoever listens to view:rendered —
//     replacing the DOM fires no scroll event.
//
// Each render knows which way it went (deeper, shallower, sideways) from the
// route depths app.js supplies, so the screen can arrive the way iOS would:
// pushed in from the right, popped in from the left, or cross-faded between tabs.

import { $ } from "./util.js";

const routes = [];
let current = null;
let depthOf = () => 0;
let rendering = false;
let pending = false;
// how many screens this visit has moved through: a deep link opened cold has
// nothing behind it, so "back" must go up to the parent instead of leaving
let moves = 0;

export const route = (pattern, view) => routes.push({ pattern, view });

const pathOf = (hash) => hash.replace(/^#/, "").split("?")[0] || "/";

function match(hash) {
  const path = pathOf(hash);
  for (const r of routes) {
    if (r.pattern === path) return { view: r.view, params: {}, path };
    if (!r.pattern.includes(":")) continue;
    const p = r.pattern.split("/"), q = path.split("/");
    if (p.length !== q.length) continue;
    const params = {};
    const ok = p.every((seg, i) => {
      if (seg.startsWith(":")) { params[seg.slice(1)] = decodeURIComponent(q[i]); return q[i] !== ""; }
      return seg === q[i];
    });
    if (ok) return { view: r.view, params, path };
  }
  return null;
}

export const query = () => Object.fromEntries(new URLSearchParams(location.hash.split("?")[1] || ""));

const scrollMemory = new Map();

export async function render({ keepScroll = false } = {}) {
  if (rendering) { pending = true; return; }
  rendering = true;
  try {
    let hit = null, out = null;
    for (let hops = 0; hops < 4; hops++) {
      hit = match(location.hash);
      if (!hit) { history.replaceState(history.state, "", "#/"); continue; }
      const res = await hit.view(hit.params, query());
      out = typeof res === "string" ? { html: res } : res;
      if (!out.redirect) break;
      history.replaceState(history.state, "", out.redirect);
      out = null;
    }
    if (!hit || !out) return;

    const prev = current;
    if (prev && !keepScroll) scrollMemory.set(prev, scrollY);
    current = hit.path;
    const dir = keepScroll || !prev || prev === current ? "none"
      : depthOf(current) > depthOf(prev) ? "push"
      : depthOf(current) < depthOf(prev) ? "pop" : "tab";

    const screen = document.createElement("div");
    screen.className = "screen" + (out.className ? " " + out.className : "");
    screen.dataset.dir = dir;
    screen.innerHTML = out.html;
    const y = keepScroll ? scrollY : dir === "pop" ? (scrollMemory.get(current) || 0) : 0;
    $("#view").replaceChildren(screen);
    out.mount?.(screen);
    scrollTo({ top: y, behavior: "instant" });
    document.dispatchEvent(new CustomEvent("view:rendered", { detail: { path: current, prev, screen, out, dir } }));
  } finally {
    rendering = false;
    if (pending) { pending = false; render(); }
  }
}

/** Re-render the current screen in place, keeping the scroll position. */
export const refresh = () => render({ keepScroll: true });

export function startRouter({ depth } = {}) {
  if (depth) depthOf = depth;
  addEventListener("hashchange", () => { moves++; render(); });
  if (!location.hash) history.replaceState(null, "", "#/");
  return render();
}

/** Navigate. The hash you are already on refreshes instead of doing nothing. */
export function go(hash, { replace = false } = {}) {
  const target = hash.startsWith("#") ? hash : "#" + hash;
  if (location.hash === target) return refresh();
  if (replace) { history.replaceState(history.state, "", target); moves++; return render(); }
  location.hash = target;
}

/** Back inside the app when there is somewhere to go back to, else up to a sensible parent. */
export function back(fallback = "#/") {
  if (moves > 0 && history.length > 1) history.back();
  else go(fallback, { replace: true });
}

export const path = () => current;
