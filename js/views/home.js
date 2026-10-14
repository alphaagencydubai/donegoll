// Home. The wordmark, the shop's own photograph, the rail — the signature: the
// bags hang on S-hooks and swing as it moves — two edits, the club, where to find
// Done Goll, and the footer with Alpha's sign.

import { WORDMARK } from "../brand.js";
import { BRAND, CLUB } from "../config.js";
import { esc, money, price, priceHTML } from "../util.js";
import { icon } from "../icons.js";
import { PRODUCTS, byId, NEW_IN, EDITS } from "../data.js";
import { member, ladder } from "../store.js";
import { sceneImg, footerHTML, joinSheet, onScroll } from "../ui.js";
import { mountRail } from "../rail.js";
import { reduced } from "../motion.js";
import { refresh } from "../router.js";

// an S-hook: the curl sits over the rail, the U at the bottom goes through the card
const HOOK = `<svg viewBox="0 0 26 46" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9.8c0-3.2 2.4-5.8 5.4-5.8s5.6 2.8 5.6 7v30.5c0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5v-1.8"/></svg>`;

const CIRCLES = [
  { label: "New in", href: "#/shop?new=1", pid: "varsity-cherry" },
  { label: "Shoulder", href: "#/shop?c=shoulder", pid: "slouch-black" },
  { label: "Totes", href: "#/shop?c=tote", pid: "tote-ecru" },
  { label: "Hobo", href: "#/shop?c=hobo", pid: "crescent-bone" },
  { label: "Bowling", href: "#/shop?c=bowling", pid: "varsity-cream" },
  { label: "Suede", href: "#/shop?edit=suede", pid: "fringe-cognac" },
];

const hang = (p) => {
  const small = p.img.replace(".webp", "-s.webp");
  return `
  <a class="hang" role="listitem" href="#/p/${p.id}" aria-label="${esc(p.name)} in ${esc(p.colour)}, ${price(p.price)}">
    <span class="hang-hook">${HOOK}</span>
    <span class="hang-card" style="--ground:${p.ground}">
      <img src="${small}" srcset="${small} 360w, ${p.img} ${p.w}w" sizes="(min-width: 900px) 270px, 60vw" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async">
      <span class="hang-hole" aria-hidden="true"></span>
    </span>
    <span class="hang-meta">
      <span class="hang-n">${esc(p.name)}</span>
      <span class="hang-d"><span>${esc(p.colour)}</span><span class="tile-p">${priceHTML(p.price)}</span></span>
    </span>
  </a>`;
};

function clubTeaser() {
  const m = member();
  if (!m) return `
    <div class="club-card rv">
      <span class="eyebrow">${icon("flower")} ${CLUB.name}</span>
      <p class="d3" style="margin-top:10px">Points on every bag.</p>
      <p class="club-line">${CLUB.welcome} points when you join, ${CLUB.tiers[0].rate}% back on every order, and every point is worth ${money(CLUB.tomanPerPoint)} T at checkout.</p>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn--cocoa btn--md" type="button" id="home-join">Join free</button>
        <a class="btn btn--line btn--md" href="#/club">How it works</a>
      </div>
    </div>`;
  const L = ladder(m.lifetime);
  return `
    <a class="club-card rv" href="#/profile" style="display:block">
      <div class="row-flex"><span class="eyebrow">${icon("flower")} ${CLUB.name}</span><span class="spacer"></span><span class="status live">${L.tier.name}</span></div>
      <div class="club-big"><b>${money(m.points)}</b><span class="t-sub">points</span></div>
      <p class="club-line">Worth <b>${price(m.points * CLUB.tomanPerPoint)}</b> at checkout. ${L.next ? `<b>${money(L.toNext)}</b> points to ${L.next.name}.` : "Top of the ladder."}</p>
      <div class="progress" aria-hidden="true"><i style="width:${L.pct}%"></i></div>
    </a>`;
}

