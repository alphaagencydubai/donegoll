// The catalogue. Six styles, thirteen colourways, all photographed by Done Goll on
// their own rail (scripts/src). Every detail line describes what the photographs
// show — shape, finish, hardware — and nothing they do not: no fibre content, no
// origin, no care claims until the shop supplies them. The two measurements are
// the shop's own, read off their annotated photographs.
//
// Names and prices are placeholders (see PREVIEW in config.js).

import { ASSETS } from "./assets.gen.js";

export const CATEGORIES = [
  { id: "all", name: "All" },
  { id: "shoulder", name: "Shoulder" },
  { id: "tote", name: "Totes" },
  { id: "hobo", name: "Hobo" },
  { id: "bowling", name: "Bowling" },
];

export const FAMILIES = [
  { id: "brown", name: "Brown", hex: "#6A4632" },
  { id: "cream", name: "Cream", hex: "#E7DFD0" },
  { id: "black", name: "Black", hex: "#1E1D1C" },
  { id: "navy", name: "Navy", hex: "#243056" },
  { id: "red", name: "Red", hex: "#A8222C" },
];

export const STYLES = [
  {
    id: "slouch", name: "Slouch Shoulder Bag", cat: "shoulder", price: 2450000, rank: 3,
    blurb: "A soft triangle that folds in on itself. Carry it short on the shoulder, or clip on the long strap and wear it across the body.",
    details: ["Brushed suede finish", "Gold-tone hardware", "Short strap and a detachable long strap", "Zip top"],
    size: { h: 23, w: 34 },
    finish: "suede",
  },
  {
    id: "tote", name: "Folding Tote", cat: "tote", price: 1950000, rank: 4,
    blurb: "The everyday tote: a light, smooth body, a snap-down flap and long handles that sit right on the shoulder.",
    details: ["Smooth, light body", "Contrast flap and handles", "Snap-button flap and zip top", "Gold-tone zip pull"],
    size: { h: 31, w: 45 },
    finish: "smooth",
  },
  {
    id: "varsity", name: "Varsity 99 Bowling Bag", cat: "bowling", price: 2850000, rank: 1, isNew: true,
    blurb: "Straight off the team bus: a glossy body with contrast piping, a pair of stars, and a detachable 99 pouch for keys and cards.",
    details: ["Glossy finish with contrast piping", "Star appliqués", "Detachable 99 coin pouch", "Twin top handles and a zip top"],
    finish: "glossy",
  },
  {
    id: "pocket", name: "Positive Pocket Tote", cat: "tote", price: 2250000, rank: 5,
    blurb: "An open tote with a front slip pocket, stitched with a line worth carrying around: for every negative there is a positive.",
    details: ["Brushed suede finish", "Front slip pocket with an embroidered line", "Riveted shoulder straps"],
    finish: "suede",
  },
  {
    id: "crescent", name: "Crescent Hobo", cat: "hobo", price: 1850000, rank: 6,
    blurb: "A half-moon that sits close to the body. Soft twill, one long strap with a sliding buckle, and room for the whole day.",
    details: ["Soft twill finish", "Half-moon silhouette", "Adjustable buckle strap"],
    finish: "twill",
  },
  {
    id: "fringe", name: "Fringe Hobo", cat: "hobo", price: 2650000, rank: 2, isNew: true,
    blurb: "A slouchy hobo with a buckled tab and a fall of fringe that moves when you do.",
    details: ["Brushed suede finish", "Buckled tab", "Long cut fringe", "Single shoulder strap"],
    finish: "suede",
  },
];

/* Scenes: the shop's photographs, whole, with the watermark lifted
   (scripts/build_assets.py). Two carry the shop's own measurements. */
export const SCENES = {
  "slouch-pair": { alt: "Slouch bags in Cocoa and Sand on the rail" },
  "slouch-cocoa": { alt: "Slouch bag in Cocoa, measured: 23 cm tall, 34 cm wide", measured: true },
  "slouch-black": { alt: "Slouch bag in Black on the rail" },
  "tote-pair": { alt: "Folding totes in Chocolate and Ecru" },
  "tote-navy": { alt: "Folding tote in Navy, measured: 31 cm tall, 45 cm wide", measured: true },
  "varsity-pair": { alt: "Varsity bowling bags in Cherry and Cream" },
  "pocket-pair": { alt: "Two Positive Pocket Totes in Espresso" },
  "crescent-pair": { alt: "Crescent hobos in Mocha and Bone" },
  "fringe-pair": { alt: "Fringe hobos in Cognac and Navy" },
};

