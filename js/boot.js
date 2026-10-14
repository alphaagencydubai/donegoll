// The opening: the eight letters of the wordmark settle in turn, the rail draws
// underneath, and both step aside. A little over a second cold, half that warm,
// nothing at all with reduced motion. A tap skips it.

import { STORAGE } from "./config.js";
import { reduced } from "./motion.js";
import { WORDMARK } from "./brand.js";

export function runBoot() {
  const boot = document.getElementById("boot");
  if (!boot) return;
  const mark = document.getElementById("boot-mark");
  mark.innerHTML = WORDMARK;
  mark.querySelectorAll("path").forEach((p, i) => { p.style.animationDelay = `${i * 60}ms`; });

  let warm = false;
  try { warm = sessionStorage.getItem(STORAGE + "booted") === "1"; sessionStorage.setItem(STORAGE + "booted", "1"); } catch {}
  if (warm) boot.classList.add("warm");

  const go = () => {
    if (boot.classList.contains("gone")) return;
    boot.classList.add("gone");
    document.documentElement.dataset.booted = "1";
  };
  if (reduced()) { go(); return; }
  boot.addEventListener("pointerdown", go, { once: true });
  setTimeout(go, warm ? 520 : 1350);
}
