/* =========================================================
   VERDANT — Hero motion scene
   A gardener pushes a lawn mower across the field while
   freshly-cut grass clippings spray out behind the deck.
   Pure canvas 2D, DPR-aware, reduced-motion friendly.
   ========================================================= */
(function () {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Palette (kept inside the Aether DNA: near-black field, white/green accents)
  const C = {
    grassTall: "#1f5a26",
    grassCut: "#143d19",
    blade: "#2f7d3a",
    bladeLight: "#7dd66a",
    mower: "#f4f4f4",
    mowerDark: "#a1a1aa",
    body: "#0c0c0c",
    accent: "#7dd66a",
  };

  let W = 0, H = 0, DPR = 1, groundY = 0;
  let clippings = [];
  let blades = [];          // background swaying grass strip
  let cutMap = [];          // per-column cut state 0..1 (1 = tall, 0 = freshly cut)
  const COLS = 120;
  let mower = { x: -200, speed: 2.1, wheel: 0, bob: 0 };
  let t = 0;
  let raf = null;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    groundY = H * 0.84;

    // Build background blades
    blades = [];
    const count = Math.floor(W / 7);
    for (let i = 0; i < count; i++) {
      blades.push({
        x: Math.random() * W,
        h: 14 + Math.random() * 30,
        w: 1 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        sway: 0.4 + Math.random() * 0.8,
        shade: Math.random(),
      });
    }
    if (cutMap.length !== COLS) cutMap = new Array(COLS).fill(1);
  }

  function spawnClipping(x, y) {
    const dir = -1; // spray backward (opposite travel) and up
    clippings.push({
      x, y,
      vx: dir * (1.5 + Math.random() * 3.2),
      vy: -(3 + Math.random() * 5),
      g: 0.16 + Math.random() * 0.08,
      life: 1,
      decay: 0.006 + Math.random() * 0.008,
      len: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.5,
      light: Math.random() > 0.45,
    });
  }

  function drawGround() {
    // cut field
    ctx.fillStyle = C.grassCut;
    ctx.fillRect(0, groundY, W, H - groundY);

    // background swaying blades
    for (const b of blades) {
      const sway = Math.sin(t * 0.02 * b.sway + b.phase) * 4;
      const colIndex = Math.floor((b.x / W) * COLS);
      const tall = cutMap[colIndex] !== undefined ? cutMap[colIndex] : 1;
      const h = b.h * (0.25 + 0.75 * tall);
      ctx.strokeStyle = b.shade > 0.7 ? C.blade : (b.shade > 0.4 ? C.grassTall : "#17471c");
      ctx.lineWidth = b.w;
      ctx.beginPath();
      ctx.moveTo(b.x, groundY);
      ctx.quadraticCurveTo(b.x + sway * 0.5, groundY - h * 0.6, b.x + sway, groundY - h);
      ctx.stroke();
    }
  }

  function drawMower(mx) {
    const baseY = groundY;
    const bob = Math.sin(t * 0.25) * 1.6;
    const y = baseY + bob;

    ctx.save();
    ctx.translate(mx, y);

    // ---- soft contact shadow ----
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 78, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- mower deck ----
    const deckGrad = ctx.createLinearGradient(0, -38, 0, -8);
    deckGrad.addColorStop(0, C.mower);
    deckGrad.addColorStop(1, C.mowerDark);
    ctx.fillStyle = deckGrad;
    roundRect(-46, -34, 92, 26, 6);
    ctx.fill();

    // accent stripe
    ctx.fillStyle = C.accent;
    roundRect(-46, -20, 92, 4, 2);
    ctx.fill();

    // engine block
    ctx.fillStyle = C.mowerDark;
    roundRect(-10, -52, 30, 20, 4);
    ctx.fill();
    ctx.fillStyle = C.body;
    roundRect(-4, -49, 8, 6, 2);
    ctx.fill();

    // handle
    ctx.strokeStyle = C.mower;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-40, -28);
    ctx.lineTo(-86, -84);
    ctx.moveTo(-34, -28);
    ctx.lineTo(-80, -84);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-86, -84);
    ctx.lineTo(-72, -84);
    ctx.stroke();

    // wheels
    drawWheel(-32, -6, 13, mower.wheel);
    drawWheel(34, -6, 13, mower.wheel);

    ctx.restore();

    // ---- gardener walking behind the handle ----
    drawGardener(mx - 100, y, t);
  }

  function drawWheel(cx, cy, r, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = C.body;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.mowerDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(rot);
    ctx.strokeStyle = C.mowerDark; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos((i * Math.PI) / 2) * (r - 3), Math.sin((i * Math.PI) / 2) * (r - 3));
      ctx.stroke();
    }
    ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawGardener(gx, gy, time) {
    const swing = Math.sin(time * 0.25) * 0.5; // leg/arm swing
    ctx.save();
    ctx.translate(gx, gy);
    ctx.strokeStyle = C.mower;
    ctx.fillStyle = C.mower;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const hip = -52, shoulder = -92;

    // legs (walking)
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, hip);
    ctx.lineTo(6 + swing * 14, hip + 30);
    ctx.lineTo(6 + swing * 18, -2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, hip);
    ctx.lineTo(-6 - swing * 14, hip + 30);
    ctx.lineTo(-6 - swing * 18, -2);
    ctx.stroke();

    // torso (slight forward lean toward the mower)
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(0, hip);
    ctx.lineTo(8, shoulder);
    ctx.stroke();

    // arm reaching forward to the mower handle grip
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(8, shoulder + 4);
    ctx.quadraticCurveTo(40, shoulder - 6, 72, shoulder + 2);
    ctx.stroke();

    // head + sun hat
    ctx.beginPath();
    ctx.arc(11, shoulder - 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.ellipse(11, shoulder - 22, 18, 5, 0, 0, Math.PI * 2); // hat brim
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(11, shoulder - 26, 9, 8, 0, 0, Math.PI * 2);  // hat top
    ctx.fill();

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawClippings() {
    for (const c of clippings) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = Math.max(0, c.life);
      ctx.strokeStyle = c.light ? C.bladeLight : C.blade;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-c.len / 2, 0);
      ctx.lineTo(c.len / 2, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function frame() {
    t += 1;
    ctx.clearRect(0, 0, W, H);

    // advance mower
    mower.x += mower.speed;
    mower.wheel += mower.speed / 13;
    if (mower.x > W + 160) {
      mower.x = -200;
      // regrow everything for the next pass
      for (let i = 0; i < COLS; i++) cutMap[i] = 1;
    }

    // cut grass where the deck currently is
    const deckLeft = mower.x - 46;
    const deckRight = mower.x + 46;
    const ci1 = Math.floor((deckLeft / W) * COLS);
    const ci2 = Math.floor((deckRight / W) * COLS);
    for (let i = ci1; i <= ci2; i++) {
      if (i >= 0 && i < COLS && cutMap[i] > 0) cutMap[i] = 0;
    }

    // spray clippings from the back of the deck
    if (t % 2 === 0 && mower.x > 0 && mower.x < W) {
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        spawnClipping(deckLeft + Math.random() * 10, groundY - 14);
      }
    }

    drawGround();
    drawMower(mower.x);

    // update + draw clippings
    for (const c of clippings) {
      c.vy += c.g;
      c.x += c.vx;
      c.y += c.vy;
      c.rot += c.vr;
      c.life -= c.decay;
      // settle on the ground
      if (c.y > groundY - 2) { c.vy *= -0.18; c.vx *= 0.6; c.y = groundY - 2; }
    }
    clippings = clippings.filter((c) => c.life > 0);
    drawClippings();

    raf = requestAnimationFrame(frame);
  }

  function renderStatic() {
    // single non-animated frame for reduced motion
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < COLS / 2; i++) cutMap[i] = 0; // left half mown
    mower.x = W * 0.5;
    drawGround();
    drawMower(mower.x);
  }

  resize();
  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) renderStatic();
  });

  if (reduceMotion) {
    renderStatic();
  } else {
    raf = requestAnimationFrame(frame);
    // pause when tab hidden to save cycles
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) raf = requestAnimationFrame(frame);
    });
  }
})();
