/* shuffle-gallery.js
   Orbital ring for the Our Work section.

   Six project cards are arranged in a circle around the central headline
   using polar coordinates. The ring plays two scroll-driven phases:

   Phase B — Entrance / Expand: as the section scrolls into view the cards
     bloom outward from the centre to their computed orbit positions, one by
     one, scaling 0 → 1 and settling at a natural, slightly-offset rotation.

   Phase C — Centre Collapse: as the section scrolls past, every card flies
     back to the absolute centre (0,0), scaling 1 → 0 while spinning hard, so
     they twist inward and dissolve into the headline.

   Phase A (hidden) is the reset state the cards rest in before entering and
   after scrolling back above the section.

   Gallery below: each photo tile fades + slides up individually on scroll.
*/
(function () {
  'use strict';

  const PROJECTS = [
    { img: 'assets/tiered-planter-boxes.jpg',   title: 'Tiered Planter Boxes',     sub: 'Feature garden & lighting',  tag: 'Landscaping', fence: false, num: '01' },
    { img: 'assets/sleeper-retaining-lawn.jpg',  title: 'Sleeper Retaining & Lawn', sub: 'Front-yard transformation',  tag: 'Landscaping', fence: false, num: '02' },
    { img: 'assets/colorbond-garden-beds.jpg',   title: 'Colorbond & Garden Beds',  sub: 'Privacy fence & planting',   tag: 'Fencing',     fence: true,  num: '03' },
    { img: 'assets/turf-driveway-frontyard.jpg', title: 'Turf & Driveway',          sub: 'Lawn & concrete edging',     tag: 'Landscaping', fence: false, num: '04' },
    { img: 'assets/aluminium-slat-gates.jpg',    title: 'Aluminium Slat Gates',     sub: 'Custom driveway entrance',   tag: 'Fencing',     fence: true,  num: '05' },
    { img: 'assets/timber-paling-fence.jpg',     title: 'Timber Paling Fence',      sub: 'Boundary & side access',     tag: 'Fencing',     fence: true,  num: '06' },
  ];

  const N            = PROJECTS.length;
  const OFFSET_DEG   = 105;   // first card starts near the top-left
  const BASE_OFFSET  = 12;    // expanded rotation offset, alternating per card
  const HIDDEN_FRAC  = 0.15;  // cards rest at 15% of the orbit radius when hidden

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cards   = [];   // the .scard elements
  let consts  = [];   // per-card fixed geometry { angle, radiusMult, expandRot, collapseRot }
  let tiles   = [];   // matching .shot tiles below (for click-through to lightbox)
  let radius  = 220;  // current orbit radius (recomputed on resize)
  let phase   = 'hidden';

  const rand = (min, max) => min + Math.random() * (max - min);

  /* ── Content helpers ─────────────────────────────────────────────── */
  function applyContent(card, p) {
    const photo = card.querySelector('.scard__photo');
    const tag   = card.querySelector('.scard__tag');
    const title = card.querySelector('.scard__title');
    const sub   = card.querySelector('.scard__sub');
    const num   = card.querySelector('.scard__num');
    if (photo) photo.style.backgroundImage = `url('${p.img}')`;
    if (tag)   { tag.textContent = p.tag; tag.className = 'scard__tag' + (p.fence ? ' scard__tag--fence' : ''); }
    if (title) title.textContent = p.title;
    if (sub)   sub.textContent   = p.sub;
    if (num)   num.textContent   = p.num;
  }

  /* ── Geometry ────────────────────────────────────────────────────── */
  function buildConsts() {
    consts = [];
    for (let i = 0; i < N; i++) {
      const angle       = (((i * (360 / N)) - OFFSET_DEG) * Math.PI) / 180;
      const radiusMult  = rand(0.88, 1.10);                 // organic, non-rigid ring
      const natural     = rand(-15, 12);                    // custom natural tilt
      const expandRot   = natural + (i % 2 === 0 ? BASE_OFFSET : -BASE_OFFSET);
      const collapseRot = natural * 3.5 + i * 40;           // progressive inward spin
      consts.push({ angle, radiusMult, expandRot, collapseRot });
    }
  }

  /* Orbit radius scales with the stage so the whole ring fits any viewport.
     A card can swing out to radius * 1.10 (the max radiusMultiplier), so we
     leave room for that plus the card's half-size on each axis. */
  function measure(stage) {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const cardW = cards[0] ? cards[0].offsetWidth : 140;
    const cardH = cards[0] ? cards[0].offsetHeight : 200;
    const pad = 10;
    const fitW = (w / 2 - cardW / 2 - pad) / 1.10;
    const fitH = (h / 2 - cardH / 2 - pad) / 1.10;
    radius = Math.max(104, Math.min(fitW, fitH, 210));
  }

  function transformFor(state, c) {
    if (state === 'expanded') {
      const x = Math.cos(c.angle) * (radius * c.radiusMult);
      const y = Math.sin(c.angle) * (radius * c.radiusMult);
      return { t: `translate3d(${x}px, ${y}px, 0) scale(1) rotate(${c.expandRot}deg)`, o: '1' };
    }
    if (state === 'collapsed') {
      return { t: `translate3d(0px, 0px, 0) scale(0) rotate(${c.collapseRot}deg)`, o: '0' };
    }
    // hidden — tucked close to the centre, ready to bloom
    const x = Math.cos(c.angle) * (radius * c.radiusMult * HIDDEN_FRAC);
    const y = Math.sin(c.angle) * (radius * c.radiusMult * HIDDEN_FRAC);
    return { t: `translate3d(${x}px, ${y}px, 0) scale(0) rotate(-45deg)`, o: '0' };
  }

  function setPhase(state, animate) {
    phase = state;
    cards.forEach((card, i) => {
      const c = consts[i];
      const { t, o } = transformFor(state, c);
      // Stagger the motion: a one-by-one bloom outward, a quicker twist inward.
      let delay = 0;
      if (animate) {
        if (state === 'expanded')  delay = i * 0.08;
        else if (state === 'collapsed') delay = i * 0.04;
      }
      card.style.transitionDelay = delay + 's';
      card.style.transform = t;
      card.style.opacity = o;
      card.style.zIndex = state === 'expanded' ? String(10 + i) : '1';
    });
  }

  /* ── Main init ───────────────────────────────────────────────────── */
  function init() {
    const stage = document.getElementById('orbit');
    const ring  = document.getElementById('orbitRing');
    if (!stage || !ring) return;

    cards = Array.from(ring.querySelectorAll('.scard'));
    tiles = Array.from(document.querySelectorAll('.work__grid .shot'));
    if (cards.length !== N) return;

    cards.forEach((card, i) => applyContent(card, PROJECTS[i]));
    buildConsts();
    measure(stage);

    /* Click an orbit card → open the matching project in the shared lightbox.
       The grid below carries the accessible, keyboard-navigable version, so
       these decorative cards just forward the click. */
    cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        if (phase !== 'expanded') return;
        if (tiles[i]) tiles[i].click();
      });
    });

    /* Reduced motion: show the ring laid out, no bloom or collapse. */
    if (reduce) {
      setPhase('expanded', false);
      initGalleryReveal();
      return;
    }

    /* Paint the hidden state. The base .scard CSS rule already renders cards
       at scale(0)/opacity:0, so the tiny initial move to the polar hidden
       coordinates happens while they're invisible — no flash, no suppression
       needed. The CSS transition then drives every phase change from here. */
    setPhase('hidden', false);

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      /* Expand as the section enters; reset to hidden if scrolled back above. */
      ScrollTrigger.create({
        trigger: stage,
        start: 'top 80%',
        onEnter:     () => setPhase('expanded', true),
        onEnterBack: () => setPhase('expanded', true),
        onLeaveBack: () => setPhase('hidden', true),
      });

      /* Collapse into the headline once the ring has been read and is exiting
         the top of the viewport (its centre passes ~25% from the top). */
      ScrollTrigger.create({
        trigger: stage,
        start: 'center 25%',
        onEnter:     () => setPhase('collapsed', true),
        onLeaveBack: () => setPhase('expanded', true),
      });

      let rAF;
      window.addEventListener('resize', () => {
        cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          measure(stage);
          setPhase(phase, false); // re-place in the current phase at the new radius
        });
      });
    } else {
      setPhase('expanded', false);
    }

    initGalleryReveal();
  }

  /* ── Gallery scroll reveal ───────────────────────────────────────── */
  function initGalleryReveal() {
    if (!window.ScrollTrigger) return;

    const shots = Array.from(document.querySelectorAll('.work__grid .shot'));
    if (!shots.length) return;

    /* Disable the CSS clip-path wipe — GSAP owns the reveal from here */
    shots.forEach(s => {
      s.style.clipPath = 'none';
      s.style.webkitClipPath = 'none';
    });
    gsap.set(shots, { opacity: 0, y: 64, scale: 0.94 });

    /* Batch: shots that enter the viewport together reveal with a stagger. */
    ScrollTrigger.batch(shots, {
      onEnter(batch) {
        const totalDur = (batch.length - 1) * 0.14 + 0.90 + 0.1;
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.14,
          duration: 0.90,
          ease: 'power3.out',
        });
        gsap.delayedCall(totalDur, () => {
          gsap.set(batch, { clearProps: 'transform,opacity,scale,y' });
        });
      },
      start: 'top 90%',
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
