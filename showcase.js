/* =========================================================
   SHOWCASE — Animated continuous sections, GSAP Observer
   Wheel / swipe / arrow-key navigated full-screen panels.
   Pattern after GreenSock's "Observer" demo, dependency-light
   (no SplitText — headings are split manually).
   ========================================================= */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const docEl = document.documentElement;
  const loader = document.getElementById("scLoader");

  // ---- Graceful fallback: GSAP / Observer failed to load (blocked CDN) ----
  if (!window.gsap || !window.Observer) {
    docEl.classList.remove("is-loading");
    docEl.classList.add("no-gsap");
    if (loader) loader.remove();
    return;
  }
  gsap.registerPlugin(Observer);

  /* Split a heading into per-character spans, preserving <em> and words
     (so lines never break mid-word). Returns the array of char spans. */
  function splitHeading(heading) {
    const chars = [];
    const walk = (parent) => {
      Array.from(parent.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          const frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach((token) => {
            if (token === "") return;
            if (/^\s+$/.test(token)) { frag.appendChild(document.createTextNode(token)); return; }
            const word = document.createElement("span");
            word.className = "ts-word";
            for (const ch of token) {
              const c = document.createElement("span");
              c.className = "ts-char";
              c.textContent = ch;
              word.appendChild(c);
              chars.push(c);
            }
            frag.appendChild(word);
          });
          parent.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          walk(node); // recurse into <em> etc., keep the wrapper
        }
      });
    };
    walk(heading);
    return chars;
  }

  const sections = gsap.utils.toArray(".ts-section");
  const outers = gsap.utils.toArray(".ts-outer");
  const inners = gsap.utils.toArray(".ts-inner");
  const bgs = gsap.utils.toArray(".ts-bg");
  const sectionChars = sections.map((s) => {
    const h = s.querySelector(".ts-heading[data-split]");
    return h ? splitHeading(h) : [];
  });

  const total = sections.length;
  const wrap = gsap.utils.wrap(0, total);
  let current = -1;
  let animating = false;

  gsap.set(outers, { yPercent: 100 });
  gsap.set(inners, { yPercent: -100 });

  // ---- Fixed chrome: dot nav + counter + hint ----
  const dotsWrap = document.getElementById("scDots");
  const counter = document.getElementById("scCounter");
  const hint = document.getElementById("scHint");
  const pad = (n) => String(n).padStart(2, "0");

  const dots = sections.map((s, i) => {
    const b = document.createElement("button");
    b.className = "sc-dot";
    b.type = "button";
    b.setAttribute("aria-label", "Go to " + (s.dataset.name || "section " + (i + 1)));
    b.addEventListener("click", () => {
      if (!animating && i !== current) { hideHint(); gotoSection(i, i > current ? 1 : -1); }
    });
    dotsWrap.appendChild(b);
    return b;
  });

  function hideHint() { if (hint) hint.classList.add("is-hidden"); }
  function updateChrome(index) {
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
    if (counter) counter.innerHTML = "<b>" + pad(index + 1) + "</b> / " + pad(total);
  }

  function gotoSection(index, direction) {
    index = wrap(index);
    if (index === current) return;
    animating = true;

    const dur = reduce ? 0.5 : 1.15;
    const dFactor = direction === -1 ? -1 : 1;
    const tl = gsap.timeline({
      defaults: { duration: dur, ease: "power1.inOut" },
      onComplete: () => { animating = false; },
    });

    if (current >= 0) {
      gsap.set(sections[current], { zIndex: 0 });
      tl.to(bgs[current], { yPercent: -15 * dFactor }, 0)
        .set(sections[current], { autoAlpha: 0 });
    }

    gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 });
    tl.fromTo([outers[index], inners[index]],
        { yPercent: (i) => (i ? -100 * dFactor : 100 * dFactor) },
        { yPercent: 0 }, 0)
      .fromTo(bgs[index], { yPercent: 15 * dFactor }, { yPercent: 0 }, 0);

    const chars = sectionChars[index];
    if (chars.length && !reduce) {
      tl.fromTo(chars,
        { autoAlpha: 0, yPercent: 120 * dFactor },
        { autoAlpha: 1, yPercent: 0, duration: dur * 0.9, ease: "power2",
          stagger: { each: 0.018, from: "start" } },
        0.18);
    } else if (chars.length) {
      gsap.set(chars, { autoAlpha: 1, yPercent: 0 });
    }

    current = index;
    updateChrome(index);
  }

  // ---- Reveal first panel ----
  if (loader) { loader.classList.add("is-gone"); setTimeout(() => loader.remove(), 600); }
  docEl.classList.remove("is-loading");
  gotoSection(0, 1);

  // ---- Input: wheel + touch (pointer left out so cover links stay clickable) ----
  Observer.create({
    type: "wheel,touch",
    wheelSpeed: -1,
    tolerance: 10,
    preventDefault: true,
    onUp: () => { if (!animating) { hideHint(); gotoSection(current + 1, 1); } },
    onDown: () => { if (!animating) { hideHint(); gotoSection(current - 1, -1); } },
  });

  // ---- Keyboard ----
  const navKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"];
  window.addEventListener("keydown", (e) => {
    if (!navKeys.includes(e.key)) return;
    e.preventDefault();
    if (animating) return;
    hideHint();
    switch (e.key) {
      case "ArrowDown": case "PageDown": case " ": gotoSection(current + 1, 1); break;
      case "ArrowUp": case "PageUp": gotoSection(current - 1, -1); break;
      case "Home": gotoSection(0, -1); break;
      case "End": gotoSection(total - 1, 1); break;
    }
  });
})();
