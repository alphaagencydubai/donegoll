#!/usr/bin/env python3
"""Stamp the build before every deploy.

Content-hashes the shell (index.html, the manifest, the stylesheet, every module)
into the service worker's VERSION and into the ?v= on the stylesheet and entry
module, and writes the worker's SHELL and PRECACHE lists from what is actually on
disk — so a new view or a new photo can never be missing from the offline cache
because somebody forgot a list.

    python3 build.py
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent

shell = sorted([ROOT / "index.html", ROOT / "manifest.webmanifest", ROOT / "css" / "app.css",
                *ROOT.glob("js/**/*.js")])
h = hashlib.sha1()
for f in shell:
    h.update(f.relative_to(ROOT).as_posix().encode())
    h.update(re.sub(rb"\?v=[0-9a-f]{10}", b"", f.read_bytes()))
stamp = h.hexdigest()[:10]

rel = lambda p: "./" + p.relative_to(ROOT).as_posix()
shell_urls = ["./"] + [rel(p) for p in shell]
precache = sorted(
    [rel(p) for p in (ROOT / "assets" / "fonts").glob("*.woff2")]
    + [rel(p) for p in (ROOT / "assets" / "brand").glob("*") if p.suffix in (".svg", ".png")]
    + [rel(ROOT / "assets" / "icons" / n) for n in ("icon-192.png", "apple-touch-icon.png", "favicon.png")]
    + [rel(p) for p in (ROOT / "assets" / "photos" / "t").glob("*-s.webp")]
)

sw = ROOT / "sw.js"
s = sw.read_text()
s = re.sub(r'const VERSION = "dg-[^"]*";', f'const VERSION = "dg-{stamp}";', s)
s = re.sub(r"const SHELL = \[[^\]]*\];", "const SHELL = " + json.dumps(shell_urls, indent=2) + ";", s)
s = re.sub(r"const PRECACHE = \[[^\]]*\];", "const PRECACHE = " + json.dumps(precache, indent=2) + ";", s)
sw.write_text(s)

idx = ROOT / "index.html"
t = idx.read_text()
t = re.sub(r'css/app\.css(\?v=[0-9a-f]+)?"', f'css/app.css?v={stamp}"', t)
t = re.sub(r'js/app\.js(\?v=[0-9a-f]+)?"', f'js/app.js?v={stamp}"', t)

# Without a bundler the browser only discovers an import once its parent has
# arrived — one round trip per level, and from Tehran to GitHub Pages that is most
# of a cold start. Announce every module up front. Unversioned on purpose: the
# imports are ("./config.js"), and a versioned preload would not match them and
# the file would be fetched twice.
mods = sorted(p for p in ROOT.glob("js/**/*.js") if p.name != "app.js")
links = "\n".join(f'<link rel="modulepreload" href="{p.relative_to(ROOT).as_posix()}">' for p in mods)
block = f"<!-- modulepreload:start -->\n{links}\n<!-- modulepreload:end -->"
if "<!-- modulepreload:start -->" in t:
    t = re.sub(r"<!-- modulepreload:start -->.*?<!-- modulepreload:end -->", lambda _: block, t, flags=re.S)
else:
    t = t.replace('<script type="module"', block + '\n<script type="module"', 1)
idx.write_text(t)
print(f"build {stamp}: {len(shell_urls)} shell files, {len(precache)} precached assets, {len(mods)} modules preloaded")
