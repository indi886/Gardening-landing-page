# Images

Every image slot has an attractive **gradient fallback**, so the page (and all
its motion) looks finished even before you add real photos. Drop files in with
these exact names to replace the fallbacks:

| File | Where it appears | Notes |
|------|------------------|-------|
| `hero.jpg` | Hero background (Ken Burns zoom) | landscape, ≥1920×1080, subject on the right |
| `work-1.jpg` | Gallery — large "Hillside Retreat" (front of stack) | your best shot |
| `work-2.jpg`, `work-3.jpg` | Gallery — stack layers behind work-1 (fan out on hover) | |
| `work-4.jpg` | Gallery — "Courtyard Garden" | |
| `work-5.jpg` | Gallery — "Night Garden" | |
| `work-6.jpg` | Gallery — "Terraced Slope" | |
| `before.jpg` | Before/After slider — the "before" state | same framing as after.jpg |
| `after.jpg` | Before/After slider — the "after" state | shoot from the same spot |

> Tip: for the before/after slider, take both photos from the **same position
> and angle** so the reveal lines up convincingly.

---

## Hero image

Drop your hero photo here as **`hero.jpg`** (this exact path: `assets/hero.jpg`).

- The hero `<img>` in `index.html` points at `assets/hero.jpg`.
- Until a file exists, the hero gracefully falls back to a **sunlit-green
  gradient** — so the page never looks broken.
- Animated flying leaves render *on top* of whatever is behind them, so motion
  works with or without the photo.

## Recommended

- **Aspect / size:** landscape, at least **1920×1080**; ideally **2400px** wide
  for sharpness on large screens. `object-fit: cover` crops to fit.
- **Subject placement:** keep the gardener / focal subject on the **right half**
  — the headline sits on the left over a soft white scrim.
- **Format:** `.jpg` (smaller). If you prefer `.png`/`.webp`, update the
  `src="assets/hero.jpg"` attribute in `index.html` to match.

## How to add it from your phone / browser

1. Go to the repo on github.com → open the `assets/` folder.
2. **Add file → Upload files**, drag in your image, rename it to `hero.jpg`.
3. Commit to the `claude/aether-gardening-landing-F6Gaa` branch.

> ⚠️ Only use images you have the rights to (your own photos or properly
> licensed stock). Don't upload an image you found online without permission.
