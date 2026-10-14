#!/usr/bin/env python3
"""Done Goll photo pipeline — the shop's nine rail photographs in, everything the
site shows out. Nothing is upscaled, ever; every crop is cut from the source at
its own resolution.

  1. Lift the watermark. Every photo carries "DONE GOLL DONE GOLL DONE GOLL" in
     white at ~26% across the bags. The glyphs are found as pixels whose lift over
     the local ground is consistent with a white overlay at that opacity — which
     leaves out the white stars, the piping and the gaps between fringe strands,
     whose lift is far too strong — and only those pixels are inpainted.
     (Reversing the blend was tried first; it printed the letters back in dark.)
  2. Scenes: the whole photograph, cleaned, at 1x and a 640 width.
  3. Tiles: one 3:4 crop per colourway, at 1x and 360 wide, plus a 12px
     blur-up placeholder, the wall colour behind it and the bag's own colour
     sampled off the body for the swatch.
  4. PWA icons from the client's wordmark.
  5. js/assets.gen.js for the app, and review sheets in scripts/shots/.

    python3 scripts/build_assets.py
"""
import base64
import io
import json
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "src"
OUT_T = ROOT / "assets" / "photos" / "t"
OUT_S = ROOT / "assets" / "photos" / "s"
ICONS = ROOT / "assets" / "icons"
GEN = ROOT / "js" / "assets.gen.js"
REVIEW = ROOT / "scripts" / "shots"

# photoN.png = the client's screenshots in time order (see README)
SCENES = {
    "slouch-pair": 0, "slouch-cocoa": 1, "slouch-black": 2, "tote-pair": 3, "tote-navy": 4,
    "varsity-pair": 5, "pocket-pair": 6, "crescent-pair": 7, "fringe-pair": 8,
}

# where the watermark runs, (x0, x1, y-centre), read off the full-size photos and refined in code
ANCHOR = {0: (335, 800, 822), 1: (405, 870, 845), 2: (395, 858, 870), 3: (340, 848, 943),
          4: (405, 912, 880), 5: (320, 828, 828), 6: (362, 870, 850), 7: (368, 832, 840), 8: (395, 858, 962)}

# The varsity photo runs the letters across white stars, piping and cream leather:
# a wider halo and a lower ceiling on what counts as ground there.
# Over the cream bag the letters barely register, and lifting them smears the bag's
# shadowed lower edge — so there it is left alone and only the red bag is cleaned.
STRICT = {5: {"halo": 11, "bright": 180, "x_range": (0, 575)}}

# tiles: (photo, x0, y0, width) — height is width * 4/3; plus a point on the bag body for its colour
TILES = {
    "slouch-cocoa":    (0,  78, 230, 525, (330, 780)),
    "slouch-sand":     (0, 457, 230, 525, (700, 790)),
    "slouch-black":    (2, 190, 210, 580, (470, 820)),
    "tote-chocolate":  (3,  15, 300, 540, (260, 880)),
    "tote-ecru":       (3, 450, 320, 528, (770, 900)),
    "tote-navy":       (4, 170, 175, 620, (450, 820)),
    "varsity-cherry":  (5,  30, 215, 540, (120, 620)),
    "varsity-cream":   (5, 460, 230, 514, (640, 600)),
    "pocket-espresso": (6,  60, 250, 550, (200, 660)),
    "crescent-mocha":  (7,  40, 290, 520, (250, 720)),
    "crescent-bone":   (7, 470, 300, 512, (700, 740)),
    "fringe-cognac":   (8,  30, 420, 570, (150, 660)),
    "fringe-navy":     (8, 410, 440, 570, (620, 900)),
}

K11 = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))


