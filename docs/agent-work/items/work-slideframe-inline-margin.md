---
kind: work
status: open
priority: 3
order: 640
owner: Agent (slides session)
area: software-engineering
evidence: "brand v2.13.0's card.css took SlideFrame's built style to 4105 bytes on 11.11.2026; test/pages/catalog-pages.test.ts failed; three declarations removed in 6b6e414 bring it back under Astro's 4096-byte inline limit, by about 17 bytes, estimated from the minified declarations removed"
---

# SlideFrame's style stays inline only by a few bytes

Keep the story frame's style inline on a state's page whatever brand's `card.css` grows to.

`catalog/SlideFrame.astro` imports brand's `elements/card.css` into its own `<style>`. Astro inlines
a stylesheet under 4 KB; above it every state's page waits on a stylesheet of its own before the
header's logo, the LCP element, paints. Brand v2.13.0 added a few bytes to `card.css` and took the
style to 4105 bytes. This repository's gate caught it (`check:pages`), but a consumer's catalog
that renders the exported `SlideFrame` has no such test.

Options to weigh: `build.inlineStylesheets: "always"` in `catalog/astro.config.ts` and in the
README's guidance for a consumer's catalog; moving the frame's rules into the catalog's shared
stylesheet; or importing only the card rules the frame draws. Measure the home's and a state's
first paint before and after, as the test's comment asks.
