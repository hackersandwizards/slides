# Goal

Open work on the engine's slide catalogue. Anything that needs a decision is a row in
`docs/tracking/decisions/items.js`. Finished items leave this file.

## Goal

Benedikt am 01.11.2026: «das gefällt mir gut. es fehlt noch eine variante mit gemaltem bild oder?
wir haben machnmal slides mit gemaltem bild. aber decision und gantt sehen stark aus teamtopology
könnten wir vllt noch mal überarbeiten. generell wäre es vermutlich gut mit hilfe von blind reviews
diesen slide catalog master zu optimieren. durch research und best practices und dann reviews. so
dass wir genug typen haben und das die alle auch mit unseren brand guidelines matchen. und dann
sobald wir genug typen haben reparieren wir alle implementierungen die grad davon abweichen. […]
Anstatt dass wir individuell jetzt in jedem Slide-Deck es reparieren, würde ich hier jetzt generell
dafür sorgen, dass wir die bestmöglichste Slide-Katalog, Slide-Engine hergestellt bekommen. Hier
also für jeden Fall genug Slide-Typen da haben, durch Research, welche man so braucht, Reviews und
Best-Practice-Analyse und so. Und auch grundsätzlich diese Übersicht hier perfektionieren, dass wenn
man zum Beispiel eine Slide sucht, eine bestimmte Darstellung, man sich die dann da angucken kann.
Und dann, sobald wir das optimiert haben […], dann korrigieren wir das überall in den spezifischen
Decks, dass wir dann da einfach nur noch den richtigen Typ auswählen»

Benedikt am 01.11.2026 (von Ada weitergegeben): «Wir scheinen da auch bei den Folien gerade ziemlich
viele Duplikate zu haben, also einfach Folientypen, die super ähnlich zueinander sind. Dafür
scheinen andere Folientypen vollständig zu fehlen.»

## Done means

Assumption (agent, 01.11.2026, not Benedikt's words):

- Every communication job a deck needs today has a catalogue entry (full-bleed and data charts only
  when needed), duplicates are merged according to the `merge-*` rows, every entry sits on its
  plateau in the blind panel and holds the design guide.
- The specimen page shows every type, block and variant, ordered by `catalogue-grouping`, with
  search.
- Every slide in talks, trainer-hub and hycle uses a catalogue entry with no adjustment beside it,
  and `slides-density` is green in all three gates.

## Open work

As of 01.11.2026. Analysis, plan and results of phases 2 and 2b:
[docs/tracking/2026-11-01-catalogue-program.md](docs/tracking/2026-11-01-catalogue-program.md).

| Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Owner                                                 | Status and evidence                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Phase 2b, rest: `content` with text (386 text-only slides), then the weakest blocks of the base round: `paragraph` 6.21, `two-column` 6.29, `pipeline` 6.33 (`video`, `image`, `linked-image` at 8.50, 7.74 and 7.35 since v0.14.0)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | P2 Agent (slides session)                             | base round in the report, section Phase 2; video and image in section Phase 2b                       |
| Phase 2c: merge duplicates, each group by its row (`merge-cards`, `merge-comparison`, `merge-flow`, `merge-phased-pills`, `merge-numbers`, `merge-content`, `merge-statement`); `merge-phased-pills` after dd-                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | P2 Benedikt, then Agent                               | waits on the `merge-*` rows                                                                          |
| Phase 2e (v0.18.0 shipped `activity` for exercise, demo and debrief, `agenda` with `when` for schedules and next steps, `evolution` into `process` and `dual-pill-overview` into `roadmap` as aliases): the merges of the overlap matrix still open: `deep-dive-divider` into `transition`, `regular` into `content`, `overview` into `phased-pills`, `grid` stats into `numbers`, chart `bar` into `bars`, comparison into `two-column` and `transform`, `media` into a gallery block; then the component layer (`DisplayHeadline`, `Kicker`, `Takeaway`, `SlideCard` tones, `Chip`, `NumberTile`, `Connector`, `Avatar`, `Quote`, one `MediaFrame` and video player) and the specimen page's Parts section | P2 Agent (slides session)                             | os `docs/tracking/2026-11-01-slide-system.md`                                                        |
| Phase 3: catalogue page ordered by `catalogue-grouping`, with search and a detail view per entry                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | P2 Benedikt (`catalogue-grouping`), then Agent        | waits on phase 2 and the row; mockup `docs/tracking/2026-11-01-catalogue-program/katalog-mockup.jpg` |
| Phase 4: every deck slide onto a catalogue entry, a codemod per repo (row `catalogue-migration-scope`): 56 exercise slides, 13 agenda tables and 6 agenda timelines, 8 `background` overrides, `accentColor` on 21 slides and `dotColor` on 1, `slides-density` green                                                                                                                                                                                                                                                                                                                                                                                                                                        | P2 Agent per repo (talks, trainer-hub, hycle-private) | waits on phases 2 and 3                                                                              |
| Performance from the trainer-hub measurement (trainer-hub `docs/tracking/2026-11-01-performance.md`): the first slide after load shows without the reveal animation, later slides keep it (Benedikt 01.11.: „Erste ohne Animation“); `code-highlight` lazy in `ContentSlide`, `LanesSlide`, `Visuals` like `ChartPlots`; lucide icons imported one by one                                                                                                                                                                                                                                                                                                                                                    | P2 Agent (slides session)                             | after the three-layer restructuring lands                                                            |