# --------------------------------------------------------------- watermark
def lift_watermark(im8, anchor, halo=7, bright=200, x_range=None):
    lum = cv2.cvtColor(im8, cv2.COLOR_BGR2GRAY).astype(np.float32)
    h, w = lum.shape
    x0, x1, yc = anchor
    # rough pass: bright thin strokes over a morphological ground
    op = cv2.GaussianBlur(cv2.morphologyEx(lum, cv2.MORPH_OPEN, K11), (0, 0), 1.2)
    r0 = (lum - op) / np.maximum(255 - op, 1)
    band = r0[yc - 22:yc + 22, x0:x1]
    score = ((band > .1) & (band < .7)).sum(axis=1)
    rows = np.where(score > score.max() * .25)[0]
    ya, yb = yc - 22 + rows.min() - 2, yc - 22 + rows.max() + 3
    xa, xb = max(0, x0 - 8), min(w, x1 + 8)
    if x_range:                              # lift only where it can be lifted cleanly
        xa, xb = max(xa, x_range[0]), min(xb, x_range[1])
    box = np.zeros((h, w), bool)
    box[ya:yb, xa:xb] = True
    m0 = box & (r0 > .08) & (r0 < .75)
    # a clean local ground, then the overlay's true opacity measured against it
    ground = cv2.inpaint(im8, cv2.dilate(m0.astype(np.uint8) * 255, np.ones((5, 5), np.uint8)), 5, cv2.INPAINT_TELEA)
    gl = cv2.cvtColor(ground, cv2.COLOR_BGR2GRAY).astype(np.float32)
    r = (lum - gl) / np.maximum(255 - gl, 1)
    core = m0 & (gl < 150) & (r > .05)
    a0 = float(np.clip(np.median(r[core]) if core.sum() > 80 else .26, .18, .35))
    # glyphs: lift consistent with a white overlay at a0 — stars and piping lift far more.
    # Leave bright ground alone: over cream and white the letters barely register, and
    # inpainting there speckles the leather and nibbles the edge of the white stars.
    # The halo has to cover the soft JPEG edge of a white shape, which runs 3–4px.
    near_white = cv2.dilate((lum > 222).astype(np.uint8), np.ones((halo, halo), np.uint8)) > 0
    glyph = (box & (r > a0 * .35) & (r < a0 * 2.4) & (gl < bright) & ~near_white).astype(np.uint8)
    # Colour alone cannot tell a letter from a grey shape: a star in shadow on red
    # leather lifts exactly like white type at 30%. Shape can — the watermark's
    # strokes are thin, so a shape a square fits inside is not a letter.
    # strokes are 1–4px (stems up to ~5px), so only a blob a 7×7 square fits inside,
    # and a sizeable one, is not a letter
    thick = cv2.morphologyEx(glyph, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    n_t, lab_t, st_t, _ = cv2.connectedComponentsWithStats(thick, connectivity=8)
    big = np.isin(lab_t, [i for i in range(1, n_t) if st_t[i, cv2.CC_STAT_AREA] >= 40]).astype(np.uint8)
    glyph = glyph & (1 - cv2.dilate(big, np.ones((9, 9), np.uint8)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(glyph, connectivity=8)
    keep = np.zeros_like(glyph)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= 4:
            keep[lab == i] = 1
    mask = cv2.dilate(keep * 255, np.ones((3, 3), np.uint8), 1)
    out = cv2.inpaint(im8, mask, 3, cv2.INPAINT_TELEA)
    return out, (ya, yb, xa, xb), a0, int((mask > 0).sum())


# ------------------------------------------------------------------ output
def webp(img, path, q=80):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=q, method=5)
    return path.stat().st_size


def lqip(img):
    small = img.resize((12, max(1, round(12 * img.height / img.width))), Image.LANCZOS)
    buf = io.BytesIO()
    small.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def hexof(rgb):
    return "#%02X%02X%02X" % tuple(int(v) for v in rgb)


def sample(arr, x, y, r=9):
    patch = arr[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].reshape(-1, 3)
    return np.median(patch, axis=0)


def ground_of(arr):
    """The wall behind: the brightest third of the frame's border pixels."""
    border = np.concatenate([arr[:12].reshape(-1, 3), arr[-12:].reshape(-1, 3),
                             arr[:, :12].reshape(-1, 3), arr[:, -12:].reshape(-1, 3)])
    lum = border @ np.array([.299, .587, .114])
    return np.median(border[lum >= np.percentile(lum, 66)], axis=0)


# -------------------------------------------------------------------- icons
def build_icons():
    ICONS.mkdir(parents=True, exist_ok=True)
    logo = Image.open(SRC / "logo.png").convert("RGBA")
    a = np.asarray(logo)[..., 3]
    ys, xs = np.where(a > 8)
    mark = logo.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    alpha = mark.split()[3]
    paper, ink = (244, 242, 238, 255), (20, 19, 18, 255)

    def put(size, frac, bg=paper, fg=ink, src_alpha=alpha):
        can = Image.new("RGBA", (size, size), bg)
        w = round(size * frac)
        h = round(src_alpha.height * w / src_alpha.width)
        al = src_alpha.resize((w, h), Image.LANCZOS)
        fgimg = Image.new("RGBA", (w, h), fg)
        fgimg.putalpha(al)
        can.alpha_composite(fgimg, ((size - w) // 2, (size - h) // 2))
        return can

    put(512, .62).save(ICONS / "icon-512.png")
    put(192, .62).save(ICONS / "icon-192.png")
    put(180, .62).convert("RGB").save(ICONS / "apple-touch-icon.png")
    put(512, .5).save(ICONS / "maskable-512.png")
    # favicon: the D alone — the stacked mark is a smudge at 32px
    top = np.asarray(alpha)[: alpha.height // 2]
    n, lab, stats, _ = cv2.connectedComponentsWithStats((top > 127).astype(np.uint8), connectivity=8)
    first = min(range(1, n), key=lambda i: stats[i, cv2.CC_STAT_LEFT] if stats[i, cv2.CC_STAT_AREA] > 500 else 1e9)
    x, y, w, h = stats[first, :4]
    d_alpha = alpha.crop((max(0, x - 2), max(0, y - 2), x + w + 2, y + h + 2))
    can = Image.new("RGBA", (64, 64), paper)
    hh = 42
    ww = round(d_alpha.width * hh / d_alpha.height)
    al = d_alpha.resize((ww, hh), Image.LANCZOS)
    f = Image.new("RGBA", (ww, hh), ink)
    f.putalpha(al)
    can.alpha_composite(f, ((64 - ww) // 2, (64 - hh) // 2))
    can.save(ICONS / "favicon.png")
    return ["icon-512.png", "icon-192.png", "apple-touch-icon.png", "maskable-512.png", "favicon.png"]


# --------------------------------------------------------------------- main
def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    cleaned, meta_s, meta_t = {}, {}, {}
    review_rows = []
    total = 0
    for k in range(9):
        im8 = cv2.imread(str(SRC / f"photo{k}.png"), cv2.IMREAD_COLOR)
        if im8 is None:
            sys.exit(f"missing scripts/src/photo{k}.png")
        out, (ya, yb, xa, xb), a0, npx = lift_watermark(im8, ANCHOR[k], **STRICT.get(k, {}))
        cleaned[k] = out
        print(f"photo{k}: watermark y{ya}-{yb} opacity {a0:.3f}, {npx} px lifted")
        pad = 26
        for part in (im8, out):
            c = cv2.cvtColor(part[max(0, ya - pad):yb + pad, max(0, xa - 10):xb + 10], cv2.COLOR_BGR2RGB)
            p = Image.fromarray(c)
            review_rows.append(p.resize((p.width * 2, p.height * 2), Image.LANCZOS))

    for sid, k in SCENES.items():
        rgb = Image.fromarray(cv2.cvtColor(cleaned[k], cv2.COLOR_BGR2RGB))
        total += webp(rgb, OUT_S / f"{sid}.webp", 82)
        mid = rgb.resize((640, round(640 * rgb.height / rgb.width)), Image.LANCZOS)
        total += webp(mid, OUT_S / f"{sid}-m.webp", 80)
        meta_s[sid] = {"w": rgb.width, "h": rgb.height, "lqip": lqip(rgb),
                       "ground": hexof(ground_of(np.asarray(rgb)))}

    sheet_tiles = []
    for tid, (k, x0, y0, w, pt) in TILES.items():
        arr = cv2.cvtColor(cleaned[k], cv2.COLOR_BGR2RGB)
        H, W = arr.shape[:2]
        h = round(w * 4 / 3)
        x0 = int(np.clip(x0, 0, W - w))
        y0 = int(np.clip(y0, 0, H - h))
        crop = Image.fromarray(arr[y0:y0 + h, x0:x0 + w])
        total += webp(crop, OUT_T / f"{tid}.webp", 82)
        small = crop.resize((360, 480), Image.LANCZOS)
        total += webp(small, OUT_T / f"{tid}-s.webp", 80)
        colour = sample(arr, *pt)
        meta_t[tid] = {"w": crop.width, "h": crop.height, "lqip": lqip(crop),
                       "hex": hexof(colour), "ground": hexof(ground_of(np.asarray(crop)))}
        sheet_tiles.append((tid, crop, meta_t[tid]["hex"]))

    icons = build_icons()

    GEN.write_text(
        "// Generated by scripts/build_assets.py — sizes, blur-up placeholders and sampled colours.\n"
        "// Do not edit by hand; rerun the script.\n"
        f"export const ASSETS = {json.dumps({'tiles': meta_t, 'scenes': meta_s}, indent=1)};\n",
        encoding="utf-8")

    # review: watermark before/after
    Wd = max(p.width for p in review_rows)
    sheet = Image.new("RGB", (Wd, sum(p.height + 6 for p in review_rows)), (255, 0, 0))
    y = 0
    for p in review_rows:
        sheet.paste(p, (0, y))
        y += p.height + 6
    sheet.save(REVIEW / "review-watermark.png")
    # review: tiles with their swatches
    cw, ch = 260, 347
    cols = 5
    rows = (len(sheet_tiles) + cols - 1) // cols
    ts = Image.new("RGB", (cols * (cw + 12) + 12, rows * (ch + 46) + 12), (250, 250, 250))
    d = ImageDraw.Draw(ts)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
    except Exception:
        font = ImageFont.load_default()
    for i, (tid, crop, hx) in enumerate(sheet_tiles):
        x, y = 12 + (i % cols) * (cw + 12), 12 + (i // cols) * (ch + 46)
        ts.paste(crop.resize((cw, ch), Image.LANCZOS), (x, y))
        d.rectangle((x, y + ch + 8, x + 24, y + ch + 32), fill=hx)
        d.text((x + 32, y + ch + 12), f"{tid}  {hx}", fill=(20, 20, 20), font=font)
    ts.save(REVIEW / "review-tiles.png")
    print(f"scenes {len(meta_s)}  tiles {len(meta_t)}  icons {len(icons)}  photos {total/1024:.0f}KB  → js/assets.gen.js")


if __name__ == "__main__":
    main()
