/* =========================================================
   VERDANT — Interactions
   Scroll reveals · parallax · stagger · sticky storytelling
   · animated stats · magnetic / interactive CTA · floaters
   ========================================================= */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Hero entrance ---------- */
  window.addEventListener("DOMContentLoaded", () => {
    const heroReveals = $$(".hero .reveal");
    heroReveals.forEach((el, i) => {
      setTimeout(() => el.classList.add("is-in"), 180 + i * 120);
    });
  });

  /* ---------- Hero background video ---------- */
  const heroVideo = $("#heroVideo");
  if (heroVideo) {
    // Fade in only once there are real frames to show
    const showVideo = () => heroVideo.classList.add("is-ready");
    if (heroVideo.readyState >= 2) showVideo();
    else heroVideo.addEventListener("loadeddata", showVideo, { once: true });
    // Some browsers block autoplay until a gesture — nudge it, ignore failures
    const tryPlay = () => { const p = heroVideo.play(); if (p) p.catch(() => {}); };
    if (reduce) { heroVideo.removeAttribute("autoplay"); heroVideo.pause(); }
    else tryPlay();
  }

  /* ---------- Nav scrolled state + scroll progress ---------- */
  const nav = $("#nav");
  const progress = $("#scrollProgress");
  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("is-scrolled", y > 40);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Generic scroll reveal (IntersectionObserver) ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );
  const hero = $(".hero");
  $$(".reveal-section, .reveal, .wipe, .slide-l, .slide-r, .reveal-img").forEach((el) => {
    if (el.classList.contains("reveal") && hero && hero.contains(el)) return; // hero handled separately
    revealObserver.observe(el);
  });

  /* ---------- Staggered cards / stats ---------- */
  const staggerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const group = e.target;
        const items = $$(".stagger", group);
        items.forEach((item, i) => {
          setTimeout(() => item.classList.add("is-in"), i * 140);
        });
        staggerObserver.unobserve(group);
      });
    },
    { threshold: 0.2 }
  );
  $$(".bento__grid, .stats__grid").forEach((g) => staggerObserver.observe(g));

  /* ---------- Intro: word-by-word reveal tied to scroll ---------- */
  const words = $$(".intro__statement .word");
  if (words.length) {
    const intro = $(".intro__statement");
    const onIntro = () => {
      const rect = intro.getBoundingClientRect();
      const start = window.innerHeight * 0.85;
      const end = window.innerHeight * 0.25;
      const p = clamp((start - rect.top) / (start - end), 0, 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < lit));
    };
    window.addEventListener("scroll", onIntro, { passive: true });
    onIntro();
  }

  /* ---------- Layered parallax ---------- */
  const parallaxLayers = $$(".parallax__layer");
  const parallaxSection = $("#parallax");
  if (parallaxLayers.length && parallaxSection && !reduce) {
    const onParallax = () => {
      const rect = parallaxSection.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      parallaxLayers.forEach((layer) => {
        const speed = parseFloat(layer.dataset.speed || "0.3");
        layer.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
      });
    };
    window.addEventListener("scroll", onParallax, { passive: true });
    onParallax();
  }

  /* ---------- Sticky storytelling ---------- */
  const steps = $$(".story__step");
  const stages = $$(".story__stage");
  if (steps.length && stages.length) {
    const stepObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const idx = +e.target.dataset.step;
          steps.forEach((s) => s.classList.toggle("is-active", s === e.target));
          stages.forEach((st) => st.classList.toggle("is-active", +st.dataset.stage === idx));
        });
      },
      { threshold: 0.55 }
    );
    steps.forEach((s) => stepObserver.observe(s));
    // default first stage visible
    stages[0].classList.add("is-active");
    steps[0].classList.add("is-active");
  }

  /* ---------- Animated statistics ---------- */
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  function runCount(el) {
    if (el.dataset.counted) return; // guard against double runs
    el.dataset.counted = "1";
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduce) { el.textContent = target.toLocaleString() + suffix; return; }
    const dur = 1700;
    const start = performance.now();
    el.classList.add("is-counting");
    function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      const val = Math.round(easeOut(p) * target);
      el.textContent = val.toLocaleString() + suffix;
      // gentle scale "pop" that settles as the count finishes
      el.style.transform = "scale(" + (1 + 0.12 * (1 - p)) + ")";
      if (p < 1) requestAnimationFrame(tick);
      else {
        el.textContent = target.toLocaleString() + suffix;
        el.style.transform = "scale(1)";
        el.classList.remove("is-counting");
      }
    }
    requestAnimationFrame(tick);
  }
  // Observe the whole grid (reliable trigger) and kick off each counter once
  // the stat has had time to fade/stagger in — so the count-up is actually
  // visible instead of finishing behind a still-transparent block.
  const statsGrid = $(".stats__grid");
  if (statsGrid) {
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          $$(".stat__num", e.target).forEach((n, i) => {
            setTimeout(() => runCount(n), 220 + i * 140); // match stagger reveal
          });
          statObserver.unobserve(e.target);
        });
      },
      { threshold: 0.25 }
    );
    statObserver.observe(statsGrid);
  }

  /* ---------- Card pointer glow + subtle tilt ---------- */
  $$(".card[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", mx + "%");
      card.style.setProperty("--my", my + "%");
      if (!reduce) {
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px) scale(1.04)`;
      }
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });

  /* ---------- Magnetic buttons ---------- */
  if (!reduce) {
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- Interactive CTA glow follows pointer ---------- */
  const ctaCard = $("#ctaCard");
  if (ctaCard) {
    ctaCard.addEventListener("pointermove", (e) => {
      const r = ctaCard.getBoundingClientRect();
      ctaCard.style.setProperty("--gx", e.clientX - r.left + "px");
      ctaCard.style.setProperty("--gy", e.clientY - r.top + "px");
    });
  }

  /* ---------- CTA form ---------- */
  const form = $("#ctaForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const success = $("#ctaSuccess");
      const btn = $(".cta__submit", form);
      if (btn) { btn.querySelector("span").textContent = "Planted ✦"; }
      if (success) success.hidden = false;
      form.querySelectorAll("input").forEach((i) => (i.value = ""));
    });
  }

  /* ---------- Before / After slider ---------- */
  const ba = $("#ba");
  if (ba) {
    const range = $(".ba__range", ba);
    const set = (v) => ba.style.setProperty("--pos", v + "%");
    const posFromEvent = (e) => {
      const r = ba.getBoundingClientRect();
      return clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
    };
    let dragging = false;
    const move = (e) => { const p = posFromEvent(e); set(p); if (range) range.value = p; };
    if (range) {
      range.addEventListener("pointerdown", (e) => {
        dragging = true;
        try { range.setPointerCapture(e.pointerId); } catch (_) {}
        move(e);
      });
      range.addEventListener("pointermove", (e) => { if (dragging) move(e); });
      range.addEventListener("pointerup", () => { dragging = false; });
      range.addEventListener("pointercancel", () => { dragging = false; });
      range.addEventListener("input", () => set(range.value)); // keyboard arrows
    }
  }

  /* ---------- Floating spores / drifting leaves ---------- */
  const sporeRoot = $("#spores");
  if (sporeRoot && !reduce) {
    const glyphs = ["✦", "❀", "✿", "·", "✢"];
    const COUNT = window.innerWidth < 720 ? 10 : 20;
    for (let i = 0; i < COUNT; i++) {
      const s = document.createElement("span");
      s.className = "spore";
      s.textContent = glyphs[i % glyphs.length];
      sporeRoot.appendChild(s);
      animateSpore(s, true);
    }
  }
  function animateSpore(s, initial) {
    const dur = 9000 + Math.random() * 12000;
    const startX = Math.random() * window.innerWidth;
    const drift = (Math.random() - 0.5) * 220;
    const startY = initial ? Math.random() * window.innerHeight : -30;
    const size = 8 + Math.random() * 14;
    const peak = 0.12 + Math.random() * 0.28;
    s.style.left = startX + "px";
    s.style.fontSize = size + "px";
    s.animate(
      [
        { transform: `translate(0, ${startY}px) rotate(0deg)`, opacity: 0 },
        { opacity: peak, offset: 0.15 },
        { opacity: peak, offset: 0.85 },
        { transform: `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${Math.random() * 360}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: "linear" }
    ).onfinish = () => animateSpore(s, false);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
})();
