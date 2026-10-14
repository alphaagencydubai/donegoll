// Saved bags. A heart anywhere puts a bag here; the heart here takes it out.

import { plural } from "../util.js";
import { byId } from "../data.js";
import { saved } from "../store.js";
import { tileHTML, emptyArt } from "../ui.js";

export default function savedView() {
  const list = saved().map(byId).filter(Boolean);
  if (!list.length) {
    return {
      html: `
        <div class="wrap pad-top">
          <header class="ph"><h1 class="lt">Saved</h1></header>
          <div class="empty">
            <div class="empty-art">${emptyArt("saved")}</div>
            <p class="d3">Nothing saved yet.</p>
            <p class="t-sub">Tap the heart on any bag to keep it here for later.</p>
            <a class="btn" href="#/shop">Shop the rail</a>
          </div>
        </div>`,
    };
  }
  return {
    html: `
      <div class="wrap pad-top">
        <header class="ph"><h1 class="lt">Saved</h1><p class="t-sub">${plural(list.length, "bag")}</p></header>
        <div class="grid stagger">${list.map((p) => tileHTML(p)).join("")}</div>
      </div>`,
  };
}
