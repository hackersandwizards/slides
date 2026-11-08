---
kind: work
status: open
priority: 3
owner: Ada
---

# The "Open full screen" link under each slide story

`catalog/SlideFrame.astro` draws an "Open full screen" link under every slide story, beside the
story bar's "Open this state alone". Remove it where both open the same page; where it does more,
brief scaffolding for an extra tool in the bar. Also: `scripts/density.ts` and
`scripts/render-pdf.ts` start Chrome without `--password-store=basic`.
