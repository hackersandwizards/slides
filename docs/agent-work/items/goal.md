---
kind: goal
status: open
area: software-engineering
---

# Goal

Open work on the engine's slide catalog: the `work-*` and `decide-*` items beside this file.

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

Done means, an assumption (agent, 01.11.2026, not Benedikt's words):

- Every communication job a deck needs today has a catalogue entry (full-bleed and data charts only
  when needed), duplicates are merged (the merge groups shipped in v0.27.0), every entry sits on its
  plateau in the blind panel and holds the design guide.
- The specimen page shows every type, block and variant, ordered by communication job (since
  v0.27.0), with search.
- Every slide in talks, trainer-hub and hycle uses a catalogue entry with no adjustment beside it,
  and `slides-density` is green in all three gates.

Analysis and the results of phases 2 and 2b:
[docs/agent-work/2026-11-01-catalog-program.md](../2026-11-01-catalog-program.md); the later panel
rounds: [docs/agent-work/2026-11-06-review-round.md](../2026-11-06-review-round.md).
