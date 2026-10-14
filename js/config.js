// Everything a client would want changed lives here and in data.js.
// Nothing in this file is a secret; it ships to every browser.

export const BRAND = {
  name: "Done Goll",
  city: "Tehran",
  country: "Iran",
  instagram: "donegoll",
  instagramUrl: "https://instagram.com/donegoll",
  currency: "T",
  currencyLong: "Toman",
};

export const STORAGE = "donegoll.v1.";

/* The loyalty programme. Rates and rewards are Alpha's proposal, not the shop's —
   the preview note says so wherever they show. One unit only: a point is worth
   1,000 Toman at checkout, so a customer never has to convert anything. */
export const CLUB = {
  name: "Done Goll Club",
  tomanPerPoint: 1000,
  welcome: 100,
  redeemCap: 0.5,           // points can pay for at most half of the bag
  tiers: [
    { id: "seed", name: "Seed", min: 0, rate: 5,
      perks: ["5% back in points on every order", "100 points when you join", "Early word on new drops"] },
    { id: "bud", name: "Bud", min: 500, rate: 7,
      perks: ["7% back in points", "Free courier inside Tehran", "First pick of new colourways"] },
    { id: "bloom", name: "Bloom", min: 1500, rate: 10,
      perks: ["10% back in points", "Free delivery anywhere in Iran", "A birthday gift from the shop", "Private previews before a drop goes live"] },
  ],
};

export const DELIVERY = [
  { id: "courier", name: "Tehran courier", note: "Same day inside Tehran", price: 120000, freeFrom: "bud" },
  { id: "post", name: "Post", note: "Anywhere in Iran, 2–4 working days", price: 90000, freeFrom: "bloom" },
];

export const PAYMENT = [
  { id: "online", name: "Pay online", note: "Any Shetab card through the bank gateway" },
  { id: "cod", name: "Pay on delivery", note: "Card reader at the door, Tehran courier only" },
];

export const PREVIEW = {
  enabled: true,
  note: "Preview build by Alpha Agency. Product names, prices, delivery fees and the club's rates are placeholders until Done Goll confirms them. No card is ever charged.",
};

export const ORDER = { maxPerLine: 5, keep: 40 };
