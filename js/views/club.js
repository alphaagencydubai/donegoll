// The club, explained — and, for a member, their ledger. Rates and rewards are
// Alpha's proposal; the page says so.

import { CLUB } from "../config.js";
import { esc, money, price, dateShort } from "../util.js";
import { icon } from "../icons.js";
import { member, ladder } from "../store.js";
import { joinSheet } from "../ui.js";
import { refresh } from "../router.js";

export default function club() {
  const m = member();
  const L = m ? ladder(m.lifetime) : null;
  const rates = CLUB.tiers.map((t) => `${t.rate}%`).join(", ").replace(/, ([^,]*)$/, " or $1");

  const html = `
    <div class="wrap pad-top">
      <header class="ph">
        <div class="eyebrow cocoa">${icon("flower")} Loyalty</div>
        <h1 class="lt" style="margin-top:6px">${CLUB.name}</h1>
        <p class="t-sub">Points on every bag. Every point is worth ${money(CLUB.tomanPerPoint)} T at checkout — one number, nothing to convert.</p>
      </header>

      ${m ? `
      <div class="club-card">
        <div class="row-flex"><span class="eyebrow">${icon("flower")} Your points</span><span class="spacer"></span><span class="status live">${L.tier.name}</span></div>
        <div class="club-big"><b>${money(m.points)}</b><span class="t-sub">to spend · ${price(m.points * CLUB.tomanPerPoint)}</span></div>
        <div class="progress" aria-hidden="true"><i style="width:${L.pct}%"></i></div>
        <div class="progress-l"><span>${money(m.lifetime)} earned</span><span>${L.next ? `${money(L.toNext)} to ${L.next.name}` : "Top tier"}</span></div>
      </div>` : `
      <div class="club-card">
        <p class="d3">Join free.</p>
        <p class="club-line">Name and mobile, nothing else. ${CLUB.welcome} points land straight away.</p>
        <button class="btn btn--cocoa btn--md" type="button" id="club-join" style="margin-top:14px">Join the club</button>
      </div>`}

      <section class="sec">
        <h2 class="d4" style="margin-bottom:14px">How it works</h2>
        <div class="steps3">
          <div class="step3"><b>1</b><div><p class="t-head">Join free</p><p class="t-sub">Name and mobile. ${CLUB.welcome} points to start.</p></div></div>
          <div class="step3"><b>2</b><div><p class="t-head">Earn on every order</p><p class="t-sub">${rates} back in points, depending on your tier.</p></div></div>
          <div class="step3"><b>3</b><div><p class="t-head">Spend at checkout</p><p class="t-sub">Flip one switch. Points can pay for up to half of a bag.</p></div></div>
        </div>
      </section>

      <section class="sec">
        <h2 class="d4" style="margin-bottom:14px">Tiers</h2>
        ${CLUB.tiers.map((t) => `
          <div class="tier-card ${L && L.tier.id === t.id ? "on" : ""}">
            <div class="tier-head"><span class="d4">${t.name}</span><span class="pts">${icon("flower")} ${t.rate}% back</span></div>
            <p class="t-foot" style="margin-top:4px">${t.min ? `From ${money(t.min)} points earned` : "The moment you join"}${L && L.tier.id === t.id ? " · you are here" : ""}</p>
            <ul class="tier-perks">${t.perks.map((p) => `<li>${icon("check")}<span>${esc(p)}</span></li>`).join("")}</ul>
          </div>`).join("")}
      </section>

      ${m ? `
      <section class="sec">
        <h2 class="list-h">History</h2>
        <div class="list ledger">
          ${m.history.map((h) => `
            <div class="cell">
              <span class="cell-ico ${h.pts > 0 ? "cocoa" : ""}">${icon(h.type === "welcome" ? "gift" : h.type === "redeem" ? "card" : "bag")}</span>
              <span class="cell-t"><span class="cell-n">${esc(h.note)}</span><span class="cell-d">${dateShort(h.at)}${h.sample ? " · sample" : ""}</span></span>
              <span class="cell-v ${h.pts > 0 ? "plus" : "minus"}">${h.pts > 0 ? "+" : "−"}${money(Math.abs(h.pts))}</span>
            </div>`).join("")}
        </div>
      </section>` : ""}

      <div class="note sec">${icon("info")}<span>These rates and rewards are Alpha Agency's proposal for Done Goll. The shop sets the final ones.</span></div>
    </div>`;

  return {
    html,
    mount(screen) {
      screen.querySelector("#club-join")?.addEventListener("click", () => joinSheet({ onDone: refresh }));
    },
  };
}
