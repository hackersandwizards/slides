---
kind: work
status: open
priority: 3
order: 1966
owner: Ada
area: software-engineering
evidence: "brand v2.15.0's card.css (var(--white-wash) where lightningcss wrote #ffffff12) took SlideFrame's scoped style to 4108 bytes on 11.11.2026 and test/pages/catalog-pages.test.ts failed; with card.css imported unscoped the frame's chunk measures 3610 bytes (4093 before the raise, both read off the built dashboard page's inline style)"
---

# SlideFrame's style stays inline by about 480 bytes

Keep the story frame's style inline on a state's page whatever brand's `card.css` grows to.

`catalog/SlideFrame.astro` imports brand's `elements/card.css` unscoped (`<style is:global>`) and
its own rules scoped. Astro inlines a stylesheet under 4 KB; above it every state's page waits on a
stylesheet of its own before the header's logo, the LCP element, paints. The unscoped import bought
about 480 bytes, not a guarantee. This repository's gate catches a crossing (`check:pages`), but a
consumer's catalog that renders the exported `SlideFrame` has no such test.

Options to weigh: `build.inlineStylesheets: "always"` in `catalog/astro.config.ts` and in the
README's guidance for a consumer's catalog; moving the frame's rules into the catalog's shared
stylesheet; or importing only the card rules the frame draws. Measure the home's and a state's
first paint before and after, as the test's comment asks.
