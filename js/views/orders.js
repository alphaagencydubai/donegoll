// Orders: the list, and one order. The status moves on by itself in this preview
// (placed → packed → with the courier → delivered) and says so on screen.

import { BRAND, PAYMENT } from "../config.js";
import { esc, money, price, plural, dateShort, dateLong, dateTime, prettyPhone } from "../util.js";
import { icon } from "../icons.js";
import { byId } from "../data.js";
import { orders, orderById, stageOf } from "../store.js";
import { productImg, emptyArt } from "../ui.js";

export function timelineHTML(o) {
  const { steps, idx } = stageOf(o);
  return `<div class="timeline">${steps.map((s, i) => `
    <div class="tl ${i < idx ? "done" : i === idx ? "now" : ""}">
      <span class="tl-dot" aria-hidden="true"><i></i></span>
      <div><div class="tl-n">${s.label}</div><div class="tl-d">${i <= idx ? dateTime(s.at) : "Coming up"}</div></div>
    </div>`).join("")}</div>`;
}

export function linesHTML(o) {
  return `<div class="mini-lines">${o.lines.map((l) => {
    const p = byId(l.pid);
    const img = p ? productImg(p, { sizes: "46px" }) : `<span class="ph-img"></span>`;
    return `<a class="mini-line" href="#/p/${l.pid}">${img}
      <span class="t">${esc(l.name)}<small>${esc(l.colour)}${l.qty > 1 ? ` · ×${l.qty}` : ""}</small></span>
      <span class="v">${price(l.unit * l.qty)}</span></a>`;
  }).join("")}</div>`;
}

const stageLabel = (o) => { const { steps, idx } = stageOf(o); return { label: steps[idx].label, live: idx < steps.length - 1 }; };

export function ordersView() {
  const list = orders();
  if (!list.length) {
    return {
      html: `
        <div class="wrap pad-top">
          <header class="ph"><h1 class="lt">Orders</h1></header>
          <div class="empty">
            <div class="empty-art">${emptyArt("orders")}</div>
            <p class="d3">No orders yet.</p>
            <p class="t-sub">When you order a bag, it shows up here with its status.</p>
            <a class="btn" href="#/shop">Shop the rail</a>
          </div>
        </div>`,
    };
  }
  return {
    html: `
      <div class="wrap pad-top">
        <header class="ph"><h1 class="lt">Orders</h1><p class="t-sub">${plural(list.length, "order")}</p></header>
        <div class="stagger">
          ${list.map((o) => {
            const s = stageLabel(o);
            const n = o.lines.reduce((k, l) => k + l.qty, 0);
            return `
            <a class="order-card" href="#/order/${o.id}">
              <span class="order-thumbs">${o.lines.slice(0, 3).map((l) => { const p = byId(l.pid); return p ? productImg(p, { sizes: "46px" }) : ""; }).join("")}</span>
              <span class="cell-t">
                <span class="cell-n">${o.no} ${o.sample ? `<span class="sample">Sample</span>` : ""}</span>
                <span class="cell-d">${dateShort(o.at)} · ${plural(n, "bag")}</span>
              </span>
              <span class="order-r"><b class="money">${price(o.total)}</b><span class="status ${s.live ? "live" : ""}">${s.label}</span></span>
            </a>`;
          }).join("")}
        </div>
      </div>`,
  };
}

export function orderView({ id }) {
  const o = orderById(id);
  if (!o) return { redirect: "#/orders" };
  const pay = PAYMENT.find((p) => p.id === o.payment);
  const row = (n, v, d = "", cls = "") => `<div class="cell plain ${cls}"><span class="cell-t"><span class="cell-n">${n}</span>${d ? `<span class="cell-d">${d}</span>` : ""}</span><span class="cell-v money">${v}</span></div>`;
  return {
    bar: { title: `Order ${o.no}` },
    html: `
      <div class="wrap pad-top">
        <header class="ph">
          <div class="eyebrow">${dateLong(o.at)}${o.sample ? ` · <span class="sample">Sample</span>` : ""}</div>
          <h1 class="d2" style="margin-top:6px" data-bar-anchor>Order ${o.no}</h1>
        </header>

        <section><div class="list" style="padding:18px 16px">${timelineHTML(o)}
          <p class="t-foot" style="margin-top:14px">Preview: the status moves on by itself so each step can be seen.</p></div></section>

        <section class="sec-sm"><h2 class="list-h">Bags</h2><div class="list" style="padding:14px 16px">${linesHTML(o)}</div></section>

        <section class="sec-sm"><div class="list">
          ${row("Subtotal", price(o.subtotal))}
          ${o.discount ? row("Points", `−${price(o.discount)}`, `${money(o.used)} points`) : ""}
          ${row("Delivery", o.delivery.fee ? price(o.delivery.fee) : "Free", o.delivery.name)}
          ${row("Total", price(o.total), "", "total")}
        </div></section>

        <section class="sec-sm"><div class="list">
          <div class="cell"><span class="cell-ico cocoa">${icon("flower")}</span><span class="cell-t"><span class="cell-n">${o.earned ? `+${money(o.earned)} points` : "No points"}</span>
            <span class="cell-d">${o.earned ? "Added to your club card" : "This was a guest order — members earn on every bag"}</span></span></div>
          <div class="cell"><span class="cell-ico">${icon("pin")}</span><span class="cell-t"><span class="cell-n">${esc(o.contact?.name || "")}</span>
            <span class="cell-d">${esc(o.address)}${o.city ? ", " + esc(o.city) : ""} · ${esc(prettyPhone(o.contact?.phone || ""))}</span></span></div>
          <div class="cell"><span class="cell-ico">${icon("card")}</span><span class="cell-t"><span class="cell-n">${esc(pay?.name || "")}</span>
            <span class="cell-d">${esc(pay?.note || "")}</span></span></div>
          ${o.note ? `<div class="cell"><span class="cell-ico">${icon("edit")}</span><span class="cell-t"><span class="cell-n">Your note</span><span class="cell-d">${esc(o.note)}</span></span></div>` : ""}
        </div></section>

        <section class="sec-sm"><a class="btn btn--line btn--block" href="https://ig.me/m/${BRAND.instagram}" target="_blank" rel="noopener">${icon("send")} Message us about this order</a></section>
      </div>`,
  };
}
