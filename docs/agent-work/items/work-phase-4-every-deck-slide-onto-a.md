---
kind: work
status: open
priority: 2
order: 450
owner: "Agent per repo (talks, trainer-hub, hycle-private)"
evidence: waits on phases 2 and 3
---

# Phase 4: every deck slide onto a catalogue entry

Phase 4: every deck slide onto a catalogue entry, a codemod per repo (row `catalogue-migration-scope`): 56 exercise slides, 13 agenda tables and 6 agenda timelines, 8 `background` overrides, `accentColor` on 21 slides and `dotColor` on 1, `slides-density` green, and since v1.1.0: `deep-dive-divider` to `transition` with `night: true` (2 in trainer-hub), a lone neutral two-column content slide to comparison `split`, closing contact slides to `claim` (each listed under "Replaced forms" on the print page), and since v1.20.0 `showLoops` and stage `logo` dropped from pipelines, which no longer draw them

Measured 07.11.2026 on slides v1.23.2 (talks, trainer-hub) and v1.23.1 (hycle-private), every
registered deck but the specimen, each slide through `replacedBy` and the `deprecated` list of
the engine: `background`, `accentColor`, `dotColor` and a `claim` language appear on no slide
(the counts above are older). Replaced forms: talks 115 in 9 of 15 decks, trainer-hub 173 in 25
of 47 decks (14 of them slide-master's on purpose), hycle-private 1. Alias types among them:
talks 22 (`evolution` 17, `media` 5), trainer-hub 80 (`media` 39, `overview` 29, `evolution` 7,
`guidance` 2, `deep-dive-divider` 2, `dual-pill-overview` 1), hycle-private none.
