# Done Goll — storefront PWA preview

Bags from Tehran. A preview built by **Alpha Agency** for Done Goll
(Instagram [@donegoll](https://instagram.com/donegoll)). English UI, prices in Toman.

Static, installable, works offline. No framework, no build step for the app itself:
vanilla ES modules, hash routing, state in `localStorage`.

```
python3 serve.py            # http://localhost:8171
python3 e2e.py              # the Playwright suite against localhost
python3 e2e.py https://alphaagencydubai.github.io/donegoll/
```

## What is in it

| Tab | What it does |
|---|---|
| **Home** | wordmark, the shop's own photograph, **the rail** (bags hang on S-hooks and swing as it scrolls), two edits, the club, Instagram, footer with Alpha's sign |
| **Shop** | search, categories, colour/sort sheet, 13 colourways; product pages with gallery, colour swatches, points line, the shop's own measurements |
| **Bag** | the **club (CRM) at work**: points this bag earns, points it can spend, how far it moves you up the ladder, live; swipe-to-save/remove with undo; checkout dock |
| **Profile** | the club card (turns over to a QR for the counter), tier ladder, orders, saved, details, appearance, install |

Checkout → payment (simulated) → thank-you with the points counting up → order
status that moves on by itself (labelled on screen).

## The club (proposal — Done Goll sets the real numbers)

One unit only: **1 point = 1,000 T** at checkout. Seed 5% → Bud 7% (from 500 pts
earned) → Bloom 10% (from 1,500). 100 points on joining. Points pay for up to half a
bag. Everything lives in `js/config.js`.

## Where things live

- `js/config.js` — brand, club rates, delivery, payment, the preview note
- `js/data.js` — the catalogue: six styles, thirteen colourways. **Names and prices
  are placeholders.** Detail lines describe only what the photographs show; the two
  measurements (23×34 cm, 31×45 cm) are the shop's own, read off their annotated photos
- `scripts/build_assets.py` — the photo pipeline: lifts the DONE GOLL watermark,
  cuts tiles/scenes/placeholders, makes the PWA icons, writes `js/assets.gen.js`.
  Source photos go in `scripts/src/` (not committed)
- `scripts/trace_logo.py` — traces the client's PNG wordmark into `js/brand.js`
- `build.py` — run before every deploy: stamps the service worker version and the
  `?v=` query strings, and writes the worker's cache lists from disk

## Design system

Paper `#F4F2EE` (their wall), ink `#141312` (their rail), and **cocoa** `#5C3B28` —
the suede most of the catalogue is cut in — reserved for the club. San Francisco for
the interface, **Libre Caslon** (the nearest open face to the wordmark) for the
voice. iOS 26 grammar: floating liquid-glass tab bar with a draggable lens, glass
toolbar buttons with a scroll-edge blur instead of a hard bar, large titles that hand
over to the bar, inset grouped lists, spring-driven sheets. Light and dark.

Fonts: Libre Caslon Text/Display, SIL Open Font License (`assets/fonts/OFL-LibreCaslon.txt`).
