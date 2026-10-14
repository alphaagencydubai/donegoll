// The pieces every view borrows: images that blur up, product tiles, the island
// toast, sheets that move like iOS sheets, the fly into the bag, the petal burst,
// segmented controls and steppers, the join-the-club sheet, the footer.

import { $, $$, esc, priceHTML, price, clamp, normalPhone } from "./util.js";
import { icon } from "./icons.js";
import { spring, project, rubberband, reduced, haptic, replay } from "./motion.js";
import { WORDMARK } from "./brand.js";
import { BRAND, CLUB, PREVIEW } from "./config.js";
import { siblings, sceneMeta } from "./data.js";
import { addToBag, isSaved, toggleSaved, join } from "./store.js";

/* ----------------------------------------------------------------- images */
/** A photo that paints its wall colour and a blurred 12px preview until the real one lands. */
export function imgHTML({ set, w, h, lqip = "", ground = "", alt = "", sizes = "100vw", eager = false, cls = "" }) {
  const [src] = set[set.length - 1];
  const srcset = set.length > 1 ? ` srcset="${set.map(([u, sw]) => `${u} ${sw}w`).join(", ")}" sizes="${sizes}"` : "";
  return `<span class="ph-img ${cls}" style="--lqip:url('${lqip}');--ground:${ground}">` +
    `<img src="${src}"${srcset} width="${w}" height="${h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></span>`;
}
export const productImg = (p, opts = {}) => imgHTML({
  set: [[p.img.replace(".webp", "-s.webp"), 360], [p.img, p.w]], w: p.w, h: p.h, lqip: p.lqip, ground: p.ground,
  alt: `${p.name} in ${p.colour}`, ...opts,
});
export const sceneImg = (id, opts = {}) => {
  const s = sceneMeta(id);
  return imgHTML({ set: [[s.src.replace(".webp", "-m.webp"), 640], [s.src, s.w]], w: s.w, h: s.h, lqip: s.lqip, ground: s.ground, alt: s.alt || "", ...opts });
};

/** Fade photos in once they have pixels; one that fails retries once, then keeps its placeholder. */
export function wireImages(root = document) {
  $$(".ph-img img, .tile-img img", root).forEach((im) => {
    if (im.dataset.wired) return;
    im.dataset.wired = "1";
    const ready = () => im.classList.add("ready");
    if (im.complete && im.naturalWidth) { ready(); return; }
    im.addEventListener("load", ready, { once: true });
    im.addEventListener("error", () => {
      if (im.dataset.retry) return;
      im.dataset.retry = "1";
      setTimeout(() => { im.removeAttribute("srcset"); im.src = im.src.split("?")[0] + "?r=1"; }, 700);
    });
  });
}

let revealObs = null;
export function observeReveals(root = document) {
  revealObs?.disconnect();
  const items = $$(".rv", root);
  if (!("IntersectionObserver" in window) || reduced()) { items.forEach((el) => el.classList.add("in")); return; }
  revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.02 });
  items.forEach((el) => revealObs.observe(el));
}

/* ------------------------------------------------------------------ tiles */
export const TILE_SIZES = "(min-width: 900px) 260px, (min-width: 640px) 31vw, 46vw";

export function tileHTML(p, { eager = false, sizes = TILE_SIZES } = {}) {
  const sibs = siblings(p);
  const on = isSaved(p.id);
  const small = p.img.replace(".webp", "-s.webp");
  return `<article class="tile" data-pid="${p.id}">
    <a href="#/p/${p.id}" aria-label="${esc(p.name)}, ${esc(p.colour)}, ${price(p.price)}">
      <span class="tile-img" style="--lqip:url('${p.lqip}');--ground:${p.ground}">
        <img src="${p.img}" srcset="${small} 360w, ${p.img} ${p.w}w" sizes="${sizes}" width="${p.w}" height="${p.h}" alt="" ${eager ? "" : 'loading="lazy"'} decoding="async">
        ${p.isNew ? `<span class="tile-new">New</span>` : ""}
      </span>
      <span class="tile-meta">
        <span class="tile-n">${esc(p.name)}</span>
        <span class="tile-d"><span>${esc(p.colour)}</span><span class="tile-p">${priceHTML(p.price)}</span></span>
      </span>
    </a>
    ${heartHTML(p, { cls: "gbtn tile-heart", on })}
    ${sibs.length > 1 ? `<div class="swatches" aria-hidden="true">${sibs.map((s) => `<i class="sw ${s.id === p.id ? "on" : ""}" style="background:${s.hex}"></i>`).join("")}</div>` : ""}
  </article>`;
}

