// Shop. Search, categories on a sticky strip, colour and sort in a sheet. The
// filters live in the URL (so Back and a shared link keep them) but changing
// one repaints the grid in place — the page never jumps to the top.

import { esc, plural } from "../util.js";
import { icon } from "../icons.js";
import { PRODUCTS, CATEGORIES, FAMILIES, EDITS, styleById, catName } from "../data.js";
import { tileHTML, openSheet, wireImages, emptyArt } from "../ui.js";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "new", label: "New first" },
  { id: "low", label: "Price: low to high" },
  { id: "high", label: "Price: high to low" },
];

const haystack = (p) => `${p.name} ${p.colour} ${p.family} ${catName(p.cat)} ${styleById(p.style).finish} bag`.toLowerCase();

function results(st) {
  const edit = EDITS.find((e) => e.id === st.edit);
  const words = st.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const list = PRODUCTS.filter((p) =>
    (st.c === "all" || p.cat === st.c) &&
    (!st.f.length || st.f.includes(p.family)) &&
    (!st.isNew || p.isNew) &&
    (!edit || edit.match(p)) &&
    (!words.length || words.every((w) => haystack(p).includes(w))));
  const rank = (p) => styleById(p.style).rank * 100 + p.order;
  const by = {
    featured: (a, b) => rank(a) - rank(b),
    new: (a, b) => (b.isNew - a.isNew) || rank(a) - rank(b),
    low: (a, b) => a.price - b.price || rank(a) - rank(b),
    high: (a, b) => b.price - a.price || rank(a) - rank(b),
  }[st.sort] || ((a, b) => rank(a) - rank(b));
  return list.sort(by);
}

const toHash = (st) => {
  const q = new URLSearchParams();
  if (st.c !== "all") q.set("c", st.c);
  if (st.f.length) q.set("f", st.f.join(","));
  if (st.isNew) q.set("new", "1");
  if (st.edit) q.set("edit", st.edit);
  if (st.sort !== "featured") q.set("sort", st.sort);
  if (st.q) q.set("q", st.q);
  const s = q.toString();
  return "#/shop" + (s ? "?" + s : "");
};

