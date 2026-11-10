---
kind: work
status: open
priority: 3
order: 630
owner: Agent (slides session)
evidence: "font-state, arrival-order and slow-4G controls in a Debian Chromium 156 container with Android's Roboto on 10.11.2026, `docs/agent-work/2026-11-09-font-swap-cls.md`, section 'Cause of the Roboto shift'"
---

# The bold run's re-wrap on Roboto while Inter 700 is still loading

On a device whose sans fallback is Android's Roboto, a paragraph with a bold run can break one more
line while Inter 400 has arrived and Inter 700 has not, under brand's `text-wrap: pretty`. With the
preload every run of the prose story at 412 px shows it, 37 px, about 260 ms after first paint, and
the Layout Instability API reports no entry for it.

Blocked on brand's answer to the brief on `pretty` for running text. If brand changes the rule,
measure the prose story again and delete this item. If brand keeps it, add Inter 700 to `FACES` in
`components/slides/SlideContainer.tsx` (measured: no bold run on two lines in 30 of 30 runs, 124 ms
of first paint on slow 4G), release, and delete this item. Done when the prose story at 412 px on
Roboto shows the bold run on one line at every frame.