export const heartHTML = (p, { cls = "gbtn", on = isSaved(p.id) } = {}) =>
  `<button class="${cls} ${on ? "on" : ""}" type="button" data-save="${p.id}" aria-pressed="${on}" aria-label="${on ? "Remove" : "Save"} ${esc(p.name)} in ${esc(p.colour)}">${icon(on ? "heartFill" : "heart")}</button>`;

/** A scroll handler that removes itself once its screen has been replaced. */
export function onScroll(screen, fn) {
  const h = () => { if (!screen.isConnected) { removeEventListener("scroll", h); return; } fn(); };
  addEventListener("scroll", h, { passive: true });
  fn();
}

function paintHearts(pid, on) {
  $$(`[data-save="${pid}"]`).forEach((b) => {
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    const label = b.getAttribute("aria-label") || "";
    b.setAttribute("aria-label", label.replace(/^(Save|Remove)/, on ? "Remove" : "Save"));
    if (!b.dataset.keepIcon) b.innerHTML = icon(on ? "heartFill" : "heart");
    if (on) replay(b, "beat");
  });
}

/* ------------------------------------------------------------- one listener */
// Views come and go; a listener bound per view stacks. One, on the document.
let onAdded = null;
export const setOnAdded = (fn) => { onAdded = fn; };

export function wireGlobal() {
  if (wireGlobal.done) return;
  wireGlobal.done = true;
  document.addEventListener("click", (e) => {
    const sv = e.target.closest("[data-save]");
    if (sv) {
      e.preventDefault(); e.stopPropagation();
      const on = toggleSaved(sv.dataset.save);
      haptic(8);
      paintHearts(sv.dataset.save, on);
      if (on) island("Saved to your profile", { ico: "heartFill", action: { label: "View", href: "#/saved" } });
      return;
    }
    const ad = e.target.closest("[data-add]");
    if (ad) { e.preventDefault(); e.stopPropagation(); addWithFlight(ad.dataset.add, ad); }
  });
}

export function addWithFlight(pid, btn) {
  const line = addToBag(pid, 1);
  if (!line) return;
  haptic([10, 30, 12]);
  const scope = btn?.closest("[data-flight]") || document;
  const img = scope.querySelector("[data-flight-img] img, .pdp-slide img, .tile-img img");
  flyToBag(img);
  if (btn && btn.classList.contains("btn")) {
    const keep = btn.innerHTML;
    btn.classList.add("done");
    btn.innerHTML = `${icon("check")}<span>Added to bag</span>`;
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.classList.remove("done"); btn.innerHTML = keep; }, 1500);
  }
  onAdded?.(pid);
}

