#!/usr/bin/env python3
"""End-to-end checks for the Done Goll PWA.

    python3 serve.py &                                     # or the preview server
    python3 e2e.py                                         # local
    python3 e2e.py https://alphaagencydubai.github.io/donegoll/ # the deployed build

Drives a real mobile Chrome through everything a customer would do — browse the
rail, filter, open a bag, switch colour, save, add, join the club inside the bag,
spend points, swipe a line away and undo it, check out, watch the points land,
turn the club card over — and fails loudly on anything broken. Includes the
three hash-router regressions (stacked listeners, same-hash navigation,
scroll-derived bar state), the backdrop-root check on the glass, and, against
the live URL, the service worker and a cold offline reload.

Uses the system Chrome: Playwright's own browsers are not installed on this Mac.
Screenshots land in docs/shots/.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8171/").rstrip("/") + "/"
LIVE = "localhost" not in BASE and "127.0.0.1" not in BASE
SHOTS = pathlib.Path(__file__).resolve().parent / "docs" / "shots"
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")

PRODUCTS = ["slouch-cocoa", "slouch-sand", "slouch-black", "tote-chocolate", "tote-ecru", "tote-navy",
            "varsity-cherry", "varsity-cream", "pocket-espresso", "crescent-mocha", "crescent-bone",
            "fringe-cognac", "fringe-navy"]
SCENES = ["slouch-pair", "slouch-cocoa", "slouch-black", "tote-pair", "tote-navy", "varsity-pair",
          "pocket-pair", "crescent-pair", "fringe-pair"]

PASS: list[str] = []
FAIL: list[str] = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else f"{name}  →  {detail}")


def http(url, method="GET"):
    try:
        req = urllib.request.Request(url, method=method, headers={"User-Agent": "donegoll-e2e"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, (r.read() if method == "GET" else b"")
    except urllib.error.HTTPError as e:
        return e.code, {}, b""
    except Exception as e:  # noqa: BLE001
        return 0, {}, str(e).encode()


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("pip install playwright  (it drives the system Chrome)")

    # ----------------------------------------------------------- over http
    paths = ["", "index.html", "manifest.webmanifest", "sw.js", "404.html", "css/app.css", "js/app.js", "js/data.js",
             "js/assets.gen.js", "js/brand.js", "assets/brand/wordmark.svg", "assets/brand/alpha-black.png",
             "assets/brand/alpha-white.png", "assets/fonts/caslon-text.woff2", "assets/fonts/caslon-text-italic.woff2",
             "assets/fonts/caslon-display.woff2", "assets/icons/icon-192.png", "assets/icons/icon-512.png",
             "assets/icons/maskable-512.png", "assets/icons/apple-touch-icon.png", "assets/icons/favicon.png"]
    paths += [f"assets/photos/t/{p}.webp" for p in PRODUCTS] + [f"assets/photos/t/{p}-s.webp" for p in PRODUCTS]
    paths += [f"assets/photos/s/{s}.webp" for s in SCENES] + [f"assets/photos/s/{s}-m.webp" for s in SCENES]
    missing = [p for p in paths if http(BASE + p, "HEAD")[0] != 200]
    check(f"http: all {len(paths)} files serve 200", not missing, ", ".join(missing[:6]))
    st, h, _ = http(BASE + "assets/photos/t/slouch-cocoa.webp", "HEAD")
    check("http: photos served as image/webp", "image/webp" in h.get("content-type", ""), h.get("content-type", ""))
    st, h, _ = http(BASE + "assets/fonts/caslon-text.woff2", "HEAD")
    check("http: fonts served as woff2", "woff2" in h.get("content-type", ""), h.get("content-type", ""))
    st, h, body = http(BASE + "manifest.webmanifest")
    try:
        man = json.loads(body)
        check("manifest: standalone, named, 3 icons incl. maskable",
              man.get("display") == "standalone" and man.get("name") == "Done Goll" and len(man["icons"]) >= 3
              and any("maskable" in i.get("purpose", "") for i in man["icons"]), str(man)[:90])
    except Exception as e:  # noqa: BLE001
        check("manifest parses", False, str(e))
    html = http(BASE)[2].decode("utf-8", "replace")
    head = html.split("<body")[0]
    check("html: noindex while unapproved", 'name="robots" content="noindex' in html)
    check("html: viewport-fit=cover for the notch", "viewport-fit=cover" in html)
    check("html: scrollRestoration claimed in <head>", "scrollRestoration" in head)
    check("html: theme painted before first frame", "dataset.theme" in head)
    sw = http(BASE + "sw.js")[2].decode()
    check("sw: network-first shell with cache:reload", 'cache: "reload"' in sw)
    check("sw: claims clients only on an update", "=== \"update\"" in sw and "clients.claim" in sw)
    if LIVE:
        check("sw: version stamped by build.py", 'const VERSION = "dg-dev"' not in sw)
        check("sw: shell list written", "./js/app.js" in sw)
    js_all = "".join(http(BASE + f)[2].decode("utf-8", "replace") for f in ["js/data.js", "js/config.js", "js/app.js", "js/ui.js"])
    check("hygiene: no other maker's trademark in the copy", not re.search(r"longchamp|pliage|hermes|chanel|gucci", js_all, re.I))
    check("hygiene: no secrets in shipped js", not re.search(r"(api[_-]?key|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{12,}", js_all, re.I))
    data_js = http(BASE + "js/data.js")[2].decode()
    check("data: thirteen colourways", data_js.count('style: "') == 13, str(data_js.count('style: "')))
    check("data: the shop's own measurements", "h: 23, w: 34" in data_js and "h: 31, w: 45" in data_js)

    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                                  has_touch=True, user_agent=UA, color_scheme="light")
        page = ctx.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        ev = page.evaluate
        page.set_default_timeout(8000)

        def goto(hash_, ms=750):
            ev("h => { location.hash = h; }", hash_)
            page.wait_for_timeout(ms)

        def count(sel):
            return page.locator(sel).count()

        def store(expr):
            return ev(f"async () => {{ const s = await import('./js/store.js'); return {expr}; }}")

        def click(sel, ms=350, pg=None):
            pg = pg or page
            try:
                pg.locator(sel).first.click(timeout=5000)
            except Exception as ex:  # noqa: BLE001
                FAIL.append(f"click {sel}  →  {str(ex).splitlines()[0][:110]}")
            pg.wait_for_timeout(ms)

        def shot(name):
            page.screenshot(path=str(SHOTS / f"e2e-{name}.png"))

        page.goto(BASE + ("" if LIVE else "?nosw") + "#/", wait_until="load")
        page.wait_for_timeout(2300)

        # ------------------------------------------------------------ home
        check("boot: the opening steps aside", ev("document.getElementById('boot').classList.contains('gone')"))
        check("fonts: Libre Caslon loaded", ev("document.fonts.check('400 34px Caslon')"))
        check("tabs: Home · Shop · Bag · Profile", ev("[...document.querySelectorAll('#tabs .tab-l')].map(e => e.textContent).join('|')") == "Home|Shop|Bag|Profile")
        check("tabs: lens ready, Home current", ev("document.getElementById('tabs').dataset.ready === '1' && document.querySelector('.tab[data-tab=home]').getAttribute('aria-current') === 'page'"))
        glass = ev("(() => { const s = getComputedStyle(document.getElementById('tabs')); return s.backdropFilter || s.webkitBackdropFilter || ''; })()")
        check("tabs: real glass — backdrop blur + saturate", "blur" in glass and "saturate" in glass, glass)
        check("tabs: no transformed/filtered ancestor (a backdrop root would blur nothing)", ev("""(() => {
            let e = document.getElementById('tabs').parentElement;
            while (e) { const s = getComputedStyle(e); if (s.transform !== 'none' || s.filter !== 'none' || +s.opacity < 1) return false; e = e.parentElement; }
            return true; })()"""))
        hero = ev("(() => { const r = document.querySelector('.hero-photo').getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; })()")
        check("home: hero photograph has real size", hero["h"] > 300 and hero["w"] > 300, str(hero))
        check("home: wordmark is the traced vector, eight letters", count(".hero-mark svg path") == 8)
        check("home: seven bags on the rail", count(".rail .hang") == 7)
        check("home: six category circles", count(".circles .circle") == 6)
        check("home: two edits", count(".edit") == 2)
        check("home: says Tehran, Iran", "Tehran, Iran" in page.inner_text("#view"))
        check("home: Instagram @donegoll linked", count('a[href="https://instagram.com/donegoll"]') >= 1)
        foot = ev("(() => { const a = document.querySelector('.foot .powered'); return a ? { href: a.href, text: a.innerText, b: a.querySelector('.alpha-b').getAttribute('src'), w: a.querySelector('.alpha-w').getAttribute('src') } : null; })()")
        check("footer: Alpha's sign — real wordmark PNGs, linked to alphaa.agency",
              bool(foot) and "alphaa.agency" in foot["href"] and "Alpha Agency" in foot["text"]
              and foot["b"].endswith("alpha-black.png") and foot["w"].endswith("alpha-white.png"), str(foot))
        check("footer: Alpha sign image decodes", ev("""(async () => { const i = document.querySelector('.foot .alpha-b'); i.loading = 'eager';
            try { await i.decode(); } catch (e) {} return i.naturalWidth > 0; })()"""))
        shot("home")

        ev("scrollTo({ top: 640, behavior: 'instant' })")
        page.wait_for_timeout(450)
        check("bar: the wordmark hands over to the bar", ev("document.getElementById('bar').dataset.logo") == "1")
        check("bar: scroll-edge blur appears", ev("document.getElementById('bar').dataset.edge") == "1")
        ev("document.querySelector('.rail-track').scrollIntoView({ block: 'center', behavior: 'instant' })")
        page.wait_for_timeout(500)
        ev("(() => { const h = document.querySelectorAll('.rail .hang'); "
           "document.querySelector('.rail-track').scrollBy({ left: h[1].offsetLeft - h[0].offsetLeft, behavior: 'instant' }); })()")   # one card pitch = a snap point; 280px would leave scroll-snap correcting for ~2s
        page.wait_for_timeout(120)
        rot = ev("[...document.querySelectorAll('.rail .hang')].map(h => h.style.transform).join(' ')")
        check("rail: bags swing on their hooks when the rail moves", "rotate(" in rot, rot[:80] or "no transform")
        page.wait_for_timeout(3400)
        check("rail: and settle back to hanging straight", ev("[...document.querySelectorAll('.rail .hang')].every(h => !h.style.transform)"))

        # trap 3: a scrolled long page must not hand its bar to a short one
        goto("#/orders")
        check("router: bar state recomputed on a short page (no inherited edge)", ev("document.getElementById('bar').dataset.edge") == "0")

        # ------------------------------------------------------------ shop
        goto("#/shop")
        check("shop: thirteen colourways", count("#grid .tile") == 13, str(count("#grid .tile")))
        click('[data-cat="tote"]', 350)
        check("shop: Totes filters to four", count("#grid .tile") == 4, str(count("#grid .tile")))
        check("shop: filter kept in the URL", "c=tote" in ev("location.hash"), ev("location.hash"))
        click('[data-cat="all"]', 300)
        page.locator("#shop-q").fill("navy"); page.wait_for_timeout(400)
        check("shop: search 'navy' finds two", count("#grid .tile") == 2, str(count("#grid .tile")))
        page.locator("#shop-q").fill("zzz"); page.wait_for_timeout(400)
        check("shop: no results shows the empty rail", page.locator("#shop-empty").is_visible())
        click("#shop-reset", 350)
        check("shop: reset brings back all thirteen", count("#grid .tile") == 13)
        click("#shop-filter", 700)
        check("shop: filter sheet opens", page.locator(".sheet").is_visible())
        click('.sheet [data-fam="brown"]', 150)
        check("shop: sheet counts before applying", "5 bags" in page.inner_text("#f-apply"), page.inner_text("#f-apply"))
        click("#f-apply", 800)
        check("shop: brown shows five", count("#grid .tile") == 5, str(count("#grid .tile")))
        click('[data-drop="f:brown"]', 350)
        check("shop: dropping the chip clears it", count("#grid .tile") == 13)
        shot("shop")

        # ---------------------------------------------------------- product
        goto("#/p/slouch-cocoa", 900)
        check("product: name and price", "Slouch Shoulder Bag" in page.inner_text(".pdp-name") and "2,450,000" in page.inner_text(".pdp-price"))
        check("product: three colour swatches", count(".pdp-sw a") == 3)
        check("product: three photographs, one measured", count(".pdp-slide") == 3 and count(".pdp-cap") == 1)
        check("product: the shop's measurement shown", "23 cm tall, 34 cm wide" in page.inner_text("#view"))
        check("product: club points line", "points" in page.inner_text(".pdp-earn"))
        hist = ev("history.length")
        click('.pdp-sw a[aria-label="Sand"]', 700)
        check("product: swatch swaps colourway in place (no history pile-up)", ev("location.hash") == "#/p/slouch-sand" and ev("history.length") == hist, f"{ev('location.hash')} {ev('history.length')} vs {hist}")
        click(".pdp-buy [data-add]", 1100)
        check("bag: badge shows 1 after adding", ev("document.getElementById('bag-badge').textContent") == "1" and ev("document.getElementById('bag-badge').classList.contains('on')"))
        check("product: button confirms", "Added" in page.inner_text(".pdp-buy .btn"))
        ev("scrollTo({ top: 760, behavior: 'instant' })"); page.wait_for_timeout(450)
        check("bar: product name + Add hand over once the name scrolls away", ev("document.getElementById('bar').dataset.titled") == "1")
        shot("product")

        # trap 1: listeners must not stack across visits — tap once, toggle once
        for _ in range(3):
            goto("#/shop", 400); goto("#/p/tote-ecru", 400)
        store("s.isSaved('tote-ecru') && s.toggleSaved('tote-ecru')")          # start from unsaved, whatever came before
        ev("document.querySelector('.pdp-buy [data-save]').click()"); page.wait_for_timeout(300)
        check("router: one tap saves once after three visits (no stacked handlers)", store("s.isSaved('tote-ecru')") is True)
        ev("document.querySelector('.pdp-buy [data-save]').click()"); page.wait_for_timeout(300)
        check("router: and unsaves once", store("s.isSaved('tote-ecru')") is False)
        # trap 2: going to the hash you are on must re-render, not freeze
        goto("#/shop", 500)
        ev("document.querySelector('#view .screen').dataset.mark = 'old'")
        ev("import('./js/router.js').then(r => r.go('#/shop'))"); page.wait_for_timeout(500)
        check("router: same-hash navigation refreshes in place", ev("document.querySelector('#view .screen').dataset.mark") != "old")

        # -------------------------------------------- bag + the club working
        goto("#/bag", 900)
        check("bag: one line", count("#lines .line-wrap") == 1)
        click("#lines .qty [data-inc]", 350)
        check("bag: stepper reprices live", "4,900,000" in page.inner_text("#bag-sum"), page.inner_text("#bag-sum")[:80])
        check("bag: club shows points waiting for a guest", "points waiting" in page.inner_text("#bag-club"))
        check("bag: checkout dock floats with the total", "5,020,000" in page.inner_text("#dock-root") and "120,000" in page.inner_text("#bag-sum"))
        click("#bag-club [data-join]", 700)
        page.locator('.sheet input[name="name"]').fill("Test Person")
        page.locator('.sheet input[name="phone"]').fill("۰۹۱۲ ۳۴۵ ۶۷۸۹")          # typed on a Persian keyboard
        click(".sheet .btn[type=submit]", 900)
        m = store("s.member()")
        check("club: joining from the bag makes a member with 100 points", bool(m) and m["points"] == 100 and m["phone"] == "09123456789", str(m)[:120])
        check("club: bag now offers to spend the points", count("#use-pts") == 1)
        if count("#use-pts") and not ev("document.getElementById('use-pts').checked"):
            page.locator("#use-pts").check(force=True); page.wait_for_timeout(350)
        check("club: spending points reprices the order", "−100,000" in page.inner_text("#bag-sum"), page.inner_text("#bag-sum")[:120])
        check("club: ladder preview shows where this order takes you", count("#bag-club .progress i.ghost") == 1)
        shot("bag")

        # swipe-to-remove (touch pointer events) and undo
        store("s.addToBag('crescent-bone')")
        goto("#/shop", 400); goto("#/bag", 800)   # the hash you are on fires nothing: leave and come back
        check("bag: two lines", count("#lines .line-wrap") == 2)
        ev("""(() => {
            const row = document.querySelectorAll('#lines .line')[1]; if (!row) return;
            const r = row.getBoundingClientRect();
            const y = r.top + r.height / 2, x0 = r.right - 30;
            const fire = (type, x) => row.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId: 7, clientX: x, clientY: y, isPrimary: true }));
            fire('pointerdown', x0);
            for (let i = 1; i <= 12; i++) fire('pointermove', x0 - i * 28);
            fire('pointerup', x0 - 12 * 28);
        })()""")
        page.wait_for_timeout(1100)
        check("bag: a full swipe takes the line out", count("#lines .line-wrap") == 1, str(count("#lines .line-wrap")))
        check("bag: with an undo", page.locator(".island .island-a").count() == 1)
        click(".island .island-a", 600)
        check("bag: undo puts it back", count("#lines .line-wrap") == 2)
        click('#lines .line-wrap >> nth=1 >> [data-act="x"]', 1000)
        check("bag: the × removes for a mouse", count("#lines .line-wrap") == 1)

        # ------------------------------------------------------- checkout
        goto("#/checkout", 900)
        check("checkout: pay button carries the total", page.inner_text("#pay").startswith("Pay "), page.inner_text("#pay"))
        check("checkout: contact prefilled from the club", page.locator('input[name="name"]').input_value() == "Test Person")
        page.locator('textarea[name="address"]').fill("")
        click("#pay", 500)
        check("checkout: inline error on a missing address", ev("document.getElementById('f-address').classList.contains('bad')"))
        page.locator('input[name="delivery"][value="post"]').check(force=True); page.wait_for_timeout(250)
        check("checkout: pay-on-delivery only with the Tehran courier", ev("document.querySelector('input[name=payment][value=cod]').disabled"))
        page.locator('input[name="delivery"][value="courier"]').check(force=True); page.wait_for_timeout(250)
        page.locator('textarea[name="address"]').fill("Valiasr Street, No. 12, Unit 4")
        before = store("s.member().points")
        used = store("s.quote().used")
        click("#pay", 2600)
        check("checkout: pays and lands on thank-you", ev("location.hash").startswith("#/thanks/"), ev("location.hash"))
        order = store("s.orders()[0]")
        check("thanks: points count up to what was earned", page.inner_text("#earned-n").replace(",", "") == f"+{order['earned']}", page.inner_text("#earned-n") if count("#earned-n") else "none")
        after = store("s.member().points")
        check("club: balance = before − spent + earned", after == before - used + order["earned"], f"{before} - {used} + {order['earned']} != {after}")
        check("order: bag emptied", ev("document.getElementById('bag-badge').classList.contains('on')") is False)
        shot("thanks")
        oid = order["id"]

        # thank-you celebrates only the payment just made
        p2 = ctx.new_page()
        p2.goto(BASE + ("" if LIVE else "?nosw") + f"#/thanks/{oid}", wait_until="load"); p2.wait_for_timeout(1800)
        check("thanks: another arrival is sent to the order itself", p2.evaluate("location.hash") == f"#/order/{oid}", p2.evaluate("location.hash"))
        # a cold deep link has no history: back goes up to the parent, not out
        p2.evaluate("location.replace(location.pathname + location.search + '#/p/tote-navy')"); p2.wait_for_timeout(1200)
        p2.reload(); p2.wait_for_timeout(1800)
        click("#bar-back", 700, p2)
        check("router: back from a cold deep link goes to the shop", p2.evaluate("location.hash") == "#/shop", p2.evaluate("location.hash"))
        p2.close()

        # ------------------------------------------------------------ profile
        goto("#/profile", 900)
        check("profile: club card with the right balance", f"{after:,}" in page.inner_text(".mcard-pts"))
        click("#mcard", 1300)
        check("profile: the card turns over to its QR", "rotateY(180" in ev("document.getElementById('mcard').style.transform"), ev("document.getElementById('mcard').style.transform"))
        check("profile: QR is a real code", count(".mcard-back svg path") == 1)
        click('[data-seg="theme"] [data-v="dark"]', 400)
        check("appearance: Dark switches the theme", ev("document.documentElement.dataset.theme") == "dark")
        shot("profile-dark")
        click('[data-seg="theme"] [data-v="system"]', 400)
        check("appearance: System follows the phone", ev("document.documentElement.dataset.theme") == "light")
        click("#signout", 700)
        click("#so-yes", 900)
        check("profile: sign out returns to the join screen", count("#join") == 1)
        click("#sample", 900)
        check("profile: sample member loads, labelled", "Sara Karimi" in page.inner_text("#view") and count(".sample") >= 1)
        goto("#/orders", 800)
        check("orders: sample history listed", count(".order-card") >= 4, str(count(".order-card")))
        goto("#/club", 800)
        check("club: tiers and a ledger", count(".tier-card") == 3 and count(".ledger .cell") >= 5)

        # ------------------------------------------------------------ layout
        for h in ["#/", "#/shop", "#/p/fringe-navy", "#/bag", "#/checkout", "#/profile", "#/club", "#/orders", "#/saved"]:
            goto(h, 600)
            check(f"layout: nothing scrolls sideways on {h}", ev("document.documentElement.scrollWidth <= innerWidth + 1"),
                  f"{ev('document.documentElement.scrollWidth')} > {ev('innerWidth')}")
        check("console: no errors on the phone run", not errors, " | ".join(errors[:4]))

        # -------------------------------------------------------- the service worker
        if LIVE:
            reg = ev("navigator.serviceWorker.getRegistration().then(r => !!r)")
            page.wait_for_timeout(2500)
            check("pwa: service worker registered", reg or ev("navigator.serviceWorker.getRegistration().then(r => !!r)"))
            page.reload(); page.wait_for_timeout(2500)
            ctx.set_offline(True)
            page.reload(); page.wait_for_timeout(2500)
            check("pwa: opens offline", count(".tabs .tab") == 4 and count("#view .screen") == 1)
            ctx.set_offline(False)
        ctx.close()

        # ----------------------------------------------------------- desktop
        d = browser.new_context(viewport={"width": 1440, "height": 900})
        dp = d.new_page()
        dp.goto(BASE + ("" if LIVE else "?nosw") + "#/", wait_until="load"); dp.wait_for_timeout(2200)
        check("desktop: tab bar moves to the top, iPad-style", dp.evaluate("document.getElementById('tabs').getBoundingClientRect().top") < 40)
        dp.evaluate("location.hash = '#/shop'"); dp.wait_for_timeout(900)
        cols = dp.evaluate("getComputedStyle(document.getElementById('grid')).gridTemplateColumns.split(' ').length")
        check("desktop: four-column shop", cols == 4, str(cols))
        dp.screenshot(path=str(SHOTS / "e2e-desktop-shop.png"))
        d.close()

        # -------------------------------------------------------------- dark
        k = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme="dark")
        kp = k.new_page()
        kp.goto(BASE + ("" if LIVE else "?nosw") + "#/", wait_until="load"); kp.wait_for_timeout(2200)
        check("dark: follows the phone on first paint", kp.evaluate("document.documentElement.dataset.theme") == "dark")
        bg = kp.evaluate("getComputedStyle(document.body).backgroundColor")
        check("dark: paper goes dark", bg in ("rgb(15, 14, 13)",), bg)
        kp.screenshot(path=str(SHOTS / "e2e-dark-home.png"))
        k.close()
        browser.close()

    print(f"\n{len(PASS)} passed, {len(FAIL)} failed  ({BASE})")
    for f in FAIL:
        print("  FAIL", f)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
