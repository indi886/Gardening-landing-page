/* =========================================================
   KINETIC HEADLINES — per-character mask reveal on scroll
   Takes over the big section headings from the CSS reveal/wipe.
   Plays once on enter (tasteful, never reverses). GSAP-driven;
   degrades to the existing CSS reveal if GSAP is unavailable.
   ========================================================= */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (reduce || !gsap || !ST) return; // fallback: CSS .reveal-section / .wipe still show headings
  gsap.registerPlugin(ST);

  /* Split a heading into per-character spans, preserving <em> and <br/>
     (both are element nodes — recursed into / left intact) and grouping
     chars into words so lines never break mid-word. (Same pattern as
     showcase.js — kept local so modules stay independent.) */
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
          walk(node); // recurse into <em>; <br/> has no children so it's preserved as-is
        }
      });
    };
    walk(heading);
    return chars;
  }

  const SELECTORS = [
    ".parallax__title", ".story__heading", ".work__title",
    ".ba-title", ".quotes__title", ".faq__title", ".cta__title",
    ".kinetic", // generic opt-in hook (used by the About page)
  ];

  const seen = new Set();
  SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((heading) => {
      if (seen.has(heading)) return; // a heading may match more than one selector
      seen.add(heading);
      heading.classList.add("kt-on"); // neutralizes the inherited CSS reveal/wipe (see styles.css)
      const chars = splitHeading(heading);
      if (!chars.length) return;

      gsap.set(chars, { yPercent: 110, opacity: 0 });
      ST.create({
        trigger: heading,
        start: "top 85%",
        once: true, // play once, never reverse — calm and deliberate
        onEnter: () => gsap.to(chars, {
          yPercent: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: { each: 0.018, from: "start" },
        }),
      });
    });
  });

  ST.refresh();
})();
