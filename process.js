/* =========================================================
   HOW WE WORK — cinematic horizontal pan
   A pinned section whose 4 photo cards pan sideways as you
   scroll down. Built on GSAP ScrollTrigger:
     • main pin + horizontal scrub of the track
     • per-card image parallax via containerAnimation
     • per-card reveal (.is-seen) + active emphasis (.is-active)
     • HUD progress rail + 01–04 counter
   Falls back to a calm vertical stack on touch / reduced-motion.
   ========================================================= */
(function () {
  "use strict";

  const proc = document.querySelector("#proc");
  if (!proc) return;

  const track = document.querySelector("#procTrack");
  const cards = Array.from(proc.querySelectorAll(".proc__card"));
  const fill = document.querySelector("#procFill");
  const counter = document.querySelector("#procCounter");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;

  const revealAll = () =>
    cards.forEach((c) => c.classList.add("is-seen", "is-active"));

  // No GSAP or user prefers reduced motion → just show everything calmly.
  if (!gsap || !ST || reduce || !cards.length) {
    revealAll();
    return;
  }
  gsap.registerPlugin(ST);

  const setHud = (p) => {
    if (fill) fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
    if (counter) {
      const idx = Math.min(cards.length - 1, Math.round(p * (cards.length - 1)));
      const v = "0" + (idx + 1);
      if (counter.textContent !== v) counter.textContent = v;
    }
  };

  // ---- Desktop: pinned horizontal reel -------------------------------------
  const buildHorizontal = () => {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    // the master tween the pin scrubs, and that every card parallax rides on
    const pan = gsap.to(track, { x: () => -distance(), ease: "none" });

    const master = ST.create({
      trigger: proc,
      start: "top top",
      end: () => "+=" + distance(),
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: pan,
      onUpdate: (self) => setHud(self.progress),
    });

    const subs = [];
    cards.forEach((card) => {
      const img = card.querySelector(".proc__img");
      if (img) {
        const drift = gsap.fromTo(
          img,
          { xPercent: -9 },
          {
            xPercent: 9,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: pan,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          }
        );
        subs.push(drift.scrollTrigger);
      }

      // reveal the content the first time the card swings into view
      subs.push(
        ST.create({
          trigger: card,
          containerAnimation: pan,
          start: "left 82%",
          end: "right 18%",
          onEnter: () => card.classList.add("is-seen"),
          onEnterBack: () => card.classList.add("is-seen"),
        })
      );

      // warm the card to full colour while it owns the centre of the stage
      subs.push(
        ST.create({
          trigger: card,
          containerAnimation: pan,
          start: "left center",
          end: "right center",
          onToggle: (self) => card.classList.toggle("is-active", self.isActive),
        })
      );
    });

    // first card is present from the off
    cards[0].classList.add("is-seen", "is-active");
    setHud(0);

    return () => {
      subs.forEach((s) => s && s.kill());
      master.kill();
      pan.kill();
      gsap.set(track, { clearProps: "x" });
      cards.forEach((c) => c.classList.remove("is-active"));
    };
  };

  // ---- Touch / narrow: calm vertical reveal --------------------------------
  const buildVertical = () => {
    const subs = cards.map((card) =>
      ST.create({
        trigger: card,
        start: "top 82%",
        once: true,
        onEnter: () => card.classList.add("is-seen", "is-active"),
      })
    );
    return () => subs.forEach((s) => s.kill());
  };

  if (typeof gsap.matchMedia === "function") {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 821px)", buildHorizontal);
    mm.add("(max-width: 820px)", buildVertical);
  } else {
    // very old GSAP — pick once, no responsive switching
    if (window.matchMedia("(min-width: 821px)").matches) buildHorizontal();
    else buildVertical();
  }
})();
