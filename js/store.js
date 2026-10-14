// State that outlives a page load: the bag, saved pieces, the club account, the
// orders, the preferences. All of it stays in this browser — there is no server
// yet; the shapes are what a server would hold, so the move is a swap of this
// file, not a rewrite of the views.

import { STORAGE, CLUB, DELIVERY, ORDER } from "./config.js";
import { uid, hash32, rng } from "./util.js";
import { byId, PRODUCTS } from "./data.js";

const KEY = {
  bag: STORAGE + "bag",
  saved: STORAGE + "saved",
  member: STORAGE + "member",
  orders: STORAGE + "orders",
  prefs: STORAGE + "prefs",
};

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch { return structuredClone(fallback); }
};
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

const PREFS = { theme: "system", usePoints: true, delivery: "courier", payment: "online", address: "", city: "Tehran", note: "" };

const state = {
  bag: read(KEY.bag, []),
  saved: read(KEY.saved, []),
  member: read(KEY.member, null),
  orders: read(KEY.orders, []),
  prefs: { ...PREFS, ...read(KEY.prefs, {}) },
};
// drop anything a catalogue change has orphaned
state.bag = state.bag.filter((l) => byId(l.pid));
state.saved = state.saved.filter((id) => byId(id));

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (what) => listeners.forEach((fn) => fn(what));

/* -------------------------------------------------------------------- bag */
export const bag = () => state.bag;
export const bagCount = () => state.bag.reduce((n, l) => n + l.qty, 0);
export const bagSubtotal = () => state.bag.reduce((n, l) => n + (byId(l.pid)?.price || 0) * l.qty, 0);
export const inBag = (pid) => state.bag.find((l) => l.pid === pid)?.qty || 0;

export function addToBag(pid, qty = 1) {
  if (!byId(pid)) return null;
  let line = state.bag.find((l) => l.pid === pid);
  if (line) line.qty = Math.min(ORDER.maxPerLine, line.qty + qty);
  else { line = { id: uid(), pid, qty: Math.min(ORDER.maxPerLine, qty), at: Date.now() }; state.bag.push(line); }
  write(KEY.bag, state.bag); emit("bag");
  return line;
}
export function setQty(lineId, qty) {
  const line = state.bag.find((l) => l.id === lineId);
  if (!line) return;
  if (qty <= 0) state.bag = state.bag.filter((l) => l.id !== lineId);
  else line.qty = Math.min(ORDER.maxPerLine, qty);
  write(KEY.bag, state.bag); emit("bag");
}
export const removeLine = (lineId) => setQty(lineId, 0);
/** Put a removed line back where it was — the undo behind a swipe-to-delete. */
export function restoreLine(line, index) {
  if (state.bag.find((l) => l.id === line.id)) return;
  state.bag.splice(Math.min(index, state.bag.length), 0, line);
  write(KEY.bag, state.bag); emit("bag");
}
export function clearBag() { state.bag = []; write(KEY.bag, state.bag); emit("bag"); }

/* ------------------------------------------------------------------ saved */
export const saved = () => state.saved;
export const isSaved = (pid) => state.saved.includes(pid);
export function toggleSaved(pid) {
  state.saved = isSaved(pid) ? state.saved.filter((x) => x !== pid) : [pid, ...state.saved];
  write(KEY.saved, state.saved); emit("saved");
  return isSaved(pid);
}

/* ------------------------------------------------------------------- club */
export const member = () => state.member;
export const isMember = () => !!state.member;

export function tierOf(lifetime = state.member?.lifetime || 0) {
  let out = CLUB.tiers[0];
  for (const t of CLUB.tiers) if (lifetime >= t.min) out = t;
  return out;
}
export const nextTier = (lifetime = state.member?.lifetime || 0) => CLUB.tiers.find((t) => t.min > lifetime) || null;
export const tierIndex = (tier) => CLUB.tiers.findIndex((t) => t.id === tier.id);

/** Where an account stands on the ladder, optionally after `plus` more points. */
export function ladder(lifetime = state.member?.lifetime || 0, plus = 0) {
  const tier = tierOf(lifetime);
  const next = nextTier(lifetime);
  const span = next ? next.min - tier.min : 1;
  const pct = next ? Math.min(100, ((lifetime - tier.min) / span) * 100) : 100;
  const after = next ? Math.min(100, ((lifetime + plus - tier.min) / span) * 100) : 100;
  return { tier, next, pct, after, toNext: next ? Math.max(0, next.min - lifetime) : 0, levelsUp: !!next && lifetime + plus >= next.min };
}

