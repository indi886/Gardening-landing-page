# Premium Fencing & Landscaping

A multi-section, motion-driven landing page for a fencing & landscaping
business (Kings Park, Victoria 3021). The structure descends from the **"Aether — The New Frontier"**
template, re-skinned into a **light, sunlit-green theme** (soft green
background, warm sunlight glow, deep-green accents) with JetBrains Mono
technical labels retained from the original DNA.

No build step. No runtime dependencies. Just open `index.html`.

## Hero photo

The hero is built around a background photo at **`assets/hero.jpg`**, with
animated sunlit leaves drifting on top. Until you add that file, the hero
falls back to a sunlit-green gradient so nothing looks broken. See
[`assets/README.md`](assets/README.md) for sizing and upload steps.

## Run locally

```bash
# any static server works, e.g.
npx serve .
# or
python3 -m http.server 8080
```

Then visit the printed URL.

## What's inside

| File | Purpose |
|------|---------|
| `index.html` | Page structure & content |
| `styles.css` | Aether color DNA, layout, all transitions |
| `hero.js` | Canvas hero scene — a gardener mowing with grass clippings flying out |
| `main.js` | Scroll reveals, parallax, stagger, sticky storytelling, animated stats, interactive CTA |

## Motion features

1. **Hero motion scene** — a looping canvas animation of a gardener pushing a
   lawn mower; grass is cut as it passes and clippings spray out behind the deck.
2. **Scroll-reveal sections** — IntersectionObserver fade/rise + a word-by-word
   statement reveal tied to scroll position.
3. **Layered parallax** — multiple depth layers moving at different speeds.
4. **Stagger cards** — bento service grid animates in sequentially.
5. **Sticky storytelling** — process visual pins while the 4 steps scroll past.
6. **Floating background elements** — ambient orbs + drifting spores/leaves.
7. **Animated statistics** — counters ease up when scrolled into view.
8. **Interactive CTA** — magnetic buttons, pointer-tracking glow, live form state.

## Accessibility

Honors `prefers-reduced-motion`: the hero renders a single static frame and all
entrance/parallax/counter animations resolve to their final state.
