---
kind: work
status: open
priority: 3
order: 630
owner: Agent (slides session)
evidence: "v2.21.2 build, 10.11.2026: the chart bar tile on /catalog/print/ sampled every 100 ms in Chrome for Testing 156, headless, reported in docs/agent-work/2026-11-10-engine-queue.md, section 4"
---

# A growing plot framed on the print page waits seconds before it draws

Find the print-page stall's cause with a one-factor control and fix it where it reaches a deck.

Before v2.21.3 the bar tile's plot grew in: on the print page it drew no bar for 2.4 to 6 s and
then appeared whole in one step. The same story page grows in 0.4 s alone, framed on an empty
page at full or quarter scale, and framed off-screen and scrolled in. Removing every other frame
of the print page left the stall. Animation frames ran at 60 per second inside the tile. With
`prefers-reduced-motion: reduce` the bars draw at once. The cause is not yet explained.

Since v2.21.3 a tile opens its slide revealed and the plot draws without growing, so the print
page no longer shows the stall. To reproduce it, frame `/stories/Types/chart-slide/bar/` on the
print page with `?revealed` stripped, or check out v2.21.2. Done when a control that changes one
factor of the print page shows the cause, and the cause is fixed where it can reach a deck.