/* -------------------------------------------------------------- the flight */
export function flyToBag(img) {
  const target = $('.tab[data-tab="bag"] .tab-ico');
  const done = () => bumpBadge();
  if (!img || !target || reduced() || document.hidden) { done(); return; }
  const a = img.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width || a.bottom < 0 || a.top > innerHeight) { done(); return; }
  const w = Math.min(a.width, 132), h = w * 4 / 3;
  const x0 = a.left + a.width / 2 - w / 2, y0 = a.top + Math.min(a.height, h * 1.4) / 2 - h / 2;
  const outer = document.createElement("div");
  outer.className = "fly";
  outer.style.cssText = `left:${x0}px;top:${y0}px;width:${w}px;height:${h}px;box-shadow:none;overflow:visible;border-radius:0`;
  const inner = document.createElement("div");
  inner.className = "fly";
  inner.style.cssText = "position:absolute;inset:0";
  inner.innerHTML = `<img src="${img.currentSrc || img.src}" alt="">`;
  outer.append(inner);
  $("#fly-root").append(outer);
  const dx = b.left + b.width / 2 - (x0 + w / 2);
  const dy = b.top + b.height / 2 - (y0 + h / 2);
  const ms = 760;
  outer.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], { duration: ms, easing: "cubic-bezier(.45,0,.35,1)", fill: "forwards" });
  const lift = Math.min(160, Math.abs(dy) * .35 + 60);
  inner.animate([
    { transform: "translateY(0) scale(1)", opacity: 1, borderRadius: "14px" },
    { transform: `translateY(${-lift}px) scale(.62)`, opacity: 1, offset: .35 },
    { transform: `translateY(${dy}px) scale(.1)`, opacity: .35, borderRadius: "50%" },
  ], { duration: ms, easing: "cubic-bezier(.33,0,.6,1)", fill: "forwards" }).onfinish = () => { outer.remove(); done(); };
}
export function bumpBadge() {
  const badge = $("#bag-badge");
  if (badge) replay(badge, "bump");
}

/* ----------------------------------------------------------- island toast */
/** A Dynamic-Island-style banner that drops from the top. */
export function island(message, { ico = "check", img = "", action = null, ms = 2600 } = {}) {
  const root = $("#toast-root");
  if (!root) return;
  root.replaceChildren();
  const node = document.createElement("div");
  node.className = "island";
  node.setAttribute("role", "status");
  node.innerHTML = `<span class="island-ico">${img ? `<img src="${img}" alt="">` : icon(ico)}</span><span class="island-t"></span>` +
    (action ? `<${action.href ? `a href="${action.href}"` : 'button type="button"'} class="island-a">${esc(action.label)}</${action.href ? "a" : "button"}>` : "");
  node.querySelector(".island-t").textContent = message;
  const out = () => {
    if (node.classList.contains("out")) return;
    node.classList.add("out");
    setTimeout(() => node.remove(), 360);
  };
  if (action) node.querySelector(".island-a").addEventListener("click", () => { action.fn?.(); out(); });
  root.append(node);
  setTimeout(out, ms);
  return out;
}

