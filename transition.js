/* =========================================================
   BRANDED PAGE TRANSITION — index.html ↔ showcase.html
   Drops a branded curtain to cover the screen, then navigates;
   the destination reveals from its own loader/curtain. MPA, no
   router. Native cross-document View Transitions (@view-transition
   in CSS) take precedence where supported — we bail out then.
   ========================================================= */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Chromium cross-document VT exposes onpageswap/onpagereveal — let the
  // native @view-transition handle it and skip the JS curtain (no double-up).
  if ("onpageswap" in window) return;

  const isInternal = (url) =>
    url.origin === location.origin &&
    /(?:^|\/)(index|showcase|about)\.html$/.test(url.pathname) &&
    url.pathname !== location.pathname;

  function getOverlay() {
    let c = document.getElementById("introCurtain");
    if (c) { c.classList.remove("is-done", "is-lifting"); return c; }
    // Showcase has no #introCurtain → build a minimal branded one on the fly.
    c = document.createElement("div");
    c.className = "curtain curtain--gen";
    c.setAttribute("aria-hidden", "true");
    c.innerHTML =
      '<div class="curtain__inner"><span class="curtain__word">' +
      '<span class="curtain__name">PREMIUM</span>' +
      '<span class="curtain__sub">Fencing &amp; Landscaping</span></span></div>';
    document.body.appendChild(c);
    return c;
  }

  function playOutro(href) {
    if (reduce) { location.href = href; return; }
    window.dispatchEvent(new Event("page:leaving")); // main.js halts Lenis inertia
    try {
      sessionStorage.setItem("pageTransition", "1"); // force destination curtain
      // Carry a target section hash across the navigation so cross-page nav
      // (e.g. About → "Work") lands on the section despite scroll-to-top.
      const hash = new URL(href, location.href).hash;
      if (hash && hash.length > 1) sessionStorage.setItem("transitionHash", hash);
      else sessionStorage.removeItem("transitionHash");
    } catch (e) {}
    const c = getOverlay();
    // Start collapsed (the reused #introCurtain's resting clip is fully
    // covering, which would flash-cover before the drop) then play the drop.
    c.style.clipPath = c.style.webkitClipPath = "inset(0 0 100% 0)";
    void c.offsetWidth;                              // commit the collapsed start state
    c.classList.add("is-covering");
    let went = false;
    const go = () => { if (went) return; went = true; location.href = href; };
    c.addEventListener("animationend", go, { once: true });
    setTimeout(go, 650);                             // safety net, mirrors curtain timers
  }

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    let url;
    try { url = new URL(a.href, location.href); } catch (_) { return; }
    if (!isInternal(url)) return; // external, same-page and in-page #anchors pass through
    e.preventDefault();
    playOutro(url.href);
  });
})();