export const pointsFor = (toman, tier = tierOf()) => Math.floor((toman * tier.rate) / 100 / CLUB.tomanPerPoint);

function newMemberId(phone) { return "DG" + String(hash32(phone + ":" + Date.now()) % 1000000).padStart(6, "0"); }

export function join({ name, phone }) {
  const now = Date.now();
  state.member = {
    id: newMemberId(phone), name: name.trim(), phone, joined: now,
    points: CLUB.welcome, lifetime: CLUB.welcome,
    history: [{ id: uid(), type: "welcome", at: now, pts: CLUB.welcome, note: "Welcome to the club" }],
  };
  write(KEY.member, state.member); emit("member");
  return state.member;
}
export function updateMember(patch) {
  if (!state.member) return;
  state.member = { ...state.member, ...patch };
  write(KEY.member, state.member); emit("member");
}
export function signOut() {
  state.member = null;
  state.orders = state.orders.filter((o) => !o.sample);
  write(KEY.member, null); write(KEY.orders, state.orders); emit("member");
}

/* ------------------------------------------------------------------ prefs */
export const prefs = () => state.prefs;
export function setPrefs(patch) {
  state.prefs = { ...state.prefs, ...patch };
  write(KEY.prefs, state.prefs); emit("prefs");
}

/* ------------------------------------------------------------------ quote */
/** Everything the bag and checkout show, worked out in one place. */
export function quote({ delivery = state.prefs.delivery, usePoints = state.prefs.usePoints } = {}) {
  const subtotal = bagSubtotal();
  const m = state.member;
  const tier = tierOf();
  const method = DELIVERY.find((d) => d.id === delivery) || DELIVERY[0];
  const freeIdx = method.freeFrom ? tierIndex(tierOf(CLUB.tiers.find((t) => t.id === method.freeFrom).min)) : 99;
  const shipFree = !!m && tierIndex(tier) >= freeIdx;
  const ship = subtotal > 0 ? (shipFree ? 0 : method.price) : 0;
  const redeemable = m ? Math.min(m.points, Math.floor((subtotal * CLUB.redeemCap) / CLUB.tomanPerPoint)) : 0;
  const used = m && usePoints ? redeemable : 0;
  const discount = used * CLUB.tomanPerPoint;
  const merch = subtotal - discount;
  const earn = pointsFor(merch, m ? tier : CLUB.tiers[0]);
  return {
    subtotal, discount, used, redeemable, ship, shipFree, method, total: merch + ship,
    earn, tier, member: m, guestEarn: m ? 0 : earn + CLUB.welcome,
  };
}

/* ----------------------------------------------------------------- orders */
export const orders = () => state.orders;
export const orderById = (id) => state.orders.find((o) => o.id === id) || null;

function orderNo() {
  const taken = new Set(state.orders.map((o) => o.no));
  let n;
  do { n = "DG-" + String(Math.floor(10000 + Math.random() * 89999)); } while (taken.has(n));
  return n;
}

/** A member's order earns and may spend points; a guest's order does neither. */
export function placeOrder({ contact, address, city, delivery, payment, note = "", usePoints = state.prefs.usePoints }) {
  if (!state.bag.length) return null;
  const q = quote({ delivery, usePoints });
  const m = state.member;
  const at = Date.now();
  const lines = state.bag.map((l) => {
    const p = byId(l.pid);
    return { pid: l.pid, qty: l.qty, unit: p.price, name: p.name, colour: p.colour, img: p.img };
  });
  const order = {
    id: uid(), no: orderNo(), at, lines, contact, address, city, note,
    delivery: { id: q.method.id, name: q.method.name, fee: q.ship }, payment,
    subtotal: q.subtotal, discount: m ? q.discount : 0, used: m ? q.used : 0, total: m ? q.total : q.subtotal + q.ship,
    earned: m ? q.earn : 0, tier: m ? q.tier.id : null, guest: !m,
  };
  state.orders.unshift(order);
  state.orders = state.orders.slice(0, ORDER.keep);
  if (m) {
    const before = m.lifetime;
    if (q.used) m.history.unshift({ id: uid(), type: "redeem", at, pts: -q.used, orderNo: order.no, note: `Used on ${order.no}` });
    m.history.unshift({ id: uid(), type: "order", at: at + 1, pts: q.earn, orderNo: order.no, note: `Order ${order.no}` });
    m.points = m.points - q.used + q.earn;
    m.lifetime = before + q.earn;
    m.history = m.history.slice(0, 80);
    order.before = before;
    order.levelFrom = tierOf(before).id;
    order.levelTo = tierOf(m.lifetime).id;
    write(KEY.member, m);
  }
  write(KEY.orders, state.orders);
  state.bag = []; write(KEY.bag, state.bag);
  try { sessionStorage.setItem(STORAGE + "confirmed", order.id); } catch {}
  emit("order");
  return order;
}
export const justConfirmed = () => { try { return sessionStorage.getItem(STORAGE + "confirmed"); } catch { return null; } };