export default function shop(_, q) {
  const st = {
    c: CATEGORIES.some((c) => c.id === q.c) ? q.c : "all",
    f: (q.f || "").split(",").filter((f) => FAMILIES.some((x) => x.id === f)),
    isNew: q.new === "1",
    edit: EDITS.some((e) => e.id === q.edit) ? q.edit : "",
    sort: SORTS.some((s) => s.id === q.sort) ? q.sort : "featured",
    q: q.q || "",
  };

  const html = `
    <div class="wrap pad-top">
      <header class="ph">
        <h1 class="lt">Shop</h1>
        <p class="t-sub" id="shop-count"></p>
      </header>
      <label class="search" for="shop-q">${icon("search")}
        <input id="shop-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Search bags, colours, suede…" value="${esc(st.q)}" aria-label="Search the shop">
        <button class="search-x" type="button" id="shop-x" aria-label="Clear search" ${st.q ? "" : "hidden"}>${icon("close")}</button>
      </label>
      <div class="sticky-strip">
        <div class="chips" role="toolbar" aria-label="Categories">
          ${CATEGORIES.map((c) => `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${st.c === c.id}">${c.name}</button>`).join("")}
          <button class="chip" type="button" id="shop-filter">${icon("sliders")} Filter <span class="chip-n" id="shop-n" hidden></span></button>
        </div>
      </div>
      <div id="shop-active"></div>
      <div class="grid stagger" id="grid" aria-live="polite"></div>
      <div class="empty" id="shop-empty" hidden>
        <div class="empty-art">${emptyArt("search")}</div>
        <p class="d3">Nothing on the rail like that.</p>
        <p class="t-sub">Try another word, or clear the filters.</p>
        <button class="btn btn--md" type="button" id="shop-reset">Show every bag</button>
      </div>
    </div>`;

  return {
    html,
    mount(screen) {
      const grid = screen.querySelector("#grid");
      const count = screen.querySelector("#shop-count");
      const empty = screen.querySelector("#shop-empty");
      const active = screen.querySelector("#shop-active");
      const input = screen.querySelector("#shop-q");
      const clearQ = screen.querySelector("#shop-x");
      const badge = screen.querySelector("#shop-n");

      const paint = ({ stagger = true } = {}) => {
        const list = results(st);
        grid.classList.toggle("stagger", stagger);
        grid.innerHTML = list.map((p, i) => tileHTML(p, { eager: i < 4 })).join("");
        wireImages(grid);
        empty.hidden = list.length > 0;
        count.textContent = list.length === PRODUCTS.length ? `${plural(list.length, "bag")} on the rail` : `${plural(list.length, "bag")} of ${PRODUCTS.length}`;
        const n = st.f.length + (st.sort !== "featured" ? 1 : 0) + (st.isNew ? 1 : 0);
        badge.hidden = !n; badge.textContent = n;
        const edit = EDITS.find((e) => e.id === st.edit);
        const tags = [
          edit && { k: "edit", label: edit.title },
          st.isNew && { k: "new", label: "New in" },
          ...st.f.map((f) => ({ k: "f:" + f, label: FAMILIES.find((x) => x.id === f).name })),
        ].filter(Boolean);
        active.innerHTML = tags.length ? `<div class="chips" style="margin-top:-2px;margin-bottom:14px">${tags.map((t) =>
          `<button class="chip" type="button" aria-pressed="true" data-drop="${t.k}">${esc(t.label)} ${icon("close")}</button>`).join("")}</div>` : "";
        screen.querySelectorAll("[data-cat]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === st.c)));
        history.replaceState(history.state, "", toHash(st));
      };
      paint();

      screen.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => {
        st.c = b.dataset.cat;
        paint();
        b.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
      }));
      active.addEventListener("click", (e) => {
        const d = e.target.closest("[data-drop]");
        if (!d) return;
        const k = d.dataset.drop;
        if (k === "edit") st.edit = "";
        else if (k === "new") st.isNew = false;
        else st.f = st.f.filter((f) => "f:" + f !== k);
        paint();
      });
      let t = 0;
      input.addEventListener("input", () => {
        clearTimeout(t);
        clearQ.hidden = !input.value;
        t = setTimeout(() => { st.q = input.value; paint({ stagger: false }); }, 90);
      });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
      clearQ.addEventListener("click", () => { input.value = ""; clearQ.hidden = true; st.q = ""; paint({ stagger: false }); input.focus(); });
      screen.querySelector("#shop-reset").addEventListener("click", () => {
        Object.assign(st, { c: "all", f: [], isNew: false, edit: "", sort: "featured", q: "" });
        input.value = ""; clearQ.hidden = true;
        paint();
      });
      screen.querySelector("#shop-filter").addEventListener("click", () => filterSheet(st, paint));
      if (new URLSearchParams(location.hash.split("?")[1] || "").get("focus") === "1") {
        requestAnimationFrame(() => input.focus({ preventScroll: true }));
      }
    },
  };
}

function filterSheet(st, paint) {
  const draft = { f: [...st.f], sort: st.sort, isNew: st.isNew };
  const countFor = () => results({ ...st, ...draft }).length;
  openSheet({
    title: "Filter",
    body: `
      <h3 class="list-h">Colour</h3>
      <div class="chips" style="flex-wrap:wrap;margin:0;padding:0;overflow:visible">
        ${FAMILIES.map((f) => `<button class="chip" type="button" data-fam="${f.id}" aria-pressed="${draft.f.includes(f.id)}"><span class="dot" style="background:${f.hex}"></span>${f.name}</button>`).join("")}
      </div>
      <div class="list" style="margin-top:22px">
        <label class="cell plain" style="cursor:pointer">
          <span class="cell-t"><span class="cell-n">New in only</span></span>
          <span class="switch"><input type="checkbox" id="f-new" ${draft.isNew ? "checked" : ""}><i></i></span>
        </label>
      </div>
      <h3 class="list-h" style="margin-top:22px">Sort</h3>
      <div class="opts">
        ${SORTS.map((s) => `<label class="opt"><input type="radio" name="sort" value="${s.id}" ${draft.sort === s.id ? "checked" : ""}><span class="opt-dot"></span><span class="opt-t"><span class="opt-n">${s.label}</span></span></label>`).join("")}
      </div>`,
    foot: `<div class="btn-row"><button class="btn btn--soft" type="button" id="f-clear">Clear</button><button class="btn" type="button" id="f-apply"></button></div>`,
    mount(sheet, close) {
      const apply = sheet.querySelector("#f-apply");
      const label = () => { const n = countFor(); apply.textContent = n ? `Show ${plural(n, "bag")}` : "No bags match"; apply.classList.toggle("is-off", !n); };
      label();
      sheet.querySelectorAll("[data-fam]").forEach((b) => b.addEventListener("click", () => {
        const id = b.dataset.fam;
        draft.f = draft.f.includes(id) ? draft.f.filter((x) => x !== id) : [...draft.f, id];
        b.setAttribute("aria-pressed", String(draft.f.includes(id)));
        label();
      }));
      sheet.querySelector("#f-new").addEventListener("change", (e) => { draft.isNew = e.target.checked; label(); });
      sheet.querySelectorAll('input[name="sort"]').forEach((r) => r.addEventListener("change", () => { draft.sort = r.value; label(); }));
      sheet.querySelector("#f-clear").addEventListener("click", () => {
        draft.f = []; draft.sort = "featured"; draft.isNew = false;
        sheet.querySelectorAll("[data-fam]").forEach((b) => b.setAttribute("aria-pressed", "false"));
        sheet.querySelector("#f-new").checked = false;
        sheet.querySelector('input[value="featured"]').checked = true;
        label();
      });
      // close first: paint() rewrites the URL, and must do it on the shop's own entry
      apply.addEventListener("click", async () => { await close(); Object.assign(st, draft); paint(); });
    },
  });
}
