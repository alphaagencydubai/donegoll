// Checkout. One screen, grouped the way iOS groups a form: who, where, how to
// pay, the club, the bag, the total. Every choice reprices in place — the form
// keeps what was typed. A guest can join the club right here (the CRM's front
// door); points only ever spend for someone who was a member before checkout,
// so the total never changes under the customer's thumb.

import { CLUB, DELIVERY, PAYMENT } from "../config.js";
import { esc, price, plural, normalPhone, prettyPhone, wait } from "../util.js";
import { icon } from "../icons.js";
import { byId } from "../data.js";
import { bag, bagCount, quote, member, prefs, setPrefs, placeOrder, join } from "../store.js";
import { productImg, island } from "../ui.js";
import { haptic, reduced } from "../motion.js";
import { go } from "../router.js";
import { clubCardHTML, summaryHTML } from "./bag.js";

export default function checkout() {
  if (!bag().length) return { redirect: "#/bag" };
  const m = member();
  const pr = prefs();
  const st = { delivery: pr.delivery, payment: pr.payment, usePoints: pr.usePoints, join: true };
  if (st.payment === "cod" && st.delivery !== "courier") st.payment = "online";
  const q = quote(st);

  const opt = (name, value, n, d, v, { checked = false, disabled = false } = {}) => `
    <label class="opt"><input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span class="opt-dot" aria-hidden="true"></span>
      <span class="opt-t"><span class="opt-n">${n}</span><span class="opt-d">${d}</span></span>
      ${v ? `<span class="opt-v">${v}</span>` : ""}
    </label>`;
  const fee = (d) => { const x = quote({ ...st, delivery: d.id }); return x.shipFree ? `<s>${price(d.price)}</s>Free` : price(d.price); };

  const html = `
    <div class="wrap pad-top">
      <header class="ph">
        <h1 class="lt">Checkout</h1>
        <p class="t-sub">${plural(bagCount(), "bag")} · <span id="co-top">${price(q.total)}</span></p>
      </header>
      <form id="co" novalidate>
        <section>
          <h2 class="list-h">Contact</h2>
          <label class="field" id="f-name"><span class="field-l">Name</span>
            <input class="input" name="name" autocomplete="name" placeholder="First and last name" value="${esc(m?.name || "")}">
            <span class="field-err">Who should the courier ask for?</span></label>
          <label class="field" id="f-phone"><span class="field-l">Mobile</span>
            <input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0912 345 6789" value="${esc(prettyPhone(m?.phone || ""))}">
            <span class="field-err">An Iranian mobile, like 0912 345 6789.</span></label>
        </section>

        <section class="sec-sm">
          <h2 class="list-h">Delivery</h2>
          <div class="opts" id="co-delivery">
            ${DELIVERY.map((d) => opt("delivery", d.id, d.name, d.note, fee(d), { checked: d.id === st.delivery })).join("")}
          </div>
          <label class="field" id="f-address" style="margin-top:12px"><span class="field-l">Address</span>
            <textarea class="input" name="address" rows="3" autocomplete="street-address" placeholder="Street, alley, building, unit">${esc(pr.address || "")}</textarea>
            <span class="field-err">We need a full address to deliver to.</span></label>
          <label class="field" id="f-city"><span class="field-l">City</span>
            <input class="input" name="city" autocomplete="address-level2" value="${esc(pr.city || "Tehran")}">
            <span class="field-err">Which city?</span></label>
        </section>

        <section class="sec-sm">
          <h2 class="list-h">Payment</h2>
          <div class="opts" id="co-pay">
            ${PAYMENT.map((p) => opt("payment", p.id, p.name, p.note, "", { checked: p.id === st.payment, disabled: p.id === "cod" && st.delivery !== "courier" })).join("")}
          </div>
        </section>

        <section class="sec-sm">
          <div class="club-card" id="co-club">${clubCardHTML(q, { checkout: true, joining: st.join })}</div>
        </section>

        <section class="sec-sm">
          <h2 class="list-h">Your bag</h2>
          <div class="list" style="padding:14px 16px"><div class="mini-lines">
            ${bag().map((l) => { const p = byId(l.pid); return `
              <div class="mini-line">${productImg(p, { sizes: "46px" })}
                <span class="t">${esc(p.name)}<small>${esc(p.colour)}${l.qty > 1 ? ` · ×${l.qty}` : ""}</small></span>
                <span class="v">${price(p.price * l.qty)}</span></div>`; }).join("")}
          </div></div>
        </section>

        <section class="sec-sm"><div class="list" id="co-sum">${summaryHTML(q)}</div></section>

        <label class="field sec-sm"><span class="field-l">Note for the shop (optional)</span>
          <textarea class="input" name="note" rows="2" placeholder="Anything we should know?"></textarea></label>

        <button class="btn btn--block sec-sm" type="submit" id="pay"></button>
        <p class="pay-note">${icon("lock")} Preview — no card is charged and nothing is sent.</p>
      </form>
    </div>`;

  return {
    html,
    mount(screen) {
      const form = screen.querySelector("#co");
      const pay = screen.querySelector("#pay");
      const current = () => quote({ ...st, usePoints: member() ? st.usePoints : false });
      const label = (q2) => { pay.textContent = st.payment === "online" ? `Pay ${price(q2.total)}` : `Place order · ${price(q2.total)}`; };
      const repaint = () => {
        const q2 = current();
        screen.querySelector("#co-sum").innerHTML = summaryHTML(q2);
        screen.querySelector("#co-top").textContent = price(q2.total);
        const club = screen.querySelector("#co-club");
        club.innerHTML = clubCardHTML(q2, { checkout: true, joining: st.join });
        wireClub(club);
        screen.querySelectorAll('#co-delivery .opt').forEach((el) => {
          const d = DELIVERY.find((x) => x.id === el.querySelector("input").value);
          el.querySelector(".opt-v").innerHTML = fee(d);
        });
        label(q2);
      };
      const wireClub = (club) => {
        club.querySelector("#use-pts")?.addEventListener("change", (e) => { st.usePoints = e.target.checked; setPrefs({ usePoints: st.usePoints }); repaint(); });
        club.querySelector("#co-join")?.addEventListener("change", (e) => { st.join = e.target.checked; });
      };
      wireClub(screen.querySelector("#co-club"));
      label(current());

      form.querySelectorAll('input[name="delivery"]').forEach((r) => r.addEventListener("change", () => {
        st.delivery = r.value;
        const cod = form.querySelector('input[name="payment"][value="cod"]');
        cod.disabled = st.delivery !== "courier";
        if (cod.disabled && st.payment === "cod") { st.payment = "online"; form.querySelector('input[name="payment"][value="online"]').checked = true; }
        repaint();
      }));
      form.querySelectorAll('input[name="payment"]').forEach((r) => r.addEventListener("change", () => { st.payment = r.value; label(current()); }));
      // clear an error as soon as it is being fixed
      form.querySelectorAll(".field .input").forEach((el) => el.addEventListener("input", () => el.closest(".field").classList.remove("bad")));

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (pay.disabled) return;
        const name = form.name.value.trim();
        const phone = normalPhone(form.phone.value);
        const address = form.address.value.trim();
        const city = form.city.value.trim();
        const bad = { name: name.length < 2, phone: !phone, address: address.length < 8, city: city.length < 2 };
        Object.entries(bad).forEach(([k, v]) => screen.querySelector(`#f-${k}`).classList.toggle("bad", v));
        const first = Object.keys(bad).find((k) => bad[k]);
        if (first) {
          haptic([20, 40, 20]);
          const el = screen.querySelector(`#f-${first} .input`);
          el.focus({ preventScroll: true });
          el.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
          return;
        }
        pay.disabled = true;
        pay.innerHTML = `<span class="spin" aria-hidden="true"></span> ${st.payment === "online" ? "Paying…" : "Placing your order…"}`;
        setPrefs({ delivery: st.delivery, payment: st.payment, address, city });
        await wait(reduced() ? 60 : 1100);
        const wasMember = !!member();
        if (!wasMember && st.join) join({ name, phone });
        const order = placeOrder({
          contact: { name, phone }, address, city, delivery: st.delivery, payment: st.payment,
          note: form.note.value.trim(), usePoints: wasMember ? st.usePoints : false,
        });
        if (!order) {
          pay.disabled = false; label(current());
          island("Your bag is empty", { ico: "bag" });
          return;
        }
        haptic([12, 40, 18]);
        go(`#/thanks/${order.id}`, { replace: true });
      });
    },
  };
}
