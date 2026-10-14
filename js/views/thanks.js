// Thank you. Celebrates only the order just paid for: any other arrival at this
// address is sent to the order itself, which is already the receipt. The points
// count up, the ladder fills from where it was to where it is, a few petals.

import { CLUB } from "../config.js";
import { esc, money, price, firstName } from "../util.js";
import { icon } from "../icons.js";
import { orderById, justConfirmed, member, ladder } from "../store.js";
import { petals } from "../ui.js";
import { countUp } from "../motion.js";
import { timelineHTML, linesHTML } from "./orders.js";

export default function thanks({ id }) {
  const o = orderById(id);
  if (!o) return { redirect: "#/orders" };
  if (justConfirmed() !== id) return { redirect: `#/order/${id}` };
  const m = member();
  const before = typeof o.before === "number" ? o.before : 0;
  const L0 = ladder(before);
  const L1 = ladder(before, o.earned);
  const up = o.levelTo && o.levelFrom && o.levelTo !== o.levelFrom;
  const upTier = CLUB.tiers.find((t) => t.id === o.levelTo);
  const who = firstName(o.contact?.name);

  const html = `
    <div class="wrap pad-top">
      <div class="thanks-hero">
        <div class="tick" aria-hidden="true">${icon("check")}</div>
        <h1 class="d2" style="margin-top:18px">Thank you${who ? `, ${esc(who)}` : ""}.</h1>
        <p class="t-sub" style="margin-top:8px">Order <b>${o.no}</b> is in. ${esc(o.delivery.name)} to ${esc(o.city || "you")}.</p>
      </div>

      ${o.earned ? `
      <div class="earned" id="earned">
        <div class="earned-n"><span id="earned-n">0</span></div>
        <div class="earned-l">points added to your club card${m ? ` · ${money(m.points)} to spend` : ""}</div>
        <div class="progress" style="max-width:320px;margin:16px auto 0" aria-hidden="true"><i id="earned-bar" style="width:${L0.pct}%"></i></div>
        <div class="progress-l" style="max-width:320px;margin:8px auto 0"><span>${L0.tier.name}</span><span>${L0.next ? L0.next.name : "Top tier"}</span></div>
        ${up ? `<div class="levelup">${icon("sparkle")} You're ${esc(upTier.name)} now — ${upTier.rate}% back</div>` : ""}
      </div>` : `
      <div class="note sec-sm">${icon("flower")}<span>This was a guest order, so it earned no points. <a class="u" href="#/club">Join the club</a> and the next bag earns ${CLUB.tiers[0].rate}% back — plus ${CLUB.welcome} points to start.</span></div>`}

      <section class="sec-sm"><div class="list" style="padding:18px 16px">${timelineHTML(o)}
        <p class="t-foot" style="margin-top:14px">Preview: the status moves on by itself so each step can be seen.</p></div></section>

      <section class="sec-sm"><div class="list" style="padding:14px 16px">${linesHTML(o)}
        <div class="hr" style="margin:14px 0 12px"></div>
        <div class="row-flex"><span class="t-sub">Paid</span><span class="spacer"></span><b class="money">${price(o.total)}</b></div></div></section>

      <div class="btn-row sec-sm">
        <a class="btn btn--soft" href="#/order/${o.id}">View order</a>
        <a class="btn" href="#/shop">Keep shopping</a>
      </div>
    </div>`;

  return {
    html,
    bar: { title: "Thank you", back: false },
    mount(screen) {
      const n = screen.querySelector("#earned-n");
      if (!n) return;
      countUp(n, o.earned, 1100, (v) => "+" + Math.round(v).toLocaleString("en-US"));
      const bar = screen.querySelector("#earned-bar");
      setTimeout(() => { bar.style.width = `${up ? 100 : L1.after}%`; }, 260);
      setTimeout(() => petals(screen.querySelector("#earned"), { count: up ? 22 : 14 }), 420);
    },
  };
}
