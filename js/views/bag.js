// The bag — and the club working inside it. Every change reprices the order
// live: the points this bag earns, the points it can spend, how far it moves you
// up the ladder. Swipe a line left to save it for later or take it out (Mail's
// gesture, with undo); the × does the same for a mouse.

import { CLUB } from "../config.js";
import { esc, money, price, priceHTML, plural } from "../util.js";
import { icon } from "../icons.js";
import { byId, PRODUCTS } from "../data.js";
import {
  bag, bagCount, quote, ladder, prefs, setPrefs, setQty, removeLine, restoreLine,
  toggleSaved, isSaved, saved, member,
} from "../store.js";
import { productImg, qtyHTML, wireQty, switchHTML, joinSheet, island, emptyArt, tileHTML } from "../ui.js";
import { spring, project, rubberband, reduced } from "../motion.js";
import { refresh } from "../router.js";

/* ------------------------------------------------ shared with the checkout */
export function clubCardHTML(q, { checkout = false, joining = true } = {}) {
  const head = (extra = "") => `<div class="row-flex"><span class="eyebrow">${icon("flower")} ${CLUB.name}</span><span class="spacer"></span>${extra}</div>`;
  if (!q.member) {
    return `${head()}
      <div class="club-big"><b>+${money(q.guestEarn)}</b><span class="t-sub">points waiting for you</span></div>
      <p class="club-line">Join free and this bag earns <b>${money(q.earn)}</b> points, plus <b>${CLUB.welcome}</b> on us — <b>${price(q.guestEarn * CLUB.tomanPerPoint)}</b> off your next bag.</p>
      ${checkout ? `
        <div class="club-toggle">
          <span class="cell-t"><span class="cell-n">Join with this order</span><span class="cell-d">Uses the name and mobile above</span></span>
          ${switchHTML("co-join", joining, "Join the club with this order")}
        </div>` : `
        <button class="btn btn--cocoa btn--md btn--block" type="button" data-join style="margin-top:16px">Join the club — it's free</button>`}`;
  }
  const L = ladder(q.member.lifetime, q.earn);
  const line = !L.next ? `You're at the top — <b>${q.tier.rate}%</b> back on everything.`
    : L.levelsUp ? `This order takes you to <b>${L.next.name}</b>: ${L.next.rate}% back from then on.`
      : `<b>${money(L.toNext - q.earn)}</b> more points after this and you're <b>${L.next.name}</b>.`;
  return `${head(`<span class="status live">${q.tier.name}</span>`)}
    <div class="club-big"><b>+${money(q.earn)}</b><span class="t-sub">points with this ${checkout ? "order" : "bag"}</span></div>
    <p class="club-line">${line}</p>
    <div class="progress" aria-hidden="true"><i class="ghost" style="width:${L.after}%"></i><i style="width:${L.pct}%"></i></div>
    <div class="progress-l"><span>${q.tier.name} · ${money(q.member.lifetime)}</span><span>${L.next ? `${L.next.name} · ${money(L.next.min)}` : "Top tier"}</span></div>
    ${q.redeemable > 0 ? `
    <div class="club-toggle">
      <span class="cell-t"><span class="cell-n">Use ${money(q.redeemable)} points</span><span class="cell-d">−${price(q.redeemable * CLUB.tomanPerPoint)} · you have ${money(q.member.points)}</span></span>
      ${switchHTML("use-pts", q.used > 0, "Use points on this order")}
    </div>` : `<p class="t-foot" style="margin-top:12px">You have ${money(q.member.points)} points. They can pay for up to half of a bag.</p>`}`;
}

export function summaryHTML(q) {
  const row = (n, v, { d = "", cls = "", vcls = "" } = {}) =>
    `<div class="cell plain ${cls}"><span class="cell-t"><span class="cell-n">${n}</span>${d ? `<span class="cell-d">${d}</span>` : ""}</span><span class="cell-v money ${vcls}">${v}</span></div>`;
  return [
    row("Subtotal", price(q.subtotal)),
    q.discount ? row("Points", `−${price(q.discount)}`, { d: `${money(q.used)} points`, vcls: "cocoa" }) : "",
    row("Delivery", q.ship ? price(q.ship) : "Free", { d: `${q.method.name}${q.shipFree ? ` · free for ${q.tier.name}` : ""}` }),
    row("Total", price(q.total), { cls: "total" }),
  ].join("");
}

