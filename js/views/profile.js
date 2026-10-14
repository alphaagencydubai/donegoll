// Profile. For a member: the club card — a wallet pass in suede that turns over
// to a QR code for the shop's counter — the tier ladder, orders, saved bags,
// details, appearance. For a guest: why to join, and a way to see a member's
// account without making one.

import { WORDMARK } from "../brand.js";
import { BRAND, CLUB, PREVIEW } from "../config.js";
import { esc, money, price, initials, monthYear, prettyPhone, normalPhone } from "../util.js";
import { icon } from "../icons.js";
import { qrSVG } from "../qr.js";
import { member, ladder, orders, saved, prefs, setPrefs, seedSample, signOut, updateMember, forgetEverything } from "../store.js";
import { joinSheet, openSheet, segHTML, wireSeg, alphaSign, island } from "../ui.js";
import { isStandalone, isIOS, canPrompt, promptInstall } from "../install.js";
import { spring, haptic } from "../motion.js";
import { refresh, go, query } from "../router.js";

const THEMES = [{ id: "system", label: "System" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }];

const cell = ({ href = "", id = "", ico, n, d = "", v = "", cls = "", ext = false, chev = true }) => {
  const tag = href ? "a" : id ? "button" : "div";
  const attrs = href ? `href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}` : id ? `type="button" id="${id}"` : "";
  return `<${tag} class="cell ${cls}" ${attrs}>
    ${ico ? `<span class="cell-ico ${ico === "flower" ? "cocoa" : ""}">${icon(ico)}</span>` : ""}
    <span class="cell-t"><span class="cell-n">${n}</span>${d ? `<span class="cell-d">${d}</span>` : ""}</span>
    <span class="cell-v">${v}${chev && (href || id) ? `<span class="chev">${icon("chevronR")}</span>` : ""}</span>
  </${tag}>`;
};

