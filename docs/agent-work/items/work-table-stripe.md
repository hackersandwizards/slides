---
kind: work
status: open
priority: 3
order: 1967
owner: Ada
area: brand
evidence: "brand v2.15.0 elements/table.css: hairlines under every row, no fill, no frame; components/slides/ContentSlide.tsx tints every second body row and the head row bg-primary/7, inside a framed white box; the stripe came over unchanged with the engine in bd66c48 (30.10.2026), and no panel of 01.11. or 06.11. chose it"
---

# The slide table stripes alternate rows where brand's table does not

Ada briefs a slides session to score a table slide with and without stripes blind, then ship the winner.

Brand's table (`hw-table`) draws hairlines under each row, no fill and no frame. The slide table
is an exception in `brand-elements.json` (`slide-table`: projected rows at stage size with the
slide's own column heads), and on top of what that reason names it tints the head row, every
second body row and the hovered row, and sits in a framed white box. The stripes came with the
engine's first commit; no review chose them.

Why it waits: dropping them changes every table slide in talks, trainer-hub and hycle-private
(227 table slides on 01.11.2026), so it needs a blind review per `blind-review` first. Readers on
a projector or a 720p stream may track a row by its tint where a hairline is too faint; that is
the case to test.

Done when the panel (the specimen's table slides, the stripes against hairlines only, at least
two personas who read slides in a lit room or a stream, Claude and Codex) has a result beyond its
noise, and either a release drops the stripes and the `slide-table` exception's reason says what
remains, or the exception's reason names the stripes and the panel. `lib/markdown.tsx` sets inline
code in `text-teal-dark` for contrast on a striped row; recheck that line if they go.
