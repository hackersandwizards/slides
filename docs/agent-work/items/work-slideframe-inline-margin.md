---
kind: work
status: open
priority: 3
order: 1966
owner: Poppy
area: software-engineering
evidence: "Checked 13.11.: SlideFrame.astro:110-113 still imports card.css is:global and catalog/astro.config.ts sets no inlineStylesheets; the byte margin not re-measured. Measurements: docs/agent-work/2026-11-11-performance.md. Internal."
---

# Keep SlideFrame's style inline whatever brand's card.css grows to

Keep the story frame's style inline on a state's page whatever brand's `card.css` grows to.

`catalog/SlideFrame.astro` imports brand's `elements/card.css` unscoped (`<style is:global>`) and
its own rules scoped. Astro inlines a stylesheet under 4 KB; above it every state's page waits on a
stylesheet of its own before the header's logo, the LCP element, paints. The unscoped import bought
about 480 bytes, not a guarantee. This repository's gate catches a crossing (`check:pages`), but a
consumer's catalog that renders the exported `SlideFrame` has no such test.

Options to weigh: `build.inlineStylesheets: "always"` in `catalog/astro.config.ts` and in
`docs/setup.md`'s guidance for a consumer's catalog; moving the frame's rules into the catalog's
shared stylesheet; or importing only the card rules the frame draws. Measure the home's and a
state's first paint before and after.
