import { useEffect, useRef } from "react";

/**
 * Scoped scroll choreography for the Grovio landing.
 * - `.rv` elements receive `.in` once they enter the viewport (one-shot).
 * - `[data-pin="N"]` sections receive `data-scene` (0..N-1) and `--p` from
 *   scroll progress, on desktop only. On mobile / reduced motion the markup's
 *   resting scene (`data-rest`) is restored and nothing is pinned.
 */
export function useGrovioScroll() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    el.querySelectorAll(".rv").forEach((n) => io.observe(n));
    const pins = Array.from(el.querySelectorAll<HTMLElement>("[data-pin]"));
    let frame = 0;
    const draw = () => {
      frame = 0;
      const h = window.innerHeight;
      const active = window.innerWidth >= 900 && !reduced.matches;
      for (const pin of pins) {
        if (!active) {
          pin.dataset["scene"] = pin.dataset["rest"] ?? "0";
          pin.style.removeProperty("--p");
          continue;
        }
        const r = pin.getBoundingClientRect();
        const n = Number(pin.dataset["pin"]) || 1;
        const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - h)));
        pin.style.setProperty("--p", p.toFixed(4));
        pin.dataset["scene"] = String(Math.min(n - 1, Math.floor(p * n)));
        if (r.top < h * 0.5) pin.dataset["live"] = "1";
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
    };
  }, []);
  return root;
}