/* ---------------------------------------------------------------- lines */
const lineHTML = (l) => {
  const p = byId(l.pid);
  return `
  <div class="line-wrap" data-line="${l.id}">
    <div class="line-acts" aria-hidden="true">
      <button class="line-act save" type="button" data-act="save" tabindex="-1">${icon("heart")}Save</button>
      <button class="line-act del" type="button" data-act="del" tabindex="-1">${icon("trash")}Remove</button>
    </div>
    <div class="line">
      <a class="line-img" href="#/p/${p.id}" aria-label="${esc(p.name)} in ${esc(p.colour)}">${productImg(p, { sizes: "80px" })}</a>
      <div class="line-t">
        <a class="line-n" href="#/p/${p.id}">${esc(p.name)}</a>
        <span class="line-d">${esc(p.colour)} · ${price(p.price)}</span>
        <div class="line-b">${qtyHTML(l.qty, p.name)}<span class="line-p">${priceHTML(p.price * l.qty)}</span></div>
      </div>
      <button class="line-x" type="button" data-act="x" aria-label="Take ${esc(p.name)} out of the bag">${icon("close")}</button>
    </div>
  </div>`;
};

/** Mail's swipe: track 1:1, rubber-band the wrong way, throw open or shut by velocity, full swipe removes. */
function wireSwipe(wrap, { onSave, onDel }) {
  const row = wrap.querySelector(".line");
  const acts = wrap.querySelector(".line-acts");
  const OPEN = -168;
  let x = 0, sx = 0, sy = 0, start = 0, mode = null, anim = null, samples = [], suppress = false;
  const set = (v) => { x = v; row.style.transform = Math.abs(v) > .1 ? `translateX(${v}px)` : ""; acts.style.visibility = v < -1 ? "visible" : "hidden"; };
  set(0);
  row.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || e.target.closest(".qty, .line-x")) return;
    mode = "maybe"; sx = e.clientX; sy = e.clientY; start = x; anim?.stop();
    samples = [[performance.now(), x]];
  });
  row.addEventListener("pointermove", (e) => {
    if (!mode) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (mode === "maybe") {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { mode = null; return; }
      if (Math.abs(dx) < 10) return;
      mode = "drag";
      try { row.setPointerCapture(e.pointerId); } catch {}
    }
    let v = start + dx;
    if (v > 0) v = rubberband(v, 220);
    set(v);
    samples.push([performance.now(), v]);
    if (samples.length > 6) samples.shift();
  });
  const up = () => {
    if (mode !== "drag") { mode = null; return; }
    mode = null;
    suppress = true;
    setTimeout(() => { suppress = false; }, 80);
    const [t0, x0] = samples[0], [t1, x1] = samples[samples.length - 1];
    const vel = t1 > t0 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
    const land = x + project(vel, .99);
    if (land < -row.offsetWidth * .72) { onDel(); return; }
    anim = spring({ from: x, to: land < OPEN / 2 ? OPEN : 0, velocity: vel, damping: .9, response: .34, precision: .4, onUpdate: set });
  };
  row.addEventListener("pointerup", up);
  row.addEventListener("pointercancel", up);
  row.addEventListener("click", (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
  acts.querySelector('[data-act="save"]').addEventListener("click", onSave);
  acts.querySelector('[data-act="del"]').addEventListener("click", onDel);
}

/** Slide the line off, fold the gap, then say so — with an undo. */
function takeOut(wrap, line, index, how) {
  const row = wrap.querySelector(".line");
  const quick = reduced();
  const wasSaved = isSaved(line.pid);
  const done = () => {
    removeLine(line.id);
    if (how === "save" && !wasSaved) toggleSaved(line.pid);
    refresh();
    island(how === "save" ? "Saved for later" : "Taken out of your bag", {
      ico: how === "save" ? "heartFill" : "trash",
      action: { label: "Undo", fn: () => { restoreLine(line, index); if (how === "save" && !wasSaved && isSaved(line.pid)) toggleSaved(line.pid); refresh(); } },
    });
  };
  if (quick) { done(); return; }
  const from = row.style.transform || "translateX(0px)";
  row.animate([{ transform: from }, { transform: `translateX(${-wrap.offsetWidth - 20}px)` }], { duration: 220, easing: "cubic-bezier(.55,0,.8,.3)", fill: "forwards" })
    .onfinish = () => {
      wrap.animate([{ height: `${wrap.offsetHeight}px`, opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 240, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" })
        .onfinish = done;
    };
}

/* ----------------------------------------------------------------- view */
export default function bagView() {
  const lines = bag();
  if (!lines.length) return emptyBag();
  const q = quote();
  const html = `
    <div class="wrap pad-top">
      <header class="ph">
        <h1 class="lt">Bag</h1>
        <p class="t-sub" id="bag-sub">${plural(bagCount(), "bag")} · ${price(q.subtotal)}</p>
      </header>
      <div class="bag-split">
        <div>
          <div class="lines" id="lines">${lines.map(lineHTML).join("")}</div>
          <p class="t-foot" style="margin:12px 4px 0">Swipe a bag left to save it for later or take it out.</p>
        </div>
        <aside>
          <div class="club-card sec-sm" id="bag-club">${clubCardHTML(q)}</div>
          <div class="list" id="bag-sum" style="margin-top:14px">${summaryHTML(q)}</div>
          <div class="note" style="margin-top:14px">${icon("truck")}<span>Same-day courier in Tehran or post anywhere in Iran — you choose at checkout.</span></div>
        </aside>
      </div>
    </div>`;

  return {
    html,
    dock: `<div class="dock"><div class="dock-in"><a class="btn" href="#/checkout" id="dock-go">Checkout <span class="btn-sum" id="dock-sum">· ${price(q.total)}</span></a></div></div>`,
    mount(screen) {
      const repaint = () => {
        if (!bag().length) { refresh(); return; }
        const q2 = quote();
        screen.querySelector("#bag-sub").textContent = `${plural(bagCount(), "bag")} · ${price(q2.subtotal)}`;
        const club = screen.querySelector("#bag-club");
        club.innerHTML = clubCardHTML(q2);
        wireClub(club);
        screen.querySelector("#bag-sum").innerHTML = summaryHTML(q2);
        const sum = document.querySelector("#dock-sum");
        if (sum) sum.textContent = `· ${price(q2.total)}`;
        bag().forEach((l) => {
          const el = screen.querySelector(`[data-line="${l.id}"] .line-p`);
          if (el) el.innerHTML = priceHTML(byId(l.pid).price * l.qty);
        });
      };
      const wireClub = (club) => {
        club.querySelector("[data-join]")?.addEventListener("click", () => joinSheet({ earn: quote().earn, onDone: refresh }));
        club.querySelector("#use-pts")?.addEventListener("change", (e) => { setPrefs({ usePoints: e.target.checked }); repaint(); });
      };
      wireClub(screen.querySelector("#bag-club"));

      bag().forEach((line, index) => {
        const wrap = screen.querySelector(`[data-line="${line.id}"]`);
        wireQty(wrap.querySelector(".qty"), { value: line.qty, min: 1, max: 5, onChange: (v) => { setQty(line.id, v); repaint(); } });
        wrap.querySelector('[data-act="x"]').addEventListener("click", () => takeOut(wrap, line, index, "del"));
        wireSwipe(wrap, { onSave: () => takeOut(wrap, line, index, "save"), onDel: () => takeOut(wrap, line, index, "del") });
      });
    },
  };
}

function emptyBag() {
  const sv = saved().map(byId).filter(Boolean).slice(0, 4);
  return {
    html: `
      <div class="wrap pad-top">
        <header class="ph"><h1 class="lt">Bag</h1></header>
        <div class="empty">
          <div class="empty-art">${emptyArt("bag")}</div>
          <p class="d3">Your bag is empty.</p>
          <p class="t-sub">The rail isn't — ${PRODUCTS.length} bags are hanging on it.</p>
          <a class="btn" href="#/shop">Shop the rail</a>
        </div>
        ${sv.length ? `
        <section class="sec">
          <div class="sec-head"><h2 class="d4">Saved for later</h2><a class="link" href="#/saved">All saved ${icon("chevronR")}</a></div>
          <div class="grid">${sv.map((p) => tileHTML(p)).join("")}</div>
        </section>` : ""}
        ${member() ? "" : `
        <section class="sec">
          <div class="club-card">
            <span class="eyebrow">${icon("flower")} ${CLUB.name}</span>
            <p class="club-line" style="margin-top:8px">Members get <b>${CLUB.welcome} points</b> to start and <b>${CLUB.tiers[0].rate}% back</b> on every bag — spent at checkout, no codes.</p>
            <a class="btn btn--cocoa btn--md" style="margin-top:14px" href="#/club">How the club works</a>
          </div>
        </section>`}
      </div>`,
  };
}
