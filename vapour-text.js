/* =========================================================
   VAPOUR TEXT — particles that assemble into the hero text
   Plays once on load. Samples the real text to a canvas, turns
   each lit pixel into a particle, then converges them into place
   (a left-to-right "materialize"), and finally crossfades to the
   real, crisp DOM text. Vanilla port of a canvas particle engine.

   Targets:
     • .hero__title .cine-line  (the three headline lines)
     • .brand__word             (top-left PREMIUM / Fencing & Landscaping)

   Safety: reduced-motion bails to solid text; a master fallback
   timer guarantees the real text is never left invisible; fonts
   are awaited so particles form from Lora, not a fallback face.
   ========================================================= */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; // existing CSS shows solid text — no theatre

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const PAD = 70;       // horizontal canvas padding — room for the swarm to fly in from (was 10)
  const PADY = 70;      // vertical padding — descenders + room for the swarm (was 22)
  const DURATION = 2400; // slow enough to clearly read as a particle assembly (was 1150)
  const STAGGER = 0.5;  // bigger L→R sweep — you watch the word build across (was 0.35)
  const SAMPLE_CSS = 1; // denser sampling → a solid, visible particle cloud (was 2)

  const titleEl = document.querySelector(".hero__title");
  const cineLines = titleEl ? Array.from(titleEl.querySelectorAll(".cine-line")) : [];
  const brandWord = document.querySelector(".nav .brand__word");
  const brandInner = brandWord ? Array.from(brandWord.querySelectorAll(".brand__name, .brand__sub")) : [];

  if (!cineLines.length && !brandWord) return;

  /* CRITICAL: hide the *text* elements only — never an ancestor of the particle
     canvas. CSS opacity applies to the whole subtree, so fading a parent of the
     canvas also fades the canvas (the bug that made particles invisible). We
     hide via inline opacity and append each canvas to a non-faded HOST. */
  const hide = (el) => { el.style.opacity = "0"; };

  /* Take ownership of the reveal up-front (defer script runs after parse, so
     the nodes exist). This neutralizes the CSS cine-reveal so they don't double
     up, and hides the real text until particles assemble. */
  const tracked = [];
  if (titleEl) {
    titleEl.classList.add("vt");                 // neutralizes cine-reveal; .cine-line opacity:0 via CSS
    cineLines.forEach((el) => tracked.push(el));
  }
  if (brandWord && brandInner.length) {
    // kill brandSubReveal (it animates letter-spacing 0.6em→0.26em) so we sample
    // the FINAL geometry, not a mid-animation width; then fade the inner spans.
    brandInner.forEach((el) => { el.style.animation = "none"; hide(el); tracked.push(el); }); // brandWord stays the canvas host
  } else if (brandWord) {
    hide(brandWord); tracked.push(brandWord);
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* bounding box that encloses every element in `els` (viewport coords) */
  function unionRect(els) {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    els.forEach((e) => {
      const x = e.getBoundingClientRect();
      if (x.left < l) l = x.left;
      if (x.top < t) t = x.top;
      if (x.right > r) r = x.right;
      if (x.bottom > b) b = x.bottom;
    });
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }

  /* match CSS text-transform so sampled glyphs equal what the DOM renders */
  function applyTransform(text, transform) {
    if (transform === "uppercase") return text.toUpperCase();
    if (transform === "lowercase") return text.toLowerCase();
    if (transform === "capitalize") return text.replace(/\b\w/g, (c) => c.toUpperCase());
    return text;
  }

  /* full per-segment font metrics so each run (incl. <em>) matches the DOM */
  function fontPropsFrom(cs, text) {
    return {
      text,
      color: cs.color,
      weight: cs.fontWeight || "400",
      family: cs.fontFamily || "serif",
      size: parseFloat(cs.fontSize) || 50,
      ls: parseFloat(cs.letterSpacing) || 0,   // "normal" → NaN → 0
      italic: cs.fontStyle === "italic",
    };
  }

  /* ---- collect drawable segments from a line element (each run keeps its own
     colour / weight / size / letter-spacing / italic so widths match the DOM) ---- */
  function segmentsOf(lineEl) {
    const base = getComputedStyle(lineEl);
    const segs = [];
    lineEl.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const text = applyTransform(node.textContent, base.textTransform);
        if (text) segs.push(fontPropsFrom(base, text));
      } else if (node.nodeType === 1) {
        const cs = getComputedStyle(node);
        const text = applyTransform(node.textContent, cs.textTransform);
        if (text) segs.push(fontPropsFrom(cs, text));
      }
    });
    return { segs, base };
  }

  /* ---- render one or more lines into a canvas, then sample particles ----
     `host` = the element the canvas is appended to (must stay opacity:1).
     `lineEls` = the text elements to sample (and, separately, to reveal). The
     canvas is sized to the lines' union box and positioned relative to host. */
  function buildParticles(host, lineEls) {
    const box = unionRect(lineEls);
    const hostRect = host.getBoundingClientRect();
    const cw = Math.max(1, Math.floor((box.width + PAD * 2) * DPR));
    const ch = Math.max(1, Math.floor((box.height + PADY * 2) * DPR));

    const canvas = document.createElement("canvas");
    canvas.className = "vapor-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.left = (box.left - hostRect.left - PAD) + "px";
    canvas.style.top = (box.top - hostRect.top - PADY) + "px";
    canvas.style.width = box.width + PAD * 2 + "px";
    canvas.style.height = box.height + PADY * 2 + "px";

    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "middle";
    ctx.textRendering = "geometricPrecision";

    // draw each line at its real position (relative to the union box)
    lineEls.forEach((lineEl) => {
      const r = lineEl.getBoundingClientRect();
      const { segs } = segmentsOf(lineEl);

      // Anchor at the text's ACTUAL rendered start, not the line box edge, so
      // centered / right-aligned lines line up with the DOM (no sideways jump).
      let textLeft = r.left;
      try {
        const rng = document.createRange();
        rng.selectNodeContents(lineEl);
        const rr = rng.getBoundingClientRect();
        if (rr && rr.width) textLeft = rr.left;
      } catch (_) {}

      const yCss = PADY + (r.top - box.top) + r.height / 2;
      let xCss = PAD + (textLeft - box.left);

      segs.forEach((seg) => {
        try { ctx.letterSpacing = seg.ls * DPR + "px"; } catch (_) {} // set before measure + fill
        ctx.font = `${seg.italic ? "italic " : ""}${seg.weight} ${seg.size * DPR}px ${seg.family}`;
        ctx.fillStyle = seg.color;
        ctx.fillText(seg.text, xCss * DPR, yCss * DPR);
        xCss += ctx.measureText(seg.text).width / DPR;
      });
    });

    // sample the rendered pixels into particles
    const img = ctx.getImageData(0, 0, cw, ch).data;
    const step = Math.max(1, Math.round(SAMPLE_CSS * DPR));
    const particles = [];
    let minX = Infinity, maxX = -Infinity;

    for (let y = 0; y < ch; y += step) {
      for (let x = 0; x < cw; x += step) {
        const i = (y * cw + x) * 4;
        const a = img[i + 3];
        if (a > 24) {
          particles.push({
            tx: x, ty: y,
            r: img[i], g: img[i + 1], b: img[i + 2],
            alpha: (a / 255) * 0.92,
          });
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    // scatter start positions + per-particle L→R delay
    const spread = Math.min(170, (parseFloat(getComputedStyle(lineEls[0]).fontSize) || 50) * 1.5) * DPR;
    const span = Math.max(1, maxX - minX);
    particles.forEach((p) => {
      p.sx = p.tx + (Math.random() - 0.5) * spread * 2;
      p.sy = p.ty + (Math.random() - 0.5) * spread * 2;
      p.delay = ((p.tx - minX) / span) * STAGGER;
    });

    ctx.clearRect(0, 0, cw, ch); // wipe the sampled text; particles draw from here
    return { canvas, ctx, particles, cw, ch, step };
  }

  /* ---- run the assemble animation, then crossfade to the real text ----
     `host` = where the canvas lives (stays opaque); `lineEls` = the hidden
     text elements that get revealed once particles settle. */
  function vaporElement(host, lineEls, onCleanup) {
    let data;
    try {
      data = buildParticles(host, lineEls);
    } catch (e) {
      lineEls.forEach(revealReal); // sampling failed — never leave text hidden
      return;
    }
    const { canvas, ctx, particles, cw, ch, step } = data;

    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.appendChild(canvas);

    let start = null;
    let raf = 0;

    const finish = () => {
      cancelAnimationFrame(raf);
      lineEls.forEach(revealReal);
      canvas.style.transition = "opacity .3s ease";
      canvas.style.opacity = "0";
      setTimeout(() => { canvas.remove(); if (onCleanup) onCleanup(); }, 320);
    };

    const frame = (now) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / DURATION);

      ctx.clearRect(0, 0, cw, ch);
      for (let k = 0; k < particles.length; k++) {
        const pt = particles[k];
        const local = (p - pt.delay) / (1 - STAGGER);
        const e = easeOut(local < 0 ? 0 : local > 1 ? 1 : local);
        const x = lerp(pt.sx, pt.tx, e);
        const y = lerp(pt.sy, pt.ty, e);
        const op = e * pt.alpha;
        if (op <= 0.01) continue;
        ctx.fillStyle = `rgba(${pt.r},${pt.g},${pt.b},${op})`;
        ctx.fillRect(x, y, step, step);
      }

      if (p >= 1) { finish(); return; }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
  }

  /* reveal the real (crisp, responsive) DOM text */
  function revealReal(rootEl) {
    rootEl.classList.remove("vt-hide");
    rootEl.classList.add("vt-show");
    rootEl.style.transition = "opacity .35s ease";
    rootEl.style.opacity = "1";
  }

  /* master safety net: if anything stalls, show everything (never invisible) */
  let revealed = false;
  const safetyReveal = () => {
    if (revealed) return; revealed = true;
    tracked.forEach((el) => { try { revealReal(el); } catch (_) {} });
  };
  const safetyTimer = setTimeout(safetyReveal, 7000);

  /* ---- trigger: mirror main.js — fire on hero video play, fallback timer ---- */
  function schedule() {
    // brand assembles as the curtain lifts. Canvas hosts on brandWord (opaque);
    // the inner spans are the hidden text that gets revealed.
    if (brandWord) {
      const bl = brandInner.length ? brandInner : [brandWord];
      setTimeout(() => vaporElement(brandWord, bl, null), 1000);
    }

    // headline: canvas hosts on the (opaque) .hero__title; each .cine-line is
    // the hidden text. Staggered to keep the existing cinematic cadence.
    const LINE_DELAYS = [800, 2200, 3600];
    cineLines.forEach((line, i) => {
      setTimeout(() => vaporElement(titleEl, [line], null), LINE_DELAYS[i] ?? (800 + i * 1400));
    });
  }

  // Wait for the real font before sampling, then arm the same trigger main.js uses.
  const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    clearTimeout(safetyTimer);
    setTimeout(safetyReveal, 8000); // re-arm safety relative to fonts being ready

    let fired = false;
    const start = () => { if (fired) return; fired = true; schedule(); };
    const vid = document.getElementById("heroVideo");
    if (vid) {
      vid.addEventListener("play", start, { once: true });
      setTimeout(start, 900);
    } else {
      setTimeout(start, 400);
    }
  });
})();