/* One entry per colourway — that is what a customer puts in a bag. */
const RAW = [
  { id: "slouch-cocoa", style: "slouch", colour: "Cocoa", family: "brown", hex: "#6B4A33", scenes: ["slouch-cocoa", "slouch-pair"] },
  { id: "slouch-sand", style: "slouch", colour: "Sand", family: "cream", hex: "#CBBFAE", scenes: ["slouch-pair"] },
  { id: "slouch-black", style: "slouch", colour: "Black", family: "black", hex: "#1D1C1B", scenes: ["slouch-black"] },
  { id: "tote-chocolate", style: "tote", colour: "Chocolate", family: "brown", hex: "#4B2E27", scenes: ["tote-pair"] },
  { id: "tote-ecru", style: "tote", colour: "Ecru", family: "cream", hex: "#E6E0D4", scenes: ["tote-pair"] },
  { id: "tote-navy", style: "tote", colour: "Navy", family: "navy", hex: "#262D45", scenes: ["tote-navy"] },
  { id: "varsity-cherry", style: "varsity", colour: "Cherry", family: "red", hex: "#A31F2A", scenes: ["varsity-pair"] },
  { id: "varsity-cream", style: "varsity", colour: "Cream", family: "cream", hex: "#E4D9C4", scenes: ["varsity-pair"] },
  { id: "pocket-espresso", style: "pocket", colour: "Espresso", family: "brown", hex: "#4A261C", scenes: ["pocket-pair"] },
  { id: "crescent-mocha", style: "crescent", colour: "Mocha", family: "brown", hex: "#48342A", scenes: ["crescent-pair"] },
  { id: "crescent-bone", style: "crescent", colour: "Bone", family: "cream", hex: "#E3DCCE", scenes: ["crescent-pair"] },
  { id: "fringe-cognac", style: "fringe", colour: "Cognac", family: "brown", hex: "#6A4330", scenes: ["fringe-pair"] },
  { id: "fringe-navy", style: "fringe", colour: "Navy", family: "navy", hex: "#22336E", scenes: ["fringe-pair"] },
];

const styleOf = Object.fromEntries(STYLES.map((s) => [s.id, s]));

export const PRODUCTS = RAW.map((r, i) => {
  const s = styleOf[r.style];
  const tile = ASSETS.tiles[r.id] || {};
  return {
    ...r,
    order: i,
    name: s.name,
    cat: s.cat,
    price: s.price,
    isNew: !!s.isNew,
    // swatches are set by eye: sampled pixels land in folds and shadows
    hex: r.hex,
    img: `assets/photos/t/${r.id}.webp`,
    w: tile.w || 480, h: tile.h || 600,
    lqip: tile.lqip || "",
    ground: tile.ground || "#E8E6E2",
  };
});

export const byId = (id) => PRODUCTS.find((p) => p.id === id) || null;
export const styleById = (id) => styleOf[id] || null;
export const siblings = (p) => PRODUCTS.filter((q) => q.style === p.style);
export const sceneMeta = (id) => ({ ...(SCENES[id] || {}), ...(ASSETS.scenes[id] || {}), id, src: `assets/photos/s/${id}.webp` });
export const catName = (id) => CATEGORIES.find((c) => c.id === id)?.name || id;

/* Home */
export const NEW_IN = ["varsity-cherry", "fringe-cognac", "slouch-sand", "varsity-cream", "fringe-navy", "crescent-bone", "tote-ecru"];
export const EDITS = [
  { id: "suede", title: "The Suede Edit", sub: "Slouch, pocket and fringe — brushed, soft, made for autumn.", scene: "fringe-pair",
    match: (p) => styleOf[p.style].finish === "suede" },
  { id: "everyday", title: "Everyday Totes", sub: "Room for the laptop, the scarf and the day.", scene: "tote-pair",
    match: (p) => p.cat === "tote" },
];
