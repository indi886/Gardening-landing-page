/* =========================================================
   FOCAL POINT CTA — the 05-E "LET'S BEGIN" card becomes the
   closing moment. As it nears viewport centre the card lifts
   and scales to full and its glow blooms; everything reverses
   as the card scrolls away. No page-dim — the background is
   left untouched.

   GSAP ScrollTrigger owns this. With no GSAP, nothing is
   injected and the card simply stays visible (CSS shows it);
   the pointer-follow glow in main.js keeps working regardless.
   ========================================================= */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return; // graceful no-op fallback
  gsap.registerPlugin(ScrollTrigger);

  const card = document.querySelector("#ctaCard");
  if (!card) return;

  // Dedicated bloom layer owned exclusively by this scroll effect. It is its
  // own element — NOT #ctaGlow — so GSAP's opacity tween never fights the
  // pointer-follow glow's CSS transition or its :hover rule. Lives behind the
  // card content (z-index 1) and is clipped by the card's overflow:hidden.
  const bloom = document.createElement("div");
  bloom.className = "cta__bloom";
  bloom.setAttribute("aria-hidden", "true");
  card.insertBefore(bloom, card.firstChild);

  const mm = gsap.matchMedia();

  /* Desktop / tablet: one timeline scrubbed across the card's pass through the
     viewport — small+low+faint as it enters, peaking lifted+full+bloomed near
     centre, then receding as it exits up. The two phases (~0.55 / ~0.45) split
     the scrubbed timeline. */
  mm.add("(min-width: 561px) and (prefers-reduced-motion: no-preference)", () => {
    const BLOOM_PEAK = 0.75;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: card,
        start: "top 85%",
        end: "bottom top",
        scrub: 1,
      },
    });
    // Phase 1 — rise to focal peak.
    tl.fromTo(card,
      { scale: 0.92, y: 70, autoAlpha: 0.5 },
      { scale: 1, y: -14, autoAlpha: 1, ease: "power2.out", duration: 0.55 }, 0)
      .fromTo(bloom, { opacity: 0, scale: 0.8 }, { opacity: BLOOM_PEAK, scale: 1, ease: "power2.out", duration: 0.55 }, 0);
    // Phase 2 — recede as the card exits upward.
    tl.to(card, { y: -46, scale: 0.985, ease: "power1.in", duration: 0.45 }, 0.55)
      .to(bloom, { opacity: 0, ease: "none", duration: 0.45 }, 0.55);
  });

  /* Mobile (single column): gentler — scale + bloom, no big lift, since a tall
     single-column layout makes large vertical motion feel jumpy. */
  mm.add("(max-width: 560px) and (prefers-reduced-motion: no-preference)", () => {
    const BLOOM_PEAK = 0.6;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: card,
        start: "top 92%",
        end: "bottom top",
        scrub: 1,
      },
    });
    tl.fromTo(card,
      { scale: 0.94, y: 40, autoAlpha: 0.6 },
      { scale: 1, y: 0, autoAlpha: 1, ease: "power2.out", duration: 0.55 }, 0)
      .fromTo(bloom, { opacity: 0 }, { opacity: BLOOM_PEAK, ease: "none", duration: 0.55 }, 0);
    tl.to(bloom, { opacity: 0, ease: "none", duration: 0.45 }, 0.55);
  });

  /* prefers-reduced-motion: no tweens — the card is already fully visible from
     CSS, so we leave it untouched. */
})();