/* ------------------------------------------------------------------ petals */
/** A handful of petals from a point — the club's little celebration. */
export function petals(host, { count = 14, spread = 150 } = {}) {
  if (!host || reduced() || document.hidden) return;
  const box = host.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "petal";
    p.innerHTML = icon("flower");
    p.style.left = `${box.width / 2 - 8}px`;
    p.style.top = `${box.height * .38}px`;
    host.append(p);
    const ang = (-90 + (Math.random() - .5) * 200) * Math.PI / 180;
    const dist = spread * (.45 + Math.random() * .7);
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    const rot = (Math.random() - .5) * 540;
    const s = .5 + Math.random() * .8;
    p.animate([
      { transform: "translate(0,0) scale(.2) rotate(0deg)", opacity: 0 },
      { transform: `translate(${dx * .7}px, ${dy * .7}px) scale(${s}) rotate(${rot * .6}deg)`, opacity: 1, offset: .35 },
      { transform: `translate(${dx}px, ${dy + 90}px) scale(${s * .8}) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: 1500 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }).onfinish = () => p.remove();
  }
}

/* ------------------------------------------------------------------ sheet */
let current = null;

/**
 * A bottom sheet (a centred card from 900px): grabber, drag to dismiss with the
 * finger's velocity handed to the spring, rubber-band upwards, Escape and Back
 * close it. body/foot are HTML; mount(sheet, close) runs once it is in the page.
 */
export function openSheet({ title = "", body = "", foot = "", mount, onClose, label = "" } = {}) {
  closeSheet({ instant: true });
  const root = $("#sheet-root");
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const sheet = document.createElement("section");
  sheet.className = "sheet";
  sheet.tabIndex = -1;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", label || title || "Sheet");
  sheet.innerHTML = `
    <div class="sheet-grab" aria-hidden="true"><i></i></div>
    <div class="sheet-head">${title ? `<h2 class="d3">${title}</h2>` : "<span></span>"}
      <button class="sheet-x" type="button" aria-label="Close">${icon("close")}</button></div>
    <div class="sheet-body">${body}</div>
    ${foot ? `<div class="sheet-foot">${foot}</div>` : ""}`;
  root.append(scrim, sheet);
  const focusBack = document.activeElement;
  document.documentElement.style.overflow = "hidden";

  const far = () => innerHeight + 40;
  let y = far();
  const apply = (v) => {
    y = v;
    const shown = v < 0 ? rubberband(v, 600) : v;
    sheet.style.transform = `translateY(${shown}px)`;
    scrim.style.opacity = String(clamp(1 - v / Math.min(sheet.offsetHeight || 400, innerHeight), 0, 1));
  };
  apply(y);
  let anim = spring({ from: y, to: 0, damping: 1, response: .42, precision: .5, onUpdate: apply });

  const state = { scrim, sheet, onClose, closing: false, focusBack };
  current = state;

  // Resolves once the sheet's own history entry is gone. Anything that rewrites the
  // URL (the shop's filters) must wait for it: written earlier, it lands on the
  // sheet's entry, and the pop back to the entry before it reverts the URL.
  state.close = (velocity = 0) => {
    if (state.closing) return state.done;
    state.closing = true;
    anim?.stop();
    anim = spring({ from: y, to: far(), velocity, damping: 1, response: .34, precision: 1, onUpdate: apply,
      onDone: () => { scrim.remove(); sheet.remove(); } });
    if (current === state) current = null;
    document.documentElement.style.overflow = "";
    try { state.focusBack?.focus?.({ preventScroll: true }); } catch {}
    state.done = new Promise((resolve) => {
      if (!history.state?.dgSheet) { resolve(); return; }
      let settled = false;
      const fin = () => { if (settled) return; settled = true; removeEventListener("popstate", fin); resolve(); };
      addEventListener("popstate", fin);
      setTimeout(fin, 400);
      history.back();
    });
    onClose?.();
    return state.done;
  };

  // Back closes the sheet: it gets its own history entry on the same URL
  try { history.pushState({ dgSheet: 1 }, "", location.href); } catch {}

  scrim.addEventListener("click", () => state.close());
  sheet.querySelector(".sheet-x").addEventListener("click", () => state.close());
  sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") state.close(); });

  // drag: pointer on the grabber and header, touch on the body when it is at the top
  const samples = [];
  let startY = 0, startSheet = 0, dragging = false;
  const begin = (clientY) => { anim?.stop(); dragging = true; startY = clientY; startSheet = y; samples.length = 0; samples.push([performance.now(), y]); };
  const moveTo = (clientY) => {
    if (!dragging) return;
    apply(startSheet + (clientY - startY));
    samples.push([performance.now(), y]);
    if (samples.length > 6) samples.shift();
  };
  const release = () => {
    if (!dragging) return;
    dragging = false;
    const [t0, y0] = samples[0], [t1, y1] = samples[samples.length - 1];
    const v = t1 > t0 ? ((y1 - y0) / (t1 - t0)) * 1000 : 0;
    const landing = y + project(v, .99);
    if (landing > sheet.offsetHeight * .42 || v > 1100) state.close(v);
    else anim = spring({ from: y, to: 0, velocity: v, damping: .86, response: .36, precision: .5, onUpdate: apply });
  };
  const handle = [sheet.querySelector(".sheet-grab"), sheet.querySelector(".sheet-head")];
  handle.forEach((h) => {
    h.style.touchAction = "none";
    h.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      h.setPointerCapture(e.pointerId);
      begin(e.clientY);
    });
    h.addEventListener("pointermove", (e) => moveTo(e.clientY));
    h.addEventListener("pointerup", release);
    h.addEventListener("pointercancel", release);
  });
  const bodyEl = sheet.querySelector(".sheet-body");
  let ty = null;
  bodyEl.addEventListener("touchstart", (e) => { ty = e.touches[0].clientY; }, { passive: true });
  bodyEl.addEventListener("touchmove", (e) => {
    if (ty == null) return;
    const cy = e.touches[0].clientY;
    if (!dragging && bodyEl.scrollTop <= 0 && cy - ty > 6) begin(cy);
    if (dragging) { e.preventDefault(); moveTo(cy); }
  }, { passive: false });
  bodyEl.addEventListener("touchend", () => { ty = null; release(); });

  mount?.(sheet, state.close);
  wireImages(sheet);
  requestAnimationFrame(() => { try { sheet.focus({ preventScroll: true }); } catch {} });
  return state;
}

export function closeSheet({ instant = false } = {}) {
  if (!current) return;
  if (instant) {
    const s = current;
    current = null;
    s.scrim.remove(); s.sheet.remove();
    document.documentElement.style.overflow = "";
    return;
  }
  current.close();
}
export const sheetOpen = () => !!current;
addEventListener("popstate", () => { if (current && !current.closing) { const s = current; history.state?.dgSheet || s.close(); } });

/* ------------------------------------------------------------- controls */
export const qtyHTML = (n, label = "") => `
  <span class="qty" role="group" aria-label="Quantity${label ? " of " + esc(label) : ""}">
    <button type="button" data-dec aria-label="One fewer">${icon("minus")}</button>
    <output aria-live="polite">${n}</output>
    <button type="button" data-inc aria-label="One more">${icon("plus")}</button>
  </span>`;

export function wireQty(node, { value, min = 0, max = 5, onChange }) {
  const out = node.querySelector("output");
  const set = (n) => {
    const v = clamp(n, min, max);
    if (v === value && n === value) return;
    value = v;
    out.textContent = v;
    onChange(v);
  };
  node.querySelector("[data-dec]").addEventListener("click", () => { haptic(6); set(value - 1); });
  node.querySelector("[data-inc]").addEventListener("click", () => { haptic(6); set(value + 1); });
}

export const segHTML = (name, options, value) => `
  <div class="seg" role="radiogroup" data-seg="${name}"><span class="seg-thumb" aria-hidden="true"></span>
    ${options.map((o) => `<button type="button" role="radio" aria-checked="${o.id === value}" aria-pressed="${o.id === value}" data-v="${o.id}">${esc(o.label)}</button>`).join("")}
  </div>`;

export function wireSeg(node, onChange) {
  const btns = [...node.querySelectorAll("button")];
  const thumb = node.querySelector(".seg-thumb");
  const place = () => {
    const i = Math.max(0, btns.findIndex((b) => b.getAttribute("aria-checked") === "true"));
    thumb.style.width = `calc((100% - 4px) / ${btns.length})`;
    thumb.style.transform = `translateX(${i * 100}%)`;
  };
  place();
  btns.forEach((b) => b.addEventListener("click", () => {
    btns.forEach((x) => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.setAttribute("aria-pressed", String(on)); });
    place();
    haptic(6);
    onChange(b.dataset.v);
  }));
}

export const switchHTML = (id, on, label) =>
  `<label class="switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""} aria-label="${esc(label)}"><i></i></label>`;

/* ----------------------------------------------------------- join sheet */
/** Name and mobile, nothing else. The club is the CRM: this is where a customer enters it. */
export function joinSheet({ onDone, earn = 0 } = {}) {
  const body = `
    <p class="t-sub" style="margin-bottom:18px">${earn ? `Join now and this bag earns you <b class="pts">${icon("flower")}${earn} points</b>, ` : ""}${CLUB.welcome} points on us to start, and ${CLUB.tiers[0].rate}% back in points on every order. Free, and your points work at checkout straight away.</p>
    <form id="join-form" novalidate>
      <label class="field" id="f-name"><span class="field-l">Your name</span>
        <input class="input" name="name" autocomplete="name" placeholder="First and last name" required>
        <span class="field-err">Tell us what to call you.</span></label>
      <label class="field" id="f-phone"><span class="field-l">Mobile</span>
        <input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0912 345 6789" required>
        <span class="field-err">An Iranian mobile, like 0912 345 6789.</span></label>
      <p class="t-foot" style="margin-top:12px">Preview: no code is sent and nothing leaves this phone.</p>
    </form>`;
  openSheet({
    title: "Join the club", body, label: "Join Done Goll Club",
    foot: `<button class="btn btn--block" type="submit" form="join-form">Join free</button>`,
    mount(sheet, close) {
      const form = sheet.querySelector("#join-form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = form.name.value.trim();
        const phone = normalPhone(form.phone.value);
        sheet.querySelector("#f-name").classList.toggle("bad", name.length < 2);
        sheet.querySelector("#f-phone").classList.toggle("bad", !phone);
        if (name.length < 2 || !phone) { haptic([20, 40, 20]); return; }
        join({ name, phone });
        close();
        island(`Welcome, ${name.split(/\s+/)[0]} — ${CLUB.welcome} points are yours`, { ico: "flower" });
        onDone?.();
      });
    },
  });
}

/* ---------------------------------------------------------------- empties */
export function emptyArt(kind = "bag") {
  const hook = `<path d="M80 14c0-4.5 3-7 6.2-7" stroke-width="2.4"/><path d="M80 14v30"/><path d="M80 44c0 12-17 12-17 1"/>`;
  const extra = kind === "saved"
    ? `<path d="M64 66s-12-7.4-12-16.1a6.9 6.9 0 0 1 12-4.6 6.9 6.9 0 0 1 12 4.6C76 58.6 64 66 64 66z" transform="translate(1 6)" fill="currentColor" fill-opacity=".12"/>`
    : kind === "orders"
      ? `<path d="M52 60l12-6 12 6v14l-12 6-12-6z"/><path d="M52 60l12 6 12-6M64 66v14"/>`
      : `<rect x="54" y="52" width="20" height="30" rx="3" transform="rotate(-8 64 66)" fill="currentColor" fill-opacity=".1"/><circle cx="62" cy="58" r="2" transform="rotate(-8 64 66)"/>`;
  return `<svg viewBox="0 0 160 96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10 10h140" stroke-width="3.6"/>${hook}${extra}</svg>`;
}

/* ------------------------------------------------------------------ share */
export async function shareLink({ title, text = "", url = location.href }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); island("Link copied", { ico: "check" }); }
  catch { island("Couldn't copy the link here", { ico: "info" }); }
}

/* ------------------------------------------------------------------ footer */
export const alphaSign = () => `
  <a class="powered" href="https://alphaa.agency" target="_blank" rel="noopener" aria-label="Powered by Alpha Agency">
    <img class="alpha-b" src="assets/brand/alpha-black.png" alt="" width="40" height="30" decoding="async">
    <img class="alpha-w" src="assets/brand/alpha-white.png" alt="" width="40" height="30" decoding="async">
    <span class="powered-t"><small>Powered by</small><b>Alpha Agency</b></span>
    <span class="powered-y">Preview · ${new Date().getFullYear()}</span>
  </a>`;

export const footerHTML = () => `
  <footer class="foot">
    <div class="foot-mark">${WORDMARK}</div>
    <div class="foot-cols">
      <div><div class="foot-h">Shop</div>
        <a href="#/shop">All bags</a><a href="#/shop?c=shoulder">Shoulder</a><a href="#/shop?c=tote">Totes</a><a href="#/shop?c=hobo">Hobo</a></div>
      <div><div class="foot-h">Club</div>
        <a href="#/club">How points work</a><a href="#/profile">Your card</a><a href="#/orders">Orders</a><a href="#/saved">Saved</a></div>
      <div><div class="foot-h">Find us</div>
        <span>${BRAND.city}, ${BRAND.country}</span>
        <a href="${BRAND.instagramUrl}" target="_blank" rel="noopener">@${BRAND.instagram}</a>
        <a href="https://ig.me/m/${BRAND.instagram}" target="_blank" rel="noopener">Message us</a></div>
      <div><div class="foot-h">App</div>
        <a href="#/profile?install=1">Install Done Goll</a><a href="#/profile">Appearance</a></div>
    </div>
    ${PREVIEW.enabled ? `<p class="foot-note">${esc(PREVIEW.note)}</p>` : ""}
    ${alphaSign()}
  </footer>`;
