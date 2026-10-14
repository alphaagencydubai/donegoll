// A bag. The gallery runs under the glass bar; the name hands over to the bar
// once it scrolls away, with a small Add button beside it (the App Store's GET,
// borrowed). Colourways are siblings: switching one replaces this screen rather
// than stacking history.

import { BRAND, CLUB, DELIVERY } from "../config.js";
import { esc, price, priceHTML } from "../util.js";
import { icon } from "../icons.js";
import { byId, styleById, siblings, sceneMeta, catName, PRODUCTS } from "../data.js";
import { member, tierOf, pointsFor } from "../store.js";
import { productImg, sceneImg, tileHTML, heartHTML, shareLink, joinSheet } from "../ui.js";
import { go, refresh } from "../router.js";

export default function product({ id }) {
  const p = byId(id);
  if (!p) return { redirect: "#/shop" };
  const s = styleById(p.style);
  const sibs = siblings(p);
  const m = member();
  const tier = m ? tierOf() : CLUB.tiers[0];
  const earn = pointsFor(p.price, tier);
  const slides = [
    { html: productImg(p, { eager: true, sizes: "(min-width: 900px) 560px, 100vw" }), flight: true },
    ...p.scenes.map((sid) => {
      const meta = sceneMeta(sid);
      return { html: sceneImg(sid, { sizes: "(min-width: 900px) 560px, 100vw" }), measured: !!meta.measured, sid };
    }),
  ];
  const measuredAt = slides.findIndex((x) => x.measured);
  const others = PRODUCTS.filter((q) => q.style !== p.style)
    .sort((a, b) => styleById(a.style).rank - styleById(b.style).rank)
    .filter((q, i, arr) => arr.findIndex((r) => r.style === q.style) === i)
    .slice(0, 4);

  const html = `
    <div class="pdp" data-flight>
      <div class="pdp-gallery">
        <div class="pdp-track" id="pdp-track" aria-label="Photos of the ${esc(s.name)}">
          ${slides.map((x, i) => `
            <div class="pdp-slide" ${x.flight ? "data-flight-img" : ""} aria-label="Photo ${i + 1} of ${slides.length}">
              ${x.html}
              ${x.measured ? `<span class="pdp-cap gpill">${icon("ruler")} Measured by the shop</span>` : ""}
            </div>`).join("")}
        </div>
        ${slides.length > 1 ? `<div class="pdp-dots glass" aria-hidden="true">${slides.map((_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("")}</div>` : ""}
      </div>

      <div class="pdp-info"><div class="wrap">
        <div class="pdp-row">
          <div>
            <div class="eyebrow">${esc(catName(p.cat))} bag${p.isNew ? " · New" : ""}</div>
            <h1 class="d2 pdp-name" data-bar-anchor>${esc(s.name)}</h1>
            <p class="t-sub" style="margin-top:4px">${esc(p.colour)}</p>
          </div>
          <div class="pdp-price">${priceHTML(p.price)}</div>
        </div>

        <div class="pdp-earn">${icon("flower")}<span>${m
          ? `Earn <b>${earn} points</b> with this bag — ${tier.rate}% back as ${tier.name}.`
          : `Club members earn <b>${earn} points</b> on this bag. <button type="button" class="u" id="pdp-join" style="color:inherit;font-weight:600">Join free</button>`}</span></div>

        ${sibs.length > 1 ? `
        <div class="pdp-colour">
          <p class="t-sub">Colour: <b>${esc(p.colour)}</b></p>
          <div class="pdp-sw" role="list">
            ${sibs.map((q) => `<a role="listitem" href="#/p/${q.id}" data-swap aria-label="${esc(q.colour)}" aria-current="${q.id === p.id}" style="background:${q.hex}"></a>`).join("")}
          </div>
        </div>` : ""}

        <div class="pdp-buy">
          <button class="btn" type="button" data-add="${p.id}">Add to bag <span class="btn-sum">· ${price(p.price)}</span></button>
          ${heartHTML(p, { cls: "icon-btn" })}
        </div>

        <div class="pdp-promise">
          <div>${icon("truck")}<span>${esc(DELIVERY[0].note)} · ${esc(DELIVERY[1].name.toLowerCase())} across Iran</span></div>
          <div>${icon("send")}<span>A question about this bag? <a class="u" href="https://ig.me/m/${BRAND.instagram}" target="_blank" rel="noopener">Message us on Instagram</a></span></div>
        </div>

        <section class="sec">
          <p class="pdp-blurb">${esc(s.blurb)}</p>
          <ul class="bullets">${s.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
        </section>

        ${s.size ? `
        <section class="sec-sm">
          <div class="list">
            <button class="cell" type="button" id="pdp-measure">
              <span class="cell-ico">${icon("ruler")}</span>
              <span class="cell-t"><span class="cell-n">${s.size.h} cm tall, ${s.size.w} cm wide</span><span class="cell-d">The shop's own measurement — see the photo</span></span>
              <span class="cell-v"><span class="chev">${icon("chevronR")}</span></span>
            </button>
          </div>
        </section>` : ""}

        <section class="sec">
          <div class="sec-head"><h2 class="d4">More from the rail</h2><a class="link" href="#/shop">Shop all ${icon("chevronR")}</a></div>
          <div class="grid">${others.map((q) => tileHTML(q)).join("")}</div>
        </section>
      </div></div>
    </div>`;

  return {
    html,
    className: "no-pad",
    bar: {
      title: s.name,
      back: true,
      logo: "never",
      docTitle: `${s.name}, ${p.colour}`,
      right: `<button class="gbtn hide-titled" type="button" id="pdp-share" aria-label="Share">${icon("share")}</button>
              <button class="bar-add" type="button" data-add="${p.id}" aria-label="Add ${esc(s.name)} to the bag">Add</button>`,
      mountBar(el) {
        el.querySelector("#pdp-share").addEventListener("click", () =>
          shareLink({ title: `${s.name} — ${BRAND.name}`, text: `${s.name} in ${p.colour}, ${price(p.price)}`, url: location.href }));
      },
    },
    mount(screen) {
      const track = screen.querySelector("#pdp-track");
      const dots = [...screen.querySelectorAll(".pdp-dots i")];
      if (dots.length) {
        let raf = 0;
        track.addEventListener("scroll", () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
            dots.forEach((d, k) => d.classList.toggle("on", k === i));
          });
        }, { passive: true });
      }
      screen.querySelectorAll("[data-swap]").forEach((a) => a.addEventListener("click", (e) => {
        e.preventDefault();
        if (a.getAttribute("aria-current") === "true") return;
        go(a.getAttribute("href"), { replace: true });
      }));
      screen.querySelector("#pdp-measure")?.addEventListener("click", () => {
        scrollTo({ top: 0, behavior: "smooth" });
        track.scrollTo({ left: track.clientWidth * measuredAt, behavior: "smooth" });
      });
      screen.querySelector("#pdp-join")?.addEventListener("click", () => joinSheet({ onDone: refresh, earn }));
    },
  };
}
