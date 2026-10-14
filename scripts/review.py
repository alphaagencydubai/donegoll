#!/usr/bin/env python3
"""Visual review — not the test suite (that is e2e.py).

Captures every screen full-page, on a phone and on a desktop, light and dark,
as a guest and as the sample member, then stitches contact sheets so a whole
pass can be judged in a few images:

    python3 scripts/review.py [base-url]      → scripts/shots/sheet-*.png

Uses the system Chrome (Playwright's own browsers are not installed on this Mac).
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8171/").rstrip("/") + "/"
OUT = pathlib.Path(__file__).resolve().parent / "shots"
OUT.mkdir(parents=True, exist_ok=True)
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")


def settle(page, ms=900):
    page.wait_for_timeout(ms)
    page.evaluate("""() => {
        document.querySelectorAll('.rv').forEach(e => e.classList.add('in'));
        const b = document.getElementById('boot'); if (b) b.classList.add('gone');
    }""")
    page.wait_for_timeout(450)


def go(page, hash_, ms=900):
    page.evaluate("h => { location.hash = h; }", hash_)
    settle(page, ms)


def store(page, js):
    """Run code against the app's own store module (same URL = same module instance)."""
    page.evaluate(f"""async () => {{
        const s = await import('./js/store.js');
        const r = await import('./js/router.js');
        {js}
        await r.refresh();
    }}""")
    settle(page, 500)


def cap(page, name, full=True):
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=full)
    return name


def run(p, *, width, height, scale, mobile, dark, tag):
    b = p.chromium.launch(channel="chrome", headless=True)
    ctx = b.new_context(viewport={"width": width, "height": height}, device_scale_factor=scale,
                        is_mobile=mobile, has_touch=mobile, user_agent=UA if mobile else None,
                        color_scheme="dark" if dark else "light")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(BASE + "#/", wait_until="load")
    settle(page, 1800)
    names = []
    names.append(cap(page, f"{tag}-home"))
    go(page, "#/shop"); names.append(cap(page, f"{tag}-shop"))
    go(page, "#/p/slouch-cocoa"); names.append(cap(page, f"{tag}-product"))
    if not dark:
        go(page, "#/bag"); names.append(cap(page, f"{tag}-bag-empty"))
        go(page, "#/profile"); names.append(cap(page, f"{tag}-profile-guest"))
    store(page, "s.addToBag('varsity-cherry'); s.addToBag('fringe-navy');")
    go(page, "#/bag"); names.append(cap(page, f"{tag}-bag-guest"))
    if not dark:
        go(page, "#/checkout"); names.append(cap(page, f"{tag}-checkout-guest"))
    store(page, "s.seedSample();")
    go(page, "#/bag"); names.append(cap(page, f"{tag}-bag-member"))
    go(page, "#/profile"); names.append(cap(page, f"{tag}-profile-member"))
    if not dark:
        go(page, "#/checkout"); names.append(cap(page, f"{tag}-checkout-member"))
        go(page, "#/club"); names.append(cap(page, f"{tag}-club"))
        go(page, "#/orders"); names.append(cap(page, f"{tag}-orders"))
        oid = page.evaluate("async () => (await import('./js/store.js')).orders()[0].id")
        go(page, f"#/order/{oid}"); names.append(cap(page, f"{tag}-order"))
        go(page, "#/saved"); names.append(cap(page, f"{tag}-saved"))
        page.evaluate("""async () => {
            const s = await import('./js/store.js');
            const o = s.placeOrder({ contact: { name: 'Sara Karimi', phone: '09120000000' }, address: 'Sample street 12, unit 4', city: 'Tehran', delivery: 'courier', payment: 'online' });
            location.hash = '#/thanks/' + o.id;
        }""")
        settle(page, 2200)
        names.append(cap(page, f"{tag}-thanks"))
    ctx.close()
    b.close()
    return names, errors


def sheets(names, tag, col_w=375, seg_h=1900, per=4):
    """Split every capture into segments of seg_h and lay four segments to a sheet."""
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)
    segs = []
    for n in names:
        im = Image.open(OUT / f"{n}.png").convert("RGB")
        im = im.resize((col_w, round(im.height * col_w / im.width)), Image.LANCZOS)
        for i, y in enumerate(range(0, im.height, seg_h)):
            segs.append((f"{n} {i + 1}", im.crop((0, y, col_w, min(im.height, y + seg_h)))))
    out = []
    for k in range(0, len(segs), per):
        group = segs[k:k + per]
        h = max(s.height for _, s in group) + 34
        sheet = Image.new("RGB", (per * (col_w + 16) + 16, h), (200, 200, 205))
        d = ImageDraw.Draw(sheet)
        for i, (label, s) in enumerate(group):
            x = 16 + i * (col_w + 16)
            d.text((x, 8), label, fill=(20, 20, 20), font=font)
            sheet.paste(s, (x, 32))
        path = OUT / f"sheet-{tag}-{k // per + 1:02d}.png"
        sheet.save(path)
        out.append(path.name)
    return out


if __name__ == "__main__":
    with sync_playwright() as p:
        all_errors = []
        for cfg in [
            dict(width=375, height=812, scale=2, mobile=True, dark=False, tag="m"),
            dict(width=375, height=812, scale=2, mobile=True, dark=True, tag="md"),
            dict(width=1440, height=900, scale=1, mobile=False, dark=False, tag="d"),
        ]:
            names, errors = run(p, **cfg)
            all_errors += [f"[{cfg['tag']}] {e}" for e in errors]
            made = sheets(names, cfg["tag"], col_w=375 if cfg["mobile"] else 720, seg_h=1900 if cfg["mobile"] else 1300, per=4 if cfg["mobile"] else 2)
            print(cfg["tag"], len(names), "screens →", ", ".join(made))
        print("console/page errors:", len(all_errors))
        for e in all_errors[:20]:
            print("  ", e)
