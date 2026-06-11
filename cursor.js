/* =========================================================
   CUSTOM CURSOR — dual-speed ring + dot with contextual states
   Pure vanilla. Self-disabling on touch / coarse pointers and on
   prefers-reduced-motion. Page-agnostic (index + showcase).
   ========================================================= */
(function () {
  "use strict";
  const fine = window.matchMedia("(pointer:fine)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return; // touch / coarse / reduced-motion → native cursor, no markup

  const root = document.createElement("div");
  root.className = "cursor";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML =
    '<span class="cursor__ring"><span class="cursor__label"></span></span>' +
    '<span class="cursor__dot"></span>';
  document.body.appendChild(root);
  document.documentElement.classList.add("has-custom-cursor"); // hides native cursor only now

  const ring = root.querySelector(".cursor__ring");
  const dot = root.querySelector(".cursor__dot");
  const label = root.querySelector(".cursor__label");
  const gsap = window.gsap;

  // ---- Follow with dual-speed lag (gsap.quickTo when available, else lerp rAF) ----
  if (gsap) {
    const rx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    const ry = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
    const dx = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
    window.addEventListener("pointermove", (e) => {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
  } else {
    let mx = innerWidth / 2, my = innerHeight / 2;
    let rxv = mx, ryv = my;
    window.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const tick = () => {
      rxv += (mx - rxv) * 0.18; ryv += (my - ryv) * 0.18;
      ring.style.transform = `translate(${rxv}px, ${ryv}px)`;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---- Show only after first move (avoid a parked cursor at 0,0) ----
  window.addEventListener("pointermove", () => root.classList.add("is-active"), { once: true });
  document.documentElement.addEventListener("mouseleave", () => root.classList.remove("is-active"));
  document.documentElement.addEventListener("mouseenter", () => root.classList.add("is-active"));

  // ---- Contextual states (delegated; robust against injected nodes) ----
  const GROW = ".btn, .magnetic, .nav__links a, .mobile-menu a, .social-links a, .footer__col a, .footer__contact, .sc-back, .sc-dot, .lightbox__close, .lightbox__nav, summary";
  const setState = (cls, text) => {
    root.classList.remove("is-grow", "is-view", "is-drag", "is-hidden");
    if (cls) root.classList.add(cls);
    label.textContent = text || "";
  };
  document.addEventListener("pointerover", (e) => {
    const t = e.target;
    if (t.closest && (t.closest("input") || t.closest("textarea") || t.closest("[contenteditable]"))) {
      setState("is-hidden"); return;
    }
    if (t.closest && t.closest(".shot")) { setState("is-view", "View"); return; }
    if (t.closest && t.closest(".ba")) { setState("is-drag", "Drag"); return; }
    if (t.closest && t.closest(GROW)) { setState("is-grow"); return; }
    setState(null);
  });
})();
