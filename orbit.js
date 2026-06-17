/* =========================================================
   ORBIT — "Our Work" cards orbiting the headline
   Phase B (Expand): cards bloom out from the centre to their
   polar positions as the section scrolls into view.
   Phase C (Collapse): cards spiral back into the headline and
   dissolve as the section scrolls past.
   Desktop + motion only; mobile / reduced-motion / no-JS fall
   back to the static grid (handled entirely in CSS).
   ========================================================= */
(function () {
  "use strict";
  const section = document.getElementById("workOrbit");
  if (!section) return;
  const cards = Array.from(section.querySelectorAll(".shot"));
  if (!cards.length) return;

  const N = cards.length;
  const OFFSET = 105; // degrees — first card starts near top-left
  // Deterministic per-card variety (stable across reloads/resizes) — the
  // "organic moodboard" feel without runtime randomness causing reflow jumps.
  const RAD_MULT = [1.05, 0.9, 1.08, 0.88, 1.1, 0.94];
  const NAT_ROT  = [-8, 11, -14, 6, -4, 12];

  function computeVars() {
    const radius = Math.max(195, Math.min(255, window.innerWidth * 0.2));
    cards.forEach((card, i) => {
      const angle = (((i * (360 / N)) - OFFSET) * Math.PI) / 180;
      const rm = RAD_MULT[i % RAD_MULT.length];
      const ex = Math.cos(angle) * radius * rm;
      const ey = Math.sin(angle) * radius * rm;
      const rot = NAT_ROT[i % NAT_ROT.length] + (i % 2 ? 6 : -6); // alternating offset
      card.style.setProperty("--ex", ex.toFixed(1) + "px");
      card.style.setProperty("--ey", ey.toFixed(1) + "px");
      card.style.setProperty("--rx", (ex * 0.15).toFixed(1) + "px"); // reset = 15% of orbit
      card.style.setProperty("--ry", (ey * 0.15).toFixed(1) + "px");
      card.style.setProperty("--rot", rot + "deg");
      card.style.setProperty("--rotc", (rot * 3.5 + i * 8) + "deg"); // dramatic collapse spin
      card.style.setProperty("--i", i);                              // expand stagger
      card.style.setProperty("--ic", N - 1 - i);                     // collapse stagger
    });
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (reduce || !gsap || !ST) return; // CSS fallback (static grid) takes over
  gsap.registerPlugin(ST);

  // Only orbit on wider viewports; gsap.matchMedia auto-reverts the setup
  // (classes + ScrollTrigger) when crossing back below the breakpoint.
  gsap.matchMedia().add("(min-width: 760px)", () => {
    computeVars();
    section.classList.add("orbit--ready");

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { computeVars(); ST.refresh(); });
    };
    window.addEventListener("resize", onResize);

    const setPhase = (phase) => {
      section.classList.toggle("is-expanded", phase === "expand");
      section.classList.toggle("is-collapsed", phase === "collapse");
    };

    const trigger = ST.create({
      trigger: section,
      start: "top 72%",
      end: "bottom 30%",
      onEnter: () => setPhase("expand"),        // scroll down into view → bloom out
      onLeave: () => setPhase("collapse"),      // scroll past → spiral into headline
      onEnterBack: () => setPhase("expand"),    // scroll back up into view → bloom again
      onLeaveBack: () => setPhase("reset"),     // above the section → hidden at centre
    });

    return () => { // cleanup when the media query stops matching
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      trigger.kill();
      section.classList.remove("orbit--ready", "is-expanded", "is-collapsed");
    };
  });
})();
