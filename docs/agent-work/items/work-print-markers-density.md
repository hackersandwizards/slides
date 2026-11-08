---
kind: work
status: open
priority: 2
order: 300
owner: Ada
evidence: "brand-markers v1.42.0: engine frames.html 0 of 212 and story pages 0 of 532 at width 1280; story pages 4 of 532 at width 1920; talks' specimen print route 28 of 344"
---

# List markers on slides the fit guard shrinks

`check:markers` now holds the engine's print frames and story pages at width 1280, where no slide
shrinks. It does not hold what remains: at width 1920 `content-slide/density` (fit scale 0.91) fails
with 4 of 532 readings off by 0.25 to 0.28 px, and talks' specimen print route with 28 of 344 off by
up to 0.72 px, always on a `.hw-marker` element.

Measured: `scale` on `.slide-body` is a factor: `frames.html` reads 0 of 53 off at scale 1 and up to
10 of 53 at 2x (max 0.31 px) with only `scale` added, 0 at 4x (max 0.16). Removing `scale` on talks'
specimen print page takes the 2x readings from 8 to 1. The readings above that on talks' page, up
to 0.72 px at 2x and 0.60 px at 4x, are not yet explained: `scale` alone does not produce them.

Tried and without effect, or worse, each with brand-markers: `zoom` instead of `scale` (23 of 86),
`will-change` on marker, text or body, an identity transform on the text, all of the lift in the
transform, an unrounded lift, a whole-pixel line height, `text-rendering: geometricPrecision`.

Next: find what adds the rest on the print route (its 1920 layout in a 1280 window and the fit
guard's wider layout are untested), then decide whether brand's whole-pixel marker needs a scaled
form. Raise `check:markers` to width 1920 once it passes.

Then drop the marker case of `test/pages/marker-position.test.ts` (it measures the same frames at 1920) and keep its other cases.
