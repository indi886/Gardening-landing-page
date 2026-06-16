/* shuffle-gallery.js
   Playing-card fan spread for the Our Work section.

   Layout: all 6 cards share one bottom-centre anchor (left:55% of deck).
   GSAP rotates each around 'center bottom', fanning LEFT like a hand of cards.
   Slot 0 = back-left (most rotated), slot 5 = front-right (nearly upright).

   Interactions:
   - Cards stagger-pop onto screen one by one as the section scrolls into view.
   - Click any card → it flies to the front; the previous front rotates to back.
   - Hover non-front cards → subtle upward lift.

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

  /* Fan slot definitions.
     Rotation is around 'center bottom' of the card (transformOrigin).
     Negative = leans left, positive = leans right. */
  const SLOTS = [
    { rotation: -38, zIndex: 1, scale: 0.89 }, // slot 0 — back-left
    { rotation: -26, zIndex: 2, scale: 0.92 },
    { rotation: -16, zIndex: 3, scale: 0.94 },
    { rotation:  -8, zIndex: 4, scale: 0.96 },
    { rotation:  -2, zIndex: 5, scale: 0.98 },
    { rotation:   5, zIndex: 6, scale: 1.00 }, // slot 5 — front-right
  ];

  /* slotOrder[slot] = cardIdx  (which card occupies each fan position) */
  let slotOrder = [0, 1, 2, 3, 4, 5];
  let cards = [];
  let revealed = false;

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

  /* ── Fan layout ──────────────────────────────────────────────────── */
  function slotOf(cardIdx) {
    return slotOrder.indexOf(cardIdx);
  }

  function applyLayout(animate) {
    const dur = 0.52;
    cards.forEach((card, cardIdx) => {
      const s = SLOTS[slotOf(cardIdx)];
      const vars = { rotation: s.rotation, zIndex: s.zIndex, scale: s.scale };
      if (animate) {
        gsap.to(card, { ...vars, duration: dur, ease: 'power3.out', overwrite: 'auto' });
      } else {
        gsap.set(card, vars);
      }
    });
  }

  /* ── Click cycling ───────────────────────────────────────────────── */
  function bringToFront(cardIdx) {
    const pos = slotOf(cardIdx);

    if (pos === 5) {
      /* Clicking the front card: rotate it to the back */
      slotOrder.pop();
      slotOrder.unshift(cardIdx);
    } else {
      /* Move front card to back; clicked card advances to front */
      const front = slotOrder[5];
      slotOrder.splice(pos, 1);                         // remove clicked
      slotOrder.splice(slotOrder.indexOf(front), 1);    // remove old front
      slotOrder.unshift(front);                         // old front → slot 0
      slotOrder.push(cardIdx);                          // clicked → slot 5
    }

    applyLayout(true);
  }

  /* ── Main init ───────────────────────────────────────────────────── */
  function init() {
    const deck = document.getElementById('shuffleDeck');
    if (!deck || typeof gsap === 'undefined') return;

    cards = Array.from(deck.querySelectorAll('.scard'));
    if (cards.length !== 6) return;

    /* Populate content; set initial positions (hidden below, already rotated) */
    cards.forEach((card, i) => {
      applyContent(card, PROJECTS[i]);
      const s = SLOTS[i]; // card i starts at slot i
      gsap.set(card, {
        xPercent: -50,
        transformOrigin: 'center bottom',
        rotation: s.rotation,
        zIndex: s.zIndex,
        scale: s.scale,
        y: 140,       // cards start below — scroll trigger brings them up
        opacity: 0,
      });
    });

    /* Click → cycle to front */
    cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        if (!revealed) return;
        bringToFront(i);
      });

      /* Hover lift for non-front cards */
      card.addEventListener('mouseenter', () => {
        if (!revealed || slotOf(i) === 5) return;
        gsap.to(card, { y: -22, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
      });
      card.addEventListener('mouseleave', () => {
        if (slotOf(i) === 5) return;
        gsap.to(card, { y: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
      });
    });

    /* ── Scroll reveal: cards pop in back-to-front ───────────────── */
    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      ScrollTrigger.create({
        trigger: deck.closest('.shuffle-wrap') || deck,
        start: 'top 80%',
        once: true,
        onEnter() {
          revealed = true;
          /* Stagger back-to-front: slot 0 first → slot 5 last */
          cards.forEach((card, i) => {
            gsap.to(card, {
              opacity: 1,
              y: 0,
              duration: 0.75,
              delay: i * 0.12,        // 0, 120ms, 240ms … 600ms
              ease: 'back.out(1.8)',  // springy pop
              overwrite: 'auto',
            });
          });
        },
      });
    } else {
      /* No ScrollTrigger — show all immediately */
      revealed = true;
      cards.forEach(c => gsap.set(c, { opacity: 1, y: 0 }));
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

    /* Batch: shots that enter the viewport together reveal with a stagger.
       Because the grid has multiple rows, lower rows enter later, giving
       a natural one-by-one-as-you-scroll feel. */
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
        /* After every staggered item has finished, clear GSAP inline
           transforms so CSS hover (translateY) can take effect again */
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