export default function home() {
  const m = member();
  const rail = NEW_IN.map(byId).filter(Boolean);
  const ig = ["slouch-black", "varsity-cherry", "fringe-navy", "tote-ecru", "crescent-mocha", "pocket-espresso"].map(byId);
  const [suede, everyday] = EDITS;
  const html = `
    <section class="hero">
      <div class="hero-copy">
        <h1 class="hero-mark" data-logo-anchor aria-label="${BRAND.name}">${WORDMARK}</h1>
        <p class="hero-line t-sub">Bags from ${BRAND.city}, straight off the rail.</p>
        <div class="hero-meta">
          <a class="chip" href="#/shop">${icon("shop")} Shop all ${PRODUCTS.length}</a>
          <a class="chip" href="#/club">${icon("flower")} ${m ? `${money(m.points)} points` : "The club"}</a>
        </div>
      </div>
      <a class="hero-photo" href="#/shop" aria-label="Shop the rail">
        ${sceneImg("slouch-pair", { eager: true, sizes: "(min-width: 900px) 58vw, 100vw", alt: "Slouch bags in Cocoa and Sand hanging on Done Goll's rail" })}
        <span class="hero-tag gpill">New season</span>
        <span class="hero-cta"><span class="gpill">Shop the rail ${icon("arrowR")}</span></span>
      </a>
    </section>

    <section class="wrap sec-sm">
      <div class="circles" role="list">
        ${CIRCLES.map((c) => { const p = byId(c.pid); return `
          <a class="circle" role="listitem" href="${c.href}">
            <span class="circle-img"><img src="${p.img.replace(".webp", "-s.webp")}" alt="" width="360" height="480" loading="lazy" decoding="async"></span>
            <span class="circle-l">${c.label}</span>
          </a>`; }).join("")}
      </div>
    </section>

    <section class="sec">
      <div class="wrap">
        <div class="sec-head"><h2 class="d3">On the rail</h2><a class="link" href="#/shop?new=1">See all ${icon("chevronR")}</a></div>
        <div class="rail" data-rail>
          <div class="rail-bar" aria-hidden="true"></div>
          <div class="rail-track" role="list" aria-label="New on the rail">${rail.map(hang).join("")}</div>
        </div>
      </div>
    </section>

    <section class="wrap sec">
      <div class="home-split">
        <a class="edit rv" href="#/shop?edit=${suede.id}">
          ${sceneImg(suede.scene, { sizes: "(min-width: 900px) 50vw, 100vw" })}
          <span class="edit-panel glass">
            <span class="eyebrow">The edit</span>
            <span class="d3">${esc(suede.title)}</span>
            <span class="t-sub">${esc(suede.sub)}</span>
            <span class="edit-go">Shop the edit ${icon("arrowR")}</span>
          </span>
        </a>
        <a class="edit rv" href="#/shop?edit=${everyday.id}">
          ${sceneImg(everyday.scene, { sizes: "(min-width: 900px) 50vw, 100vw" })}
          <span class="edit-panel glass">
            <span class="eyebrow">Every day</span>
            <span class="d3">${esc(everyday.title)}</span>
            <span class="t-sub">${esc(everyday.sub)}</span>
            <span class="edit-go">Shop totes ${icon("arrowR")}</span>
          </span>
        </a>
      </div>
    </section>

    <section class="wrap sec">${clubTeaser()}</section>

    <section class="wrap sec">
      <div class="visit-wrap">
        <div class="visit rv">
          <span class="eyebrow">${icon("pin")} ${BRAND.city}, ${BRAND.country}</span>
          <h2 class="d2">Find us in ${BRAND.city}.</h2>
          <p>Message us on Instagram for a bag's measurements, stock, or a colour you can't see here.</p>
          <div class="visit-acts">
            <a class="btn btn--md btn--light" href="https://ig.me/m/${BRAND.instagram}" target="_blank" rel="noopener">${icon("send")} Message us</a>
            <a class="btn btn--md btn--soft" href="${BRAND.instagramUrl}" target="_blank" rel="noopener">${icon("instagram")} @${BRAND.instagram}</a>
          </div>
        </div>
        <a class="ig-grid rv" href="${BRAND.instagramUrl}" target="_blank" rel="noopener" aria-label="Done Goll on Instagram">
          ${ig.map((p) => `<span><img src="${p.img.replace(".webp", "-s.webp")}" alt="" width="360" height="480" loading="lazy" decoding="async"></span>`).join("")}
        </a>
      </div>
    </section>

    <div class="wrap">${footerHTML()}</div>`;

  return {
    html,
    bar: {
      logo: "scroll",
      right: `<a class="gbtn" href="#/shop?focus=1" aria-label="Search the shop">${icon("search")}</a>`,
    },
    mount(screen) {
      mountRail(screen.querySelector("[data-rail]"));
      screen.querySelector("#home-join")?.addEventListener("click", () => joinSheet({ onDone: refresh }));
      // the photograph drifts a little slower than the page
      const img = screen.querySelector(".hero-photo img");
      if (img && !reduced()) {
        onScroll(screen, () => {
          const y = scrollY;
          if (y < innerHeight * 1.2) img.style.transform = `translateY(${(y * .09).toFixed(1)}px)`;
        });
      }
    },
  };
}
