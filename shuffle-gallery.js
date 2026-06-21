/* shuffle-gallery.js
   Orbital ring for the Our Work section.

   Phase A (hidden):  cards tucked at centre, invisible — the reset state.
   Phase B (expanded): cards bloom outward to their orbit positions.
   Phase C (fan):     ~1.85 s after the bloom settles, cards morph into a
                      centred fan-deck spread and auto-advance left every 3 s.
   Phase D (collapsed): when the ring scrolls past, cards spin inward and
                      dissolve back into the headline.

   Gallery below: each photo tile fades + slides up individually on scroll.
*/
(function () {
  'use strict';

  /* ── Project data ─────────────────────────────────────────────────── */
  const PROJECTS = [
    { img: 'assets/tiered-planter-boxes.jpg',   title: 'Tiered Planter Boxes',     sub: 'Feature garden & lighting',  tag: 'Landscaping', fence: false, num: '01' },
    { img: 'assets/sleeper-retaining-lawn.jpg',  title: 'Sleeper Retaining & Lawn', sub: 'Front-yard transformation',  tag: 'Landscaping', fence: false, num: '02' },
    { img: 'assets/colorbond-garden-beds.jpg',   title: 'Colorbond & Garden Beds',  sub: 'Privacy fence & planting',   tag: 'Fencing',     fence: true,  num: '03' },
    { img: 'assets/turf-driveway-frontyard.jpg', title: 'Turf & Driveway',          sub: 'Lawn & concrete edging',     tag: 'Landscaping', fence: false, num: '04' },
    { img: 'assets/aluminium-slat-gates.jpg',    title: 'Aluminium Slat Gates',     sub: 'Custom driveway entrance',   tag: 'Fencing',     fence: true,  num: '05' },
    { img: 'assets/timber-paling-fence.jpg',     title: 'Timber Paling Fence',      sub: 'Boundary & side access',     tag: 'Fencing',     fence: true,  num: '06' },
  ];

  /* ── Constants ────────────────────────────────────────────────────── */
  const N              = PROJECTS.length;
  const OFFSET_DEG     = 105;   // first card near top-left of the ring
  const BASE_OFFSET    = 12;    // alternating tilt for the expanded ring
  const HIDDEN_FRAC    = 0.15;  // hidden cards rest at 15 % of orbit radius

  /* Fan deck timings */
  const FAN_MORPH_DELAY = 1850; // ms after orbit bloom before fan morph begins
  const FAN_INTERVAL    = 3000; // ms each card holds the centre position
  const FAN_MORPH_DUR   = 0.75; // GSAP duration (s) for the orbit → fan transition
  const FAN_ADVANCE_DUR = 0.55; // GSAP duration (s) for each auto-advance step

  /*  Fan slot layout — 6 relative slots keyed by (cardIdx − activeIdx + N) % N
      slot 0 = centre (active)  slot 1 = right-1   slot 2 = far-right
      slot 3 = off-screen right slot 4 = far-left   slot 5 = left-1
      x / y are in px from the orbit centre (cards already use margin centering).
      Slot geometry is rebuilt from card dimensions so it stays responsive.     */
  let FAN_SLOTS = [];

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Mutable state ────────────────────────────────────────────────── */
  let cards         = [];   // .scard elements
  let consts        = [];   // per-card orbit geometry
  let tiles         = [];   // matching .shot tiles in the grid below
  let radius        = 220;  // current orbit radius (updated on resize)
  let phase         = 'hidden'; // 'hidden' | 'expanded' | 'collapsed'
  let fanMode       = false;
  let activeIdx     = 0;    // which card is currently centre
  let carouselTimer = null;
  let morphTimeout  = null;

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  /* ── Content helpers ─────────────────────────────────────────────── */
  function applyContent(card, p) {
    const photo = card.querySelector('.scard__photo');
    const tag   = card.querySelector('.scard__tag');
    const title = card.querySelector('.scard__title');
    const sub   = card.querySelector('.scard__sub');
    const num   = card.querySelector('.scard__num');
    if (photo)  photo.style.backgroundImage = `url('${p.img}')`;
    if (tag)    { tag.textContent = p.tag; tag.className = 'scard__tag' + (p.fence ? ' scard__tag--fence' : ''); }
    if (title)  title.textContent = p.title;
    if (sub)    sub.textContent   = p.sub;
    if (num)    num.textContent   = p.num;
  }

  /* ── Orbit geometry ──────────────────────────────────────────────── */
  function buildOrbitConsts() {
    consts = [];
    for (let i = 0; i < N; i++) {
      const angle       = (((i * (360 / N)) - OFFSET_DEG) * Math.PI) / 180;
      const radiusMult  = rand(0.88, 1.10);
      const natural     = rand(-15, 12);
      const expandRot   = natural + (i % 2 === 0 ? BASE_OFFSET : -BASE_OFFSET);
      const collapseRot = natural * 3.5 + i * 40;
      consts.push({ angle, radiusMult, expandRot, collapseRot });
    }
  }

  function measureOrbit(stage) {
    const w    = stage.clientWidth;
    const h    = stage.clientHeight;
    const cw   = cards[0] ? cards[0].offsetWidth  : 140;
    const ch   = cards[0] ? cards[0].offsetHeight : 200;
    const pad  = 10;
    const fitW = (w / 2 - cw / 2 - pad) / 1.10;
    const fitH = (h / 2 - ch / 2 - pad) / 1.10;
    radius = Math.max(104, Math.min(fitW, fitH, 210));
  }

  function orbitTransform(state, c) {
    if (state === 'expanded') {
      const x = Math.cos(c.angle) * (radius * c.radiusMult);
      const y = Math.sin(c.angle) * (radius * c.radiusMult);
      return { t: `translate3d(${x}px,${y}px,0) scale(1) rotate(${c.expandRot}deg)`, o: '1' };
    }
    if (state === 'collapsed') {
      return { t: `translate3d(0px,0px,0) scale(0) rotate(${c.collapseRot}deg)`, o: '0' };
    }
    /* hidden — tucked near centre, invisible */
    const x = Math.cos(c.angle) * (radius * c.radiusMult * HIDDEN_FRAC);
    const y = Math.sin(c.angle) * (radius * c.radiusMult * HIDDEN_FRAC);
    return { t: `translate3d(${x}px,${y}px,0) scale(0) rotate(-45deg)`, o: '0' };
  }

  /* CSS-transition driven phase changes (orbit phases A / B / D) */
  function setPhase(state, animate) {
    phase = state;
    cards.forEach((card, i) => {
      const c        = consts[i];
      const { t, o } = orbitTransform(state, c);
      let delay = 0;
      if (animate) {
        if (state === 'expanded')  delay = i * 0.08;
        if (state === 'collapsed') delay = i * 0.04;
      }
      card.style.transition      = 'transform 1.3s cubic-bezier(0.25,1,0.5,1),opacity 0.9s cubic-bezier(0.25,1,0.5,1),box-shadow 0.25s ease';
      card.style.transitionDelay = delay + 's';
      card.style.transform       = t;
      card.style.opacity         = o;
      card.style.zIndex          = state === 'expanded' ? String(10 + i) : '1';
    });
  }

  /* ── Fan deck ────────────────────────────────────────────────────── */
  function buildFanSlots() {
    const stage = document.getElementById('orbit');
    const cw  = cards[0] ? cards[0].offsetWidth  : 200;
    const ch  = cards[0] ? cards[0].offsetHeight : 295;
    const stH = stage ? stage.clientHeight : 760;

    /* Push all cards so their bottoms sit ~16 px above the container base.
       Cards rotate around their own bottom-centre (transformOrigin '50% 100%'),
       creating the hand-of-cards fan effect from the reference image.        */
    const yBase = stH / 2 - ch / 2 - 16;

    /* x-offsets give horizontal spread; rotation angle creates the fan tilt.
       Scales decrease toward the edges so depth reads naturally.             */
    FAN_SLOTS = [
      /* slot 0 — centre  */ { x:          0, y: yBase, s: 1.00, r:   0, z: 10, o: 1.00 },
      /* slot 1 — right-1 */ { x:  cw * 0.70, y: yBase, s: 0.83, r:  13, z:  8, o: 0.88 },
      /* slot 2 — far-R   */ { x:  cw * 1.30, y: yBase, s: 0.66, r:  25, z:  6, o: 0.70 },
      /* slot 3 — off-R   */ { x:  cw * 2.00, y: yBase, s: 0.50, r:  37, z:  4, o: 0.00 },
      /* slot 4 — far-L   */ { x: -cw * 1.30, y: yBase, s: 0.66, r: -25, z:  6, o: 0.70 },
      /* slot 5 — left-1  */ { x: -cw * 0.70, y: yBase, s: 0.83, r: -13, z:  8, o: 0.88 },
    ];
  }

  /* Apply GSAP tweens for the current activeIdx */
  function applyFanPositions(duration, staggerPerCard) {
    cards.forEach((card, i) => {
      const rel = (i - activeIdx + N) % N;
      card.style.zIndex = String(FAN_SLOTS[rel].z);
    });
    cards.forEach((card, i) => {
      const rel  = (i - activeIdx + N) % N;
      const slot = FAN_SLOTS[rel];
      gsap.to(card, {
        x: slot.x, y: slot.y, scale: slot.s, rotation: slot.r, opacity: slot.o,
        transformOrigin: '50% 100%',
        duration,
        delay: i * staggerPerCard,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });
  }

  function morphToFan(titleEl) {
    if (fanMode) return;
    fanMode = true;
    buildFanSlots();

    const stage = document.getElementById('orbit');
    if (stage) stage.classList.add('orbit--fan');

    cards.forEach(card => {
      card.style.transition      = 'box-shadow 0.25s ease';
      card.style.transitionDelay = '0s';
    });

    if (titleEl) gsap.to(titleEl, { autoAlpha: 0, duration: 0.35, ease: 'power2.in' });

    applyFanPositions(FAN_MORPH_DUR, 0.07);

    carouselTimer = setInterval(advanceFan, FAN_INTERVAL);
  }

  function advanceFan() {
    activeIdx = (activeIdx + 1) % N;
    applyFanPositions(FAN_ADVANCE_DUR, 0);
  }

  /* Stop the fan carousel and return control to the CSS orbit system */
  function cancelFan(titleEl) {
    clearInterval(carouselTimer); carouselTimer = null;
    clearTimeout(morphTimeout);   morphTimeout  = null;
    if (!fanMode) return;
    fanMode   = false;
    activeIdx = 0;

    const stage = document.getElementById('orbit');
    if (stage) stage.classList.remove('orbit--fan');

    cards.forEach(card => {
      gsap.killTweensOf(card);
      gsap.set(card, { clearProps: 'x,y,scale,rotation,opacity,zIndex,transformOrigin' });
    });

    if (titleEl) {
      gsap.killTweensOf(titleEl);
      gsap.set(titleEl, { clearProps: 'opacity,visibility' });
    }
  }

  function scheduleMorph(titleEl) {
    clearTimeout(morphTimeout);
    morphTimeout = setTimeout(() => morphToFan(titleEl), FAN_MORPH_DELAY);
  }

  /* ── Main init ───────────────────────────────────────────────────── */
  function init() {
    const stage   = document.getElementById('orbit');
    const ring    = document.getElementById('orbitRing');
    const titleEl = stage && stage.querySelector('.orbit__title');
    if (!stage || !ring) return;

    cards = Array.from(ring.querySelectorAll('.scard'));
    tiles = Array.from(document.querySelectorAll('.work__grid .shot'));
    if (cards.length !== N) return;

    cards.forEach((card, i) => applyContent(card, PROJECTS[i]));
    buildOrbitConsts();
    measureOrbit(stage);

    /* Click: orbit mode opens the matching project; fan mode opens centre card */
    cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        if (fanMode) {
          const rel = (i - activeIdx + N) % N;
          if (rel === 0 && tiles[i]) tiles[i].click();
        } else if (phase === 'expanded') {
          if (tiles[i]) tiles[i].click();
        }
      });
    });

    /* Reduced-motion: static fan layout, no animation */
    if (reduce) {
      buildFanSlots();
      applyFanPositions(0, 0);
      fanMode = true;
      initGalleryReveal();
      return;
    }

    setPhase('hidden', false);

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      /* Bloom as the section enters; fan morph follows after the bloom settles */
      ScrollTrigger.create({
        trigger: stage,
        start: 'top 80%',
        onEnter: () => {
          setPhase('expanded', true);
          scheduleMorph(titleEl);
        },
        onEnterBack: () => {
          cancelFan(titleEl);
          setPhase('expanded', true);
          scheduleMorph(titleEl);
        },
        onLeaveBack: () => {
          cancelFan(titleEl);
          setPhase('hidden', true);
        },
      });

      /* Collapse into the headline as the ring exits the top of the viewport */
      ScrollTrigger.create({
        trigger: stage,
        start: 'center 25%',
        onEnter: () => {
          cancelFan(titleEl);
          setPhase('collapsed', true);
        },
        onLeaveBack: () => {
          cancelFan(titleEl);
          setPhase('expanded', true);
          scheduleMorph(titleEl);
        },
      });

      /* Re-place on resize — fan or orbit depending on current mode */
      let rAF;
      window.addEventListener('resize', () => {
        cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          measureOrbit(stage);
          if (fanMode) {
            buildFanSlots();
            applyFanPositions(0.3, 0);
          } else {
            setPhase(phase, false);
          }
        });
      });
    } else {
      /* No ScrollTrigger — drop straight into fan mode */
      buildFanSlots();
      applyFanPositions(0, 0);
      fanMode = true;
    }

    initGalleryReveal();
  }

  /* ── Gallery scroll reveal ───────────────────────────────────────── */
  function initGalleryReveal() {
    if (!window.ScrollTrigger) return;
    const shots = Array.from(document.querySelectorAll('.work__grid .shot'));
    if (!shots.length) return;

    shots.forEach(s => { s.style.clipPath = 'none'; s.style.webkitClipPath = 'none'; });
    gsap.set(shots, { opacity: 0, y: 64, scale: 0.94 });

    ScrollTrigger.batch(shots, {
      onEnter(batch) {
        const totalDur = (batch.length - 1) * 0.14 + 0.90 + 0.1;
        gsap.to(batch, { opacity: 1, y: 0, scale: 1, stagger: 0.14, duration: 0.90, ease: 'power3.out' });
        gsap.delayedCall(totalDur, () => gsap.set(batch, { clearProps: 'transform,opacity,scale,y' }));
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
