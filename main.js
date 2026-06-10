/* =========================================================
   PREMIUM FENCING & LANDSCAPING — Interactions
   Scroll reveals · parallax · stagger · sticky storytelling
   · animated stats · magnetic / interactive CTA · floaters
   ========================================================= */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Always open/reload at the hero (top) ----------
     Stop the browser restoring the last scroll position (common on
     mobile reloads) and override any landing #hash jump on first load. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const toTop = () => window.scrollTo(0, 0);
  toTop();                                   // before paint
  window.addEventListener("DOMContentLoaded", toTop);
  window.addEventListener("load", toTop);    // after images/hash settle

  /* ---------- Single rAF-batched scroll dispatcher ----------
     All scroll work funnels through one passive listener + one rAF per frame,
     instead of three separate listeners each reading layout on every tick. */
  const scrollFns = [];
  let scrollTicking = false;
  function runScrollFns() { for (const fn of scrollFns) fn(); scrollTicking = false; }
  window.addEventListener("scroll", () => {
    if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(runScrollFns); }
  }, { passive: true });

  /* ---------- Page-load brand curtain (once per session) ---------- */
  const curtain = $("#introCurtain");
  if (curtain) {
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return; dismissed = true;
      curtain.classList.add("is-lifting");
      curtain.addEventListener("transitionend", () => curtain.classList.add("is-done"), { once: true });
      setTimeout(() => curtain.classList.add("is-done"), 1200); // safety net
    };
    if (reduce || sessionStorage.getItem("introSeen")) {
      curtain.classList.add("is-done"); // no theatre on repeat visits / reduced motion
    } else {
      sessionStorage.setItem("introSeen", "1");
      window.addEventListener("load", () => setTimeout(dismiss, 1400));
      setTimeout(dismiss, 2600); // safety if load is slow
    }
  }

  /* ---------- Hero cinematic entrance ---------- */
  window.addEventListener("DOMContentLoaded", () => {
    const cineLines  = $$(".hero__title .cine-line");
    const revealEls  = $$(".hero .reveal");  // [label, lede, actions]

    // Timing (ms after video begins playing):
    //   label → 300   line-1 → 900   line-2 → 2050   line-3 → 3200
    //   lede  → 4200  actions → 4750
    const LINE_DELAYS   = [900, 2050, 3200];
    const REVEAL_DELAYS = [300, 4200, 4750]; // matches order of .reveal elements

    function runCineSequence() {
      revealEls.forEach((el, i) => {
        setTimeout(() => el.classList.add("is-in"), REVEAL_DELAYS[i] ?? 4200);
      });
      cineLines.forEach((line, i) => {
        setTimeout(() => line.classList.add("is-in"), LINE_DELAYS[i] ?? (900 + i * 1150));
      });
    }

    if (reduce) {
      // Skip animation entirely for motion-sensitive users
      cineLines.forEach(l => l.classList.add("is-in"));
      revealEls.forEach(l => l.classList.add("is-in"));
      return;
    }

    // Trigger from the video's own play event so timing is always in sync
    let sequenceFired = false;
    const fireOnce = () => { if (sequenceFired) return; sequenceFired = true; runCineSequence(); };

    const vid = $("#heroVideo");
    if (vid) {
      // Best case: browser autoplays immediately
      vid.addEventListener("play", fireOnce, { once: true });
      // Fade video in once frames are available
      const showVideo = () => vid.classList.add("is-ready");
      if (vid.readyState >= 2) { showVideo(); } else { vid.addEventListener("loadeddata", showVideo, { once: true }); }
      // Nudge autoplay; ignore silent block
      const p = vid.play(); if (p) p.catch(() => {});
      // Fallback: if play event hasn't fired in 900 ms, start sequence anyway
      setTimeout(fireOnce, 900);
    } else {
      setTimeout(fireOnce, 400);
    }
  });

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
  scrollFns.push(onScroll);
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
    scrollFns.push(onIntro);
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
    scrollFns.push(onParallax);
    onParallax();
  }

  /* ---------- Sticky storytelling — the growth journey ---------- */
  const steps = $$(".story__step");
  const stages = $$(".story__stage");
  if (steps.length && stages.length) {
    const counterEl = $("#storyCounter");
    const nameEl = $("#storyStageName");
    const setStage = (idx) => {
      steps.forEach((s) => {
        const i = +s.dataset.step;
        s.classList.toggle("is-active", i === idx);
        s.classList.toggle("is-done", i < idx);
      });
      stages.forEach((st) => st.classList.toggle("is-active", +st.dataset.stage === idx));
      if (counterEl) {
        const next = "0" + (idx + 1);
        if (counterEl.textContent !== next) {
          counterEl.textContent = next;
          counterEl.classList.remove("is-tick");
          void counterEl.offsetWidth; // restart tick animation
          counterEl.classList.add("is-tick");
        }
      }
      if (nameEl) nameEl.textContent = steps[idx]?.dataset.name || "";
    };
    /* ----- Portal Outpour: cards explode from the trigger into the grid ----- */
    const storySection = $(".story");
    const portal = $("#storyPortal");
    const arcFill = $("#storyArc");
    const ARC_LEN = 754; // 2π × r(120)
    // spring curve with overshoot (CSS linear() ≈ spring(1, 170, 14)); back-out fallback
    const SPRING =
      "linear(0, 0.011 1.1%, 0.071 2.9%, 0.27 6.5%, 0.741 12.6%, 0.928 15.6%, 1.061 18.8%, " +
      "1.12 21.6%, 1.143 24.4%, 1.137 27.6%, 1.061 35.8%, 1.015 41.6%, 0.988 48.5%, " +
      "0.985 55.8%, 1.001 70.6%, 1.003 79.5%, 1)";
    const FALLBACK = "cubic-bezier(0.34, 1.56, 0.64, 1)";
    const supportsLinear = CSS.supports("transition-timing-function", "linear(0, 1)");
    const EASING = supportsLinear ? SPRING : FALLBACK;

    if (storySection && portal) {
      storySection.classList.add("is-portal");

      const pour = () => {
        if (storySection.classList.contains("is-poured")) return;
        portal.setAttribute("aria-expanded", "true");
        // origin = the trigger's center at click time (before it leaves the flow)
        const pr = portal.getBoundingClientRect();
        const ox = pr.left + pr.width / 2;
        const oy = pr.top + pr.height / 2;
        portal.classList.add("is-fired");
        storySection.classList.add("is-collapsed"); // grid snaps to final layout now
        void storySection.offsetWidth;
        const cards = steps.map((s) => $(".story__card", s));

        // rank by distance from the portal → the outpour wave
        const ranked = cards
          .map((card) => {
            const r = card.getBoundingClientRect();
            const dx = ox - (r.left + r.width / 2);
            const dy = oy - (r.top + r.height / 2);
            return { card, dx, dy, dist: Math.hypot(dx, dy) };
          })
          .sort((a, b) => a.dist - b.dist);

        ranked.forEach(({ card, dx, dy }, rank) => {
          // place at the portal's center, scaled to nothing — no transition yet
          card.style.transition = "none";
          card.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(0.001)`;
          card.style.opacity = "0";
          card.parentElement.classList.add("is-seen"); // arms the content cascade
          void card.offsetWidth; // commit start state

          const delay = 140 + rank * 45; // ~45ms wave, after the trigger implodes
          card.style.transition =
            `transform 1s ${EASING} ${delay}ms, opacity .4s ease-out ${delay}ms`;
          card.style.transform = "translate(0, 0) scale(1)";
          card.style.opacity = "1";

          card.addEventListener("transitionend", function clean(e) {
            if (e.propertyName !== "transform") return;
            // hand control back to the CSS state machine (tilt, active, dim)
            card.style.transition = "";
            card.style.transform = "";
            card.style.opacity = "";
            card.removeEventListener("transitionend", clean);
          });
        });

        // progress arc sweeps full as the wave lands; counter ticks to 01
        if (arcFill) {
          arcFill.style.transition = `stroke-dashoffset 1.3s ${EASING} .2s`;
          arcFill.style.strokeDashoffset = "0";
        }
        setTimeout(() => {
          storySection.classList.add("is-poured");
          setStage(0);
        }, 140 + ranked.length * 45 + 600);
      };

      portal.addEventListener("click", pour);

      if (reduce) {
        // no portal theatre: everything rendered, complete
        storySection.classList.add("is-poured");
        steps.forEach((s) => s.classList.add("is-seen"));
        if (arcFill) arcFill.style.strokeDashoffset = "0";
        setStage(0);
      } else {
        // courtesy auto-pour if the visitor scrolls past without clicking
        const autoPour = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              setTimeout(() => {
                if (!storySection.classList.contains("is-poured")) pour();
              }, 2600);
              autoPour.unobserve(e.target);
            });
          },
          { threshold: 0.6 }
        );
        autoPour.observe(portal);
      }
    }

    /* hovering a card focuses its stage (visual, counter, name) */
    steps.forEach((s) => {
      s.addEventListener("pointerenter", () => {
        if (storySection?.classList.contains("is-poured")) setStage(+s.dataset.step);
      });
    });
    setStage(0);

    /* Micro-interactions: pointer-tracked spotlight + gentle 3D tilt
       (the ghost number counter-drifts off the same --rx/--ry vars) */
    if (!reduce && window.matchMedia("(pointer: fine)").matches) {
      $$(".story__card").forEach((card) => {
        card.addEventListener("pointermove", (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
          card.style.setProperty("--rx", ((py - 0.5) * -3.2).toFixed(2) + "deg");
          card.style.setProperty("--ry", ((px - 0.5) * 3.2).toFixed(2) + "deg");
        });
        card.addEventListener("pointerleave", () => {
          card.style.setProperty("--rx", "0deg");
          card.style.setProperty("--ry", "0deg");
        });
      });
    }
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
      if (btn) {
        const label = btn.querySelector("span");
        label.textContent = "Planted ✦";
        btn.disabled = true;
        setTimeout(() => { label.textContent = "Send the brief"; btn.disabled = false; }, 4000);
      }
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

  /* ---------- Mobile menu ---------- */
  const burger = $("#navBurger");
  const mobileMenu = $("#mobileMenu");
  if (burger && mobileMenu) {
    mobileMenu.hidden = false; // CSS handles visibility; keep in a11y tree only when open
    const setMenu = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileMenu.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    burger.addEventListener("click", () =>
      setMenu(burger.getAttribute("aria-expanded") !== "true"));
    mobileMenu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  /* ---------- Scrollspy: highlight nav link for section in view ---------- */
  const navLinks = $$(".nav__links a");
  if (navLinks.length) {
    const byHash = new Map(navLinks.map((a) => [a.getAttribute("href"), a]));
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const link = byHash.get("#" + e.target.id);
          if (!link) return;
          if (e.isIntersecting) {
            navLinks.forEach((a) => a.classList.toggle("is-active", a === link));
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    navLinks.forEach((a) => {
      const target = $(a.getAttribute("href"));
      if (target) spy.observe(target);
    });
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

  /* ---------- Project lightbox (shared-element zoom where supported) ---------- */
  const lightbox = $("#lightbox");
  const tiles = $$(".shot");
  if (lightbox && tiles.length) {
    const lbImg = $("#lightboxImg");
    const lbTitle = $("#lightboxTitle");
    const lbSub = $("#lightboxSub");
    const lbTag = $("#lightboxTag");
    const lbCount = $("#lightboxCount");
    const decode = (s) => { const t = document.createElement("textarea"); t.innerHTML = s || ""; return t.value; };
    const items = tiles.map((t) => ({
      el: t,
      full: t.dataset.full,
      title: decode(t.dataset.title),
      sub: decode(t.dataset.sub),
      tag: decode(t.dataset.tag),
    }));
    let current = -1;
    let lastFocus = null;

    const render = (i) => {
      const it = items[i];
      lbImg.src = it.full; lbImg.alt = it.title;
      lbTitle.textContent = it.title;
      lbSub.textContent = it.sub;
      lbTag.textContent = it.tag;
      lbCount.textContent = "0" + (i + 1) + " / 0" + items.length;
      current = i;
    };

    const canVT = !reduce && typeof document.startViewTransition === "function";
    const setVTName = (i, on) => {
      const span = $(".shot__img", items[i].el);
      if (span) span.style.viewTransitionName = on ? "project-img" : "";
    };

    const open = (i) => {
      lastFocus = document.activeElement;
      const show = () => {
        render(i);
        lightbox.hidden = false;
        requestAnimationFrame(() => lightbox.classList.add("is-open"));
        document.body.style.overflow = "hidden";
        $("#lightboxClose").focus();
      };
      if (canVT) {
        setVTName(i, true);                  // thumbnail owns the name in the OLD state
        lightbox.classList.add("vt-active"); // lightbox img will own it once visible (still hidden now)
        const vt = document.startViewTransition(() => {
          show();
          setVTName(i, false);               // hand the name to the lightbox img in the NEW state
        });
        vt.finished.finally(() => { setVTName(i, false); lightbox.classList.remove("vt-active"); });
      } else { show(); }
    };

    const close = () => {
      lightbox.classList.remove("is-open");
      const done = () => { lightbox.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); };
      if (reduce) { done(); }
      else { lightbox.addEventListener("transitionend", done, { once: true }); setTimeout(done, 450); }
    };

    const go = (dir) => {
      const next = (current + dir + items.length) % items.length;
      // quick cross-fade of just the image
      lbImg.style.opacity = "0";
      setTimeout(() => { render(next); lbImg.style.opacity = ""; }, 140);
    };

    items.forEach((it, i) => {
      it.el.addEventListener("click", () => open(i));
      it.el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
      });
    });
    $("#lightboxClose").addEventListener("click", close);
    $("#lightboxPrev").addEventListener("click", () => go(-1));
    $("#lightboxNext").addEventListener("click", () => go(1));
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) close(); });
    window.addEventListener("keydown", (e) => {
      if (lightbox.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Tab") {
        // simple focus trap across the lightbox controls
        const f = $$("button", lightbox);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
})();