function appSection() {
  return `
    <section class="sec-sm">
      <h2 class="list-h">App</h2>
      <div class="list">
        <div class="cell"><span class="cell-ico">${icon("halfCircle")}</span><span class="cell-t"><span class="cell-n">Appearance</span></span></div>
        <div class="cell-seg">${segHTML("theme", THEMES, prefs().theme)}</div>
        ${isStandalone() ? "" : cell({ id: "install", ico: "download", n: "Install Done Goll", d: "Put the shop on your home screen" })}
      </div>
    </section>
    <section class="sec-sm">
      <h2 class="list-h">${BRAND.name}</h2>
      <div class="list">
        ${cell({ href: BRAND.instagramUrl, ext: true, ico: "instagram", n: "Instagram", d: `@${BRAND.instagram}` })}
        ${cell({ href: `https://ig.me/m/${BRAND.instagram}`, ext: true, ico: "send", n: "Message us", d: "Measurements, stock, anything else" })}
        ${cell({ ico: "pin", n: `${BRAND.city}, ${BRAND.country}`, chev: false })}
      </div>
    </section>`;
}

function cardHTML(m, tier) {
  return `
    <div class="mcard-wrap">
      <div class="mcard" id="mcard" data-tier="${tier.id}" role="button" tabindex="0" aria-label="Your club card: ${money(m.points)} points, ${tier.name}. Turn it over for the QR code.">
        <div class="mcard-face">
          <div class="mcard-top"><span class="mcard-mark">${WORDMARK}</span><span class="mcard-tier">${icon("flower")} ${tier.name}</span></div>
          <div class="mcard-pts"><b>${money(m.points)}</b><span>points · worth ${price(m.points * CLUB.tomanPerPoint)}</span></div>
          <div class="mcard-foot"><span>${esc(m.name)}</span><span class="id">${m.id}</span></div>
        </div>
        <div class="mcard-face mcard-back" aria-hidden="true">
          <div class="mcard-qr">${m.id.includes("·") ? "" : qrSVG(m.id, { fg: "#141312" })}</div>
          <p>Show this at the shop to collect points in person</p>
        </div>
      </div>
    </div>
    <p class="mcard-hint">Tap the card to turn it over</p>`;
}

export default function profile() {
  const m = member();
  return m ? memberView(m) : guestView();
}

function guestView() {
  const ghost = { name: "Your name", id: "DG······", points: 0 };
  const html = `
    <div class="wrap pad-top">
      <header class="ph"><h1 class="lt">Profile</h1><p class="t-sub">Your club card, orders and saved bags live here.</p></header>
      <div style="opacity:.5;filter:saturate(.6);pointer-events:none" aria-hidden="true">${cardHTML(ghost, CLUB.tiers[0]).replace('<p class="mcard-hint">Tap the card to turn it over</p>', "")}</div>
      <div class="join-card sec-sm">
        <span class="eyebrow cocoa">${icon("flower")} ${CLUB.name}</span>
        <h2 class="d3" style="margin-top:8px">Points on every bag.</h2>
        <ul class="perks">
          <li><span class="cell-ico cocoa">${icon("gift")}</span><span>${CLUB.welcome} points the moment you join</span></li>
          <li><span class="cell-ico cocoa">${icon("flower")}</span><span>${CLUB.tiers[0].rate}% back in points on every order — up to ${CLUB.tiers[CLUB.tiers.length - 1].rate}% as you climb</span></li>
          <li><span class="cell-ico cocoa">${icon("card")}</span><span>Every point is ${money(CLUB.tomanPerPoint)} T off at checkout</span></li>
        </ul>
        <button class="btn btn--block" type="button" id="join">Join free</button>
        <button class="btn btn--quiet btn--block" type="button" id="sample" style="margin-top:4px">Preview a member's account</button>
      </div>
      <section class="sec-sm"><div class="list">
        ${cell({ href: "#/orders", ico: "box", n: "Orders", v: orders().length ? String(orders().length) : "" })}
        ${cell({ href: "#/saved", ico: "heart", n: "Saved", v: saved().length ? String(saved().length) : "" })}
        ${cell({ href: "#/club", ico: "flower", n: "How the club works" })}
      </div></section>
      ${appSection()}
      ${PREVIEW.enabled ? `<p class="t-foot sec-sm">${esc(PREVIEW.note)}</p>` : ""}
      ${alphaSign()}
    </div>`;
  return {
    html,
    mount(screen) {
      screen.querySelector("#join").addEventListener("click", () => joinSheet({ onDone: refresh }));
      screen.querySelector("#sample").addEventListener("click", () => {
        seedSample();
        refresh();
        island("This is a sample member — sign out to clear it", { ico: "info" });
      });
      wireApp(screen);
    },
  };
}

function memberView(m) {
  const L = ladder(m.lifetime);
  const html = `
    <div class="wrap pad-top">
      <header class="ph who">
        <span class="avatar" aria-hidden="true">${esc(initials(m.name))}</span>
        <div style="min-width:0">
          <h1 class="lt truncate" style="font-size:30px">${esc(m.name)}</h1>
          <p class="t-sub">Member since ${monthYear(m.joined)} ${m.sample ? `<span class="sample">Sample</span>` : ""}</p>
        </div>
      </header>

      ${cardHTML(m, L.tier)}

      <section class="sec">
        <div class="sec-head"><h2 class="d4">Your tier</h2><a class="link" href="#/club">How it works ${icon("chevronR")}</a></div>
        <div class="ladder">
          ${CLUB.tiers.map((t) => `
            <div class="rung ${t.id === L.tier.id ? "on" : t.min < L.tier.min ? "done" : ""}">
              <div class="rung-n">${t.name}</div>
              <div class="rung-r">${t.rate}% back</div>
              <div class="rung-m">${t.min ? `from ${money(t.min)} pts` : "when you join"}</div>
            </div>`).join("")}
        </div>
        <div class="progress" aria-hidden="true"><i style="width:${L.pct}%"></i></div>
        <div class="progress-l"><span>${money(m.lifetime)} points earned</span><span>${L.next ? `${money(L.toNext)} to ${L.next.name}` : "Top tier"}</span></div>
      </section>

      <section class="sec-sm"><div class="list">
        ${cell({ href: "#/orders", ico: "box", n: "Orders", v: orders().length ? String(orders().length) : "" })}
        ${cell({ href: "#/saved", ico: "heart", n: "Saved", v: saved().length ? String(saved().length) : "" })}
        ${cell({ href: "#/club", ico: "flower", n: "Points history", d: `${money(m.points)} to spend` })}
        ${cell({ id: "edit", ico: "edit", n: "Your details", d: `${esc(prettyPhone(m.phone))}` })}
      </div></section>

      ${appSection()}

      <section class="sec-sm"><div class="list">${cell({ id: "signout", ico: "logout", n: "Sign out", cls: "danger", chev: false })}</div></section>
      ${PREVIEW.enabled ? `<p class="t-foot sec-sm">${esc(PREVIEW.note)}</p>` : ""}
      ${alphaSign()}
    </div>`;

  return {
    html,
    bar: { right: `<button class="gbtn" type="button" id="bar-qr" aria-label="Show my club QR code">${icon("qr")}</button>` , mountBar(el) { el.querySelector("#bar-qr").addEventListener("click", () => document.querySelector("#mcard")?.click()); } },
    mount(screen) {
      // the card turns over on a spring, and can be turned back mid-turn
      const card = screen.querySelector("#mcard");
      let deg = 0, anim = null, flipped = false;
      const turn = () => {
        flipped = !flipped;
        haptic(8);
        anim?.stop();
        anim = spring({ from: deg, to: flipped ? 180 : 0, damping: .78, response: .55, precision: .1,
          onUpdate: (v) => { deg = v; card.style.transform = `rotateY(${v.toFixed(2)}deg)`; } });
        card.querySelector(".mcard-back").setAttribute("aria-hidden", String(!flipped));
      };
      card.addEventListener("click", turn);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(); } });

      screen.querySelector("#edit").addEventListener("click", () => detailsSheet(m));
      screen.querySelector("#signout").addEventListener("click", () => signOutSheet(m));
      wireApp(screen);
    },
  };
}

function wireApp(screen) {
  const seg = screen.querySelector('[data-seg="theme"]');
  if (seg) wireSeg(seg, (v) => setPrefs({ theme: v }));
  screen.querySelector("#install")?.addEventListener("click", installFlow);
  if (query().install === "1") setTimeout(installFlow, 300);
}

async function installFlow() {
  if (canPrompt()) { await promptInstall(); return; }
  const ios = isIOS();
  openSheet({
    title: "Install Done Goll",
    body: `
      <p class="t-sub" style="margin-bottom:16px">It opens full screen from your home screen, like any app — and your bag and club card come with it.</p>
      <div class="steps3">
        ${ios ? `
          <div class="step3"><b>1</b><div><p class="t-head">Tap Share</p><p class="t-sub">The square with the arrow, in Safari's toolbar.</p></div></div>
          <div class="step3"><b>2</b><div><p class="t-head">Add to Home Screen</p><p class="t-sub">Scroll the list a little if you don't see it.</p></div></div>
          <div class="step3"><b>3</b><div><p class="t-head">Tap Add</p><p class="t-sub">Done Goll lands next to your other apps.</p></div></div>`
        : `
          <div class="step3"><b>1</b><div><p class="t-head">Open the browser menu</p><p class="t-sub">The ⋮ or ⋯ button next to the address bar.</p></div></div>
          <div class="step3"><b>2</b><div><p class="t-head">Install app</p><p class="t-sub">Or “Add to Home screen”, depending on the browser.</p></div></div>`}
      </div>`,
  });
}

function detailsSheet(m) {
  openSheet({
    title: "Your details",
    body: `
      <form id="det" novalidate>
        <label class="field" id="d-name"><span class="field-l">Name</span><input class="input" name="name" autocomplete="name" value="${esc(m.name)}"><span class="field-err">At least two letters.</span></label>
        <label class="field" id="d-phone"><span class="field-l">Mobile</span><input class="input" name="phone" type="tel" inputmode="tel" value="${esc(prettyPhone(m.phone))}"><span class="field-err">An Iranian mobile, like 0912 345 6789.</span></label>
      </form>`,
    foot: `<button class="btn btn--block" type="submit" form="det">Save</button>`,
    mount(sheet, close) {
      const f = sheet.querySelector("#det");
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = f.name.value.trim(), phone = normalPhone(f.phone.value);
        sheet.querySelector("#d-name").classList.toggle("bad", name.length < 2);
        sheet.querySelector("#d-phone").classList.toggle("bad", !phone);
        if (name.length < 2 || !phone) return;
        updateMember({ name, phone });
        close();
        refresh();
        island("Saved", { ico: "check" });
      });
    },
  });
}

function signOutSheet(m) {
  openSheet({
    title: "Sign out?",
    body: `<p class="t-sub">${m.sample
      ? "This clears the sample member and their orders."
      : `In this preview your card lives on this phone only, so signing out clears your ${money(m.points)} points. With the shop's real system they would be waiting when you sign back in.`}</p>`,
    foot: `<div class="btn-row"><button class="btn btn--soft" type="button" id="so-no">Cancel</button><button class="btn btn--danger" type="button" id="so-yes">Sign out</button></div>`,
    mount(sheet, close) {
      sheet.querySelector("#so-no").addEventListener("click", () => close());
      sheet.querySelector("#so-yes").addEventListener("click", () => { signOut(); close(); refresh(); });
    },
  });
}

export { forgetEverything, go };
