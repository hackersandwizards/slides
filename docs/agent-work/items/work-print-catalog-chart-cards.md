---
kind: work
status: open
priority: 3
order: 1550
owner: an agent
evidence: "/slides/catalog/print/ built at a371a37, Chromium 1600x1000: cards chart · trend and chart · bar hold 0 svg each and an empty white chart frame; control on the same page, chart · graph, holds 1 svg"
---

# The print catalog shows the bar and trend chart cards empty

On `/slides/catalog/print/` the cards `chart · trend` and `chart · bar` draw the headline, the
legend and the annotation, but the chart frame between them stays white. Measured on 08.11.2026
at `a371a37`: each card's frame holds no `svg`. The `chart · graph` card on the same page holds
one and draws its curve, so the page can draw an SVG chart. The same two slides draw in full on
their story pages, such as `/slides/stories/Types/chart-slide/trend-marked/`.

Cause not yet explained. The print page renders static markup that never hydrates (see
`work-part-frames-load-own-part`), and both variants draw through recharts' `ResponsiveContainer`,
which sizes itself in the browser. Test that with a control before fixing: a fixed width and
height on the container for the print render alone.

Done when both cards on the built print page hold their chart `svg` with data paths or bars, and a
test on the built page asserts it.
