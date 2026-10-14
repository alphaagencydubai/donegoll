// Small shared helpers. No framework, no dependencies.

import { BRAND } from "./config.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape anything that came from a person before it goes near innerHTML. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** 2450000 → "2,450,000". Grouped, never rounded away, Latin digits. */
export const money = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
export const price = (n) => `${money(n)} ${BRAND.currency}`;
/** Price with the unit as a small suffix, for tiles and rows. */
export const priceHTML = (n) => `<span class="money">${money(n)}</span><span class="cur">${BRAND.currency}</span>`;

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const plural = (n, one, many = one + "s") => `${money(n)} ${n === 1 ? one : many}`;
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const initials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DG";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
};
export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

/* ----------------------------------------------------------------- phones */
// Iranian keyboards type ۰–۹ (and some ٠–٩). Convert before anything else: a
// bare \D strip would delete them and leave nothing.
export const latinDigits = (s) => String(s ?? "")
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** Any way an Iranian mobile gets typed → "09xxxxxxxxx", or "" if it is not one. */
export function normalPhone(s) {
  let d = latinDigits(s).replace(/[^0-9+]/g, "");
  if (d.startsWith("+98")) d = "0" + d.slice(3);
  else if (d.startsWith("0098")) d = "0" + d.slice(4);
  else if (d.startsWith("98") && d.length === 12) d = "0" + d.slice(2);
  else if (d.startsWith("9") && d.length === 10) d = "0" + d;
  return /^09[0-9]{9}$/.test(d) ? d : "";
}
export const prettyPhone = (p) => (/^09[0-9]{9}$/.test(p || "") ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p || "");

/* ------------------------------------------------------------------ dates */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad2 = (n) => String(n).padStart(2, "0");
export const hm = (t) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const dateShort = (t) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
export const dateLong = (t) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const monthYear = (t) => { const d = new Date(t); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const dateTime = (t) => `${dateShort(t)}, ${hm(t)}`;

/* ------------------------------------------------------------- seeded demo */
/** Deterministic 32-bit hash (FNV-1a) for seeded demo content. */
export function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/** Tiny seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
