/* =========================================================
   BENTO CARDS — scroll-scrubbed zoom-in, one card at a time
   GSAP ScrollTrigger owns this section when available; the
   IntersectionObserver path in main.js remains the fallback.
   ========================================================= */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return; // main.js fallback takes over
  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector(".bento");
  const grid = section && section.querySelector(".bento__grid");
  const cards = grid ? gsap.utils.toArray(grid.querySelectorAll(".card")) : [];
  if (!cards.length) return;

  section.classList.add("bento--gsap"); // neutralizes the CSS .stagger reveal
  gsap.set(grid, { perspective: 1000 }); // depth for the rotationX lift

  const mm = gsap.matchMedia();

  /* Desktop / tablet: one timeline scrubbed across the section.
     Each card zooms from 50% scale with a 3D tilt-up off its bottom
     edge, then its icon pops and index number slides in — strictly
     one by one, reversing when the user scrolls back up. */
  mm.add("(min-width: 561px) and (prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: {
        trigger: section,
        start: "top 82%",
        end: "bottom 98%",
        scrub: 1,
      },
    });
    cards.forEach((card, i) => {
      const at = i * 0.45;
      tl.from(card, {
        autoAlpha: 0,
        scale: 0.5,
        y: 120,
        rotationX: 28,
        transformOrigin: "50% 100%",
        duration: 1,
      }, at)
        .from(card.querySelector(".card__icon"), {
          scale: 0, rotation: -45, duration: 0.6, ease: "back.out(2.5)",
        }, at + 0.3)
        .from(card.querySelector(".card__index"), {
          xPercent: 80, autoAlpha: 0, duration: 0.5,
        }, at + 0.35);
    });
  });

  /* Mobile (single column): the section is tall, so a grouped timeline
     would finish cards long before they're on screen. Give each card
     its own scrubbed trigger instead. */
  mm.add("(max-width: 560px) and (prefers-reduced-motion: no-preference)", () => {
    cards.forEach((card) => {
      gsap.from(card, {
        autoAlpha: 0,
        scale: 0.6,
        y: 90,
        transformOrigin: "50% 100%",
        ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 95%", end: "top 55%", scrub: 0.6 },
      });
    });
  });

  /* prefers-reduced-motion: no tweens — the global reduced-motion CSS
     already forces .stagger content fully visible. */
})();
