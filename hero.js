/* =========================================================
   VERDANT — Hero motion layer
   Sunlit leaves & grass clippings blow across the hero photo,
   echoing the spray of cuttings behind a mower. Pure canvas 2D,
   DPR-aware, reduced-motion friendly. Sits on top of the photo.
   ========================================================= */
(function () {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Warm, sunlit leaf palette
  const LEAF_COLORS = ["#7dd66a", "#4ea83f", "#2f7d3a", "#a7d96a", "#f3c969", "#cfe08a"];

  let W = 0, H = 0, DPR = 1;
  let leaves = [];
  let raf = null;
  let t = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function makeLeaf(seed) {
    // Emission feels like it blows from the upper-right (where the sun /
    // the mower's spray would be) toward the lower-left.
    const fromRight = Math.random() > 0.35;
    return {
      x: fromRight ? rand(W * 0.55, W + 60) : rand(-40, W),
      y: fromRight ? rand(-40, H * 0.5) : rand(-60, -10),
      vx: rand(-2.4, -0.5),
      vy: rand(0.6, 2.0),
      size: rand(6, 16),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.06, 0.06),
      sway: rand(0.6, 1.6),
      swayPhase: rand(0, Math.PI * 2),
      color: LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0],
      alpha: rand(0.55, 0.95),
      spin: Math.random() > 0.5 ? 1 : -1,
      seedOffset: seed ? rand(0, 1000) : 0,
    };
  }

  function seedLeaves() {
    const count = Math.max(18, Math.floor(W / 42));
    leaves = [];
    for (let i = 0; i < count; i++) {
      const l = makeLeaf(true);
      l.x = rand(0, W); l.y = rand(0, H); // spread initial frame
      leaves.push(l);
    }
  }

  function drawLeaf(l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot);
    // pseudo-3d flutter: squash horizontally over time
    const flutter = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.04 * l.sway + l.swayPhase));
    ctx.scale(flutter * l.spin, 1);
    ctx.globalAlpha = l.alpha;
    ctx.fillStyle = l.color;
    // leaf shape (two quadratic curves)
    ctx.beginPath();
    ctx.moveTo(0, -l.size);
    ctx.quadraticCurveTo(l.size * 0.7, 0, 0, l.size);
    ctx.quadraticCurveTo(-l.size * 0.7, 0, 0, -l.size);
    ctx.fill();
    // central vein
    ctx.globalAlpha = l.alpha * 0.5;
    ctx.strokeStyle = "rgba(20,49,15,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -l.size); ctx.lineTo(0, l.size); ctx.stroke();
    ctx.restore();
  }

  function step(l) {
    l.swayPhase += 0.02 * l.sway;
    l.x += l.vx + Math.sin(t * 0.02 * l.sway + l.seedOffset) * 0.6;
    l.y += l.vy;
    l.rot += l.vr;
    // recycle when off-screen (bottom-left)
    if (l.x < -50 || l.y > H + 50) {
      Object.assign(l, makeLeaf(false));
    }
  }

  function frame() {
    t++;
    ctx.clearRect(0, 0, W, H);
    for (const l of leaves) { step(l); drawLeaf(l); }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function renderStatic() {
    ctx.clearRect(0, 0, W, H);
    for (const l of leaves) drawLeaf(l);
    ctx.globalAlpha = 1;
  }

  resize();
  seedLeaves();
  window.addEventListener("resize", () => {
    resize(); seedLeaves();
    if (reduceMotion) renderStatic();
  });

  if (reduceMotion) {
    renderStatic();
  } else {
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) raf = requestAnimationFrame(frame);
    });
  }
})();
