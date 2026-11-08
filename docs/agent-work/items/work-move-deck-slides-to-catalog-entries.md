---
kind: work
status: open
priority: 2
order: 730
owner: "Agent per repo (talks, trainer-hub, hycle-private)"
evidence: "measured 07.11.2026 on slides v1.23.2 (talks, trainer-hub) and v1.23.1 (hycle-private), commit 24b1c3a"
---

# Move every deck slide onto a catalog entry

Phase 4 of the slide catalog program: in each consumer, a codemod moves every slide that still
uses a replaced form onto the type that draws it, then `slides-density` stays green in that
repo's gate. Scope: every deck, delivered client decks included; PDFs already sent stay as they are. Starts once
`work-catalog-entry-guidance` is done, so the codemods target the final entries.

Replaced forms, each slide read through the engine's `replacedBy` and `deprecated` list on
07.11.2026, every registered deck but the specimen:

| Repo          | Slides in replaced forms | Decks    | Alias types among them                                                                                     |
| ------------- | -----------------------: | -------- | ---------------------------------------------------------------------------------------------------------- |
| talks         |                      115 | 9 of 15  | 22 (`evolution` 17, `media` 5)                                                                             |
| trainer-hub   |                      173 | 25 of 47 | 80 (`media` 39, `overview` 29, `evolution` 7, `guidance` 2, `deep-dive-divider` 2, `dual-pill-overview` 1) |
| hycle-private |                        1 | n/a      | none                                                                                                       |

14 of trainer-hub's are `slide-master`'s, which shows the replaced forms on purpose. The print
page lists each form under "Replaced forms" with its target. `background`, `accentColor`,
`dotColor` and a `claim` language appear on no deck slide any more.

Done when each consumer's decks hold no replaced form outside `slide-master`, and its gate is green.
