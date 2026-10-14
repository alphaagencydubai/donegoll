// The rail. Every bag in Done Goll's photographs hangs from an S-hook on a black
// rail, so the home page has one: the rail stays put and the bags slide along it,
// and each one swings on its hook — a pendulum driven by how fast the rail is
// moving, underdamped so it overshoots and settles the way a real bag does.
// When the rail first comes into view the bags get a nudge, as if just hung.

import { reduced } from "./motion.js";

export function mountRail(root) {
  const track = root.querySelector(".rail-track");
  const cards = [...root.querySelectorAll(".hang")];
  if (!track || !cards.length || reduced()) return;

  const st = cards.map((_, i) => ({ a: 0, v: 0, k: 56 * (1 + (i % 3) * .1), c: 5.2 }));   // ζ≈.35: two swings and still, ~2s
  let lastX = track.scrollLeft, lastT = 0, vel = 0, raf = 0, running = false;

  const tick = (now) => {
    if (!root.isConnected || document.hidden) {
      running = false;
      cards.forEach((c, i) => { st[i].a = st[i].v = 0; c.style.transform = ""; });
      return;
    }
    const dt = Math.min(.034, lastT ? (now - lastT) / 1000 : 1 / 60);
    lastT = now;
    const x = track.scrollLeft;
    vel += ((x - lastX) / dt - vel) * .35;          // smoothed rail speed, px/s
    lastX = x;
    // content moving left drags the hook left; the bag lags behind it
    const target = Math.max(-11, Math.min(11, -vel * .012));
    let live = Math.abs(vel) > 6;
    for (let i = 0; i < cards.length; i++) {
      const s = st[i];
      const acc = -s.k * (s.a - target) - s.c * s.v;
      s.v += acc * dt;
      s.a += s.v * dt;
      if (Math.abs(s.a) > .08 || Math.abs(s.v) > .5) live = true;   // below a tenth of a degree nobody sees it
      cards[i].style.transform = `rotate(${s.a.toFixed(3)}deg)`;
    }
    if (live) raf = requestAnimationFrame(tick);
    else { running = false; cards.forEach((c) => { c.style.transform = ""; }); }
  };
  const run = () => {
    if (running) return;
    running = true;
    lastT = 0;
    lastX = track.scrollLeft;
    raf = requestAnimationFrame(tick);
  };
  track.addEventListener("scroll", run, { passive: true });

  // just hung: a small swing each, alternating, when the rail first shows
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      st.forEach((s, i) => { s.v = (i % 2 ? -1 : 1) * (26 + (i % 3) * 9); });
      run();
    }, { threshold: .35 });
    io.observe(track);
  }
}