/** A time-derived status so a demo order moves on by itself. Labelled as such on screen. */
export function stageOf(order, now = Date.now()) {
  const min = (now - order.at) / 60000;
  const courier = order.delivery.id === "courier";
  const steps = courier
    ? [["Placed", 0], ["Packed", 2], ["With the courier", 20], ["Delivered", 180]]
    : [["Placed", 0], ["Packed", 2], ["Posted", 60], ["Delivered", 60 * 48]];
  let idx = 0;
  steps.forEach(([, m], i) => { if (min >= m) idx = i; });
  return { steps: steps.map(([label, m]) => ({ label, at: order.at + m * 60000 })), idx };
}

/* ----------------------------------------------------------------- sample */
// A regular's last few months, so the club, the tiers and the order history can
// be judged on a fresh phone. Marked "Sample" wherever it shows; sign out clears it.
export function seedSample() {
  const now = Date.now();
  const r = rng(hash32("done-goll-sample"));
  const picks = ["slouch-cocoa", "tote-ecru", "crescent-mocha", "pocket-espresso", "fringe-cognac"];
  const m = {
    id: "DG204118", name: "Sara Karimi", phone: "09120000000", joined: now - 150 * 86400000,
    points: 0, lifetime: 0, sample: true,
    history: [],
  };
  m.history.push({ id: uid(), type: "welcome", at: m.joined, pts: CLUB.welcome, note: "Welcome to the club", sample: true });
  let lifetime = CLUB.welcome, points = CLUB.welcome;
  const made = [];
  [128, 96, 61, 23].forEach((daysAgo, i) => {
    const at = now - daysAgo * 86400000 - Math.floor(r() * 6) * 3600000;
    const chosen = [byId(picks[i]), ...(i === 2 ? [byId(picks[4])] : [])];
    const lines = chosen.map((p) => ({ pid: p.id, qty: 1, unit: p.price, name: p.name, colour: p.colour, img: p.img }));
    const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const tier = tierOf(lifetime);
    const earned = pointsFor(subtotal, tier);
    const o = {
      id: uid(), no: "DG-" + String(40000 + Math.floor(r() * 50000)), at, lines, sample: true,
      contact: { name: m.name, phone: m.phone }, address: "Sample address", city: "Tehran", note: "",
      delivery: { id: "courier", name: "Tehran courier", fee: tier.id === "seed" ? 120000 : 0 }, payment: "online",
      subtotal, discount: 0, used: 0, total: subtotal + (tier.id === "seed" ? 120000 : 0), earned, tier: tier.id,
    };
    made.push(o);
    lifetime += earned; points += earned;
    m.history.unshift({ id: uid(), type: "order", at, pts: earned, orderNo: o.no, note: `Order ${o.no}`, sample: true });
  });
  // some points spent along the way, as they would be
  const spent = 180;
  m.history.splice(1, 0, { id: uid(), type: "redeem", at: now - 23 * 86400000 + 60000, pts: -spent, orderNo: made[3].no, note: `Used on ${made[3].no}`, sample: true });
  made[3].used = spent; made[3].discount = spent * CLUB.tomanPerPoint; made[3].total -= made[3].discount;
  m.points = points - spent; m.lifetime = lifetime;
  state.member = m;
  state.orders = [...made.reverse(), ...state.orders.filter((o) => !o.sample)].sort((a, b) => b.at - a.at);
  if (!state.saved.length) state.saved = ["varsity-cherry", "slouch-black"];
  write(KEY.member, m); write(KEY.orders, state.orders); write(KEY.saved, state.saved);
  emit("member");
  return m;
}

export function forgetEverything() {
  Object.values(KEY).forEach((k) => { try { localStorage.removeItem(k); } catch {} });
  state.bag = []; state.saved = []; state.member = null; state.orders = [];
  state.prefs = { ...PREFS };
  emit("all");
}

export const allProducts = () => PRODUCTS;
