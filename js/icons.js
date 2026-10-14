// Line icons drawn to sit beside San Francisco the way SF Symbols do: 24-unit
// grid, 1.6 stroke, round caps. The four tab icons have filled twins for the
// selected state, as iOS does.

// width/height are a floor, not a size: CSS sizes every icon it knows about, and an
// icon dropped somewhere CSS forgot stays 24px instead of filling its container.
const S = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const F = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false">${d}</svg>`;

// five petals for the club's points — "goll" is a flower
const petals = (r = 3.35, dist = 4.55) => {
  let out = "";
  for (let i = 0; i < 5; i++) {
    const a = ((i * 72 - 90) * Math.PI) / 180;
    out += `<circle cx="${(12 + Math.cos(a) * dist).toFixed(2)}" cy="${(12 + Math.sin(a) * dist).toFixed(2)}" r="${r}"/>`;
  }
  return out;
};

const I = {
  home: S(`<path d="M3.6 10.3 12 3.8l8.4 6.5"/><path d="M5.6 8.8V19c0 .8.7 1.5 1.5 1.5h3.1v-5a1.8 1.8 0 0 1 3.6 0v5h3.1c.8 0 1.5-.7 1.5-1.5V8.8"/>`),
  homeFill: F(`<path d="M12.6 3.2a1 1 0 0 0-1.2 0L3.3 9.5a.9.9 0 0 0 1.1 1.4l.8-.6V19c0 1.1.9 2 2 2h3.1v-5.2a1.7 1.7 0 0 1 3.4 0V21h3.1c1.1 0 2-.9 2-2v-8.7l.8.6a.9.9 0 0 0 1.1-1.4z"/>`),
  shop: S(`<path d="M20.2 12.8 12.8 20.2a1.6 1.6 0 0 1-2.3 0l-6.7-6.7a1.6 1.6 0 0 1-.5-1.1V5.1c0-.9.7-1.6 1.6-1.6h7.3c.4 0 .8.2 1.1.5l6.9 6.9a1.6 1.6 0 0 1 0 1.9z"/><circle cx="8.1" cy="8.1" r="1.5"/>`),
  shopFill: F(`<path fill-rule="evenodd" d="M13.5 3.2c-.4-.4-.9-.6-1.5-.6H5a2.4 2.4 0 0 0-2.4 2.4v7.2c0 .6.2 1.1.6 1.5l6.9 6.9c.9.9 2.4.9 3.4 0l7.4-7.4c.9-.9.9-2.4 0-3.4zM8.1 10a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8z"/>`),
  bag: S(`<path d="M5.3 8.6h13.4l-.9 10.9a1.6 1.6 0 0 1-1.6 1.5H7.8a1.6 1.6 0 0 1-1.6-1.5z"/><path d="M8.8 10.6V7.3a3.2 3.2 0 0 1 6.4 0v3.3"/>`),
  bagFill: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.5 8.9c0-.6.5-1.1 1.1-1.1h12.8c.6 0 1.1.5 1.1 1.2l-.9 10.6a2.3 2.3 0 0 1-2.3 2.1H7.7a2.3 2.3 0 0 1-2.3-2.1z"/><path d="M8.8 10.6V7.3a3.2 3.2 0 0 1 6.4 0v3.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  person: S(`<circle cx="12" cy="8" r="3.7"/><path d="M4.6 20.2c.9-3.5 3.9-5.6 7.4-5.6s6.5 2.1 7.4 5.6"/>`),
  personFill: F(`<circle cx="12" cy="7.9" r="4.2"/><path d="M3.9 20.1c.9-4 4.3-6.3 8.1-6.3s7.2 2.3 8.1 6.3c.1.5-.3 1-.8 1H4.7c-.5 0-.9-.5-.8-1z"/>`),

  search: S(`<circle cx="10.8" cy="10.8" r="6.2"/><path d="m15.4 15.4 4.9 4.9"/>`),
  heart: S(`<path d="M12 20.1s-7.6-4.5-7.6-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.6 2.8c0 5.7-7.6 10.2-7.6 10.2z"/>`),
  heartFill: F(`<path d="M12 20.9c-.2 0-.4 0-.5-.1C11.1 20.6 3.6 16 3.6 9.9a5.1 5.1 0 0 1 8.4-3.9 5.1 5.1 0 0 1 8.4 3.9c0 6.1-7.5 10.7-7.9 10.9-.1.1-.3.1-.5.1z"/>`),
  chevronL: S(`<path d="M14.8 5.2 8 12l6.8 6.8"/>`),
  chevronR: S(`<path d="M9.2 5.2 16 12l-6.8 6.8"/>`),
  chevronD: S(`<path d="M5.6 9.2 12 15.6l6.4-6.4"/>`),
  share: S(`<path d="M12 14.6V3.9"/><path d="M8.4 7.4 12 3.8l3.6 3.6"/><path d="M8.6 10.4H7.1c-.9 0-1.6.7-1.6 1.6v6.9c0 .9.7 1.6 1.6 1.6h9.8c.9 0 1.6-.7 1.6-1.6V12c0-.9-.7-1.6-1.6-1.6h-1.5"/>`),
  plus: S(`<path d="M12 5.2v13.6M5.2 12h13.6"/>`),
  minus: S(`<path d="M5.2 12h13.6"/>`),
  close: S(`<path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"/>`),
  check: S(`<path d="m5.2 12.6 4.4 4.3 9.2-9.6"/>`),
  trash: S(`<path d="M4.6 6.6h14.8"/><path d="M9.6 6.6V5.1c0-.9.7-1.6 1.6-1.6h1.6c.9 0 1.6.7 1.6 1.6v1.5"/><path d="m6.6 6.6.8 12.5c.1.8.7 1.4 1.6 1.4h6c.9 0 1.5-.6 1.6-1.4l.8-12.5"/>`),
  sliders: S(`<path d="M4 7.2h9M17.4 7.2H20M4 16.8h2.6M11 16.8h9"/><circle cx="15.2" cy="7.2" r="2.1"/><circle cx="8.8" cy="16.8" r="2.1"/>`),
  flower: F(petals()),
  gift: S(`<rect x="4" y="8.6" width="16" height="4" rx="1"/><path d="M5.6 12.6V19c0 .8.7 1.5 1.5 1.5h9.8c.8 0 1.5-.7 1.5-1.5v-6.4M12 8.6v11.9"/><path d="M12 8.6S10.9 4.2 8.7 4.4c-1.8.2-1.7 2.7.1 4.2M12 8.6s1.1-4.4 3.3-4.2c1.8.2 1.7 2.7-.1 4.2"/>`),
  truck: S(`<path d="M3.5 6.5h10v10h-10z"/><path d="M13.5 9.5h3.7l3.3 3.6v3.4h-7"/><circle cx="7.4" cy="17.4" r="1.9"/><circle cx="17" cy="17.4" r="1.9"/>`),
  card: S(`<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3 10h18M6.6 14.6h4.2"/>`),
  pin: S(`<path d="M12 21s-6.4-6.1-6.4-11a6.4 6.4 0 0 1 12.8 0c0 4.9-6.4 11-6.4 11z"/><circle cx="12" cy="10" r="2.3"/>`),
  instagram: S(`<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5"/><circle cx="12" cy="12" r="3.9"/><circle cx="17.1" cy="6.9" r=".6" fill="currentColor"/>`),
  send: S(`<path d="M20.4 3.6 10.3 13.7"/><path d="M20.4 3.6 14.2 20.4l-3.9-6.7-6.7-3.9z"/>`),
  qr: S(`<rect x="4" y="4" width="6.2" height="6.2" rx="1.2"/><rect x="13.8" y="4" width="6.2" height="6.2" rx="1.2"/><rect x="4" y="13.8" width="6.2" height="6.2" rx="1.2"/><path d="M13.8 13.8h2.6v2.6h-2.6zM17.4 17.4H20V20h-2.6zM13.8 20h1.4M20 13.8v1.4"/>`),
  clock: S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6V12l3 1.9"/>`),
  box: S(`<path d="M3.8 7.6 12 3.6l8.2 4v8.8L12 20.4l-8.2-4z"/><path d="m3.8 7.6 8.2 4 8.2-4M12 11.6v8.8"/>`),
  download: S(`<path d="M12 4.2v10.6M7.6 10.6 12 15l4.4-4.4"/><path d="M5.2 19.6h13.6"/>`),
  sun: S(`<circle cx="12" cy="12" r="3.8"/><path d="M12 2.9v1.9M12 19.2v1.9M2.9 12h1.9M19.2 12h1.9M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3"/>`),
  moon: S(`<path d="M19.4 14.7A7.7 7.7 0 1 1 9.3 4.6a6.1 6.1 0 0 0 10.1 10.1z"/>`),
  halfCircle: S(`<circle cx="12" cy="12" r="8.4"/><path d="M12 3.6v16.8" /><path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" stroke="none"/>`),
  info: S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.2"/><circle cx="12" cy="7.9" r=".5" fill="currentColor"/>`),
  arrowR: S(`<path d="M5 12h14M13.6 6.6 19 12l-5.4 5.4"/>`),
  ruler: S(`<path d="M3.9 15.7 15.7 3.9l4.4 4.4L8.3 20.1z"/><path d="m7.5 12.1 1.8 1.8M10.1 9.5l1.2 1.2M12.7 6.9l1.8 1.8"/>`),
  lock: S(`<rect x="5" y="10.4" width="14" height="10" rx="2.2"/><path d="M8.5 10.4V8a3.5 3.5 0 0 1 7 0v2.4"/>`),
  logout: S(`<path d="M9.6 20.4H6.6c-.9 0-1.6-.7-1.6-1.6V5.2c0-.9.7-1.6 1.6-1.6h3"/><path d="M14.2 16.4 18.6 12l-4.4-4.4M18.6 12H9.2"/>`),
  reset: S(`<path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.2"/><path d="M4.3 4.3v3.5h3.5"/>`),
  edit: S(`<path d="m4.2 19.8 1-4.1L15.7 5.2a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8L8.3 18.8z"/><path d="m13.8 7.1 3.1 3.1"/>`),
  phone: S(`<path d="M8.7 3.8H6.6a2 2 0 0 0-2 2.2c.3 7.4 6 13.1 13.4 13.4a2 2 0 0 0 2.2-2v-2.1l-3.6-1.5-1.8 1.8a11 11 0 0 1-4.9-4.9l1.8-1.8z"/>`),
  hook: S(`<path d="M12.2 3.4a2.5 2.5 0 0 1 2.5 2.5c0 1.5-1.2 2.4-2.7 3v4.3"/><path d="M12 13.2c-2.7 0-4.4 1.7-4.4 3.8 0 2.2 1.8 3.8 4.4 3.8 2.4 0 4.2-1.6 4.2-3.5"/>`),
  sparkle: S(`<path d="M12 3.6c.5 3.9 2.2 5.9 6.2 6.4-4 .5-5.7 2.5-6.2 6.4-.5-3.9-2.2-5.9-6.2-6.4 4-.5 5.7-2.5 6.2-6.4z"/>`),
};

export const icon = (name) => I[name] || "";
