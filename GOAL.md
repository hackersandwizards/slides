# Goal

Offene Arbeit am Slide-Katalog der Engine. Was eine Entscheidung braucht, steht als Zeile in
`docs/tracking/decisions/items.js`. Erledigtes fliegt hier raus.

## Ziel

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

Annahme (Agent, 01.11.2026, nicht Benedikts Worte):

- Jede Kommunikationsaufgabe, die ein Deck heute braucht, hat einen Katalogeintrag (Vollbild und
  Datendiagramme erst bei Bedarf), Duplikate sind nach den
  `merge-*`-Zeilen zusammengelegt, jeder Eintrag liegt im Blind-Panel auf seinem Plateau und hält
  den Design Guide.
- Die Specimen-Seite zeigt jeden Typ, Block und jede Variante, geordnet nach
  `catalogue-grouping`, mit Suche.
- Jede Folie in talks, trainer-hub und hycle nutzt einen Katalogeintrag ohne Stellschraube
  daneben, und `slides-density` ist in allen drei Gates grün.

## Offene Arbeit

Stand 01.11.2026. Analyse und Plan (Phase 1):
[docs/tracking/2026-11-01-catalogue-program.md](docs/tracking/2026-11-01-catalogue-program.md).

| Punkt                                                                                                                                                                                                                                                                 | Owner                                                | Stand und Beleg                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Phase 2a: Basis-Runde über die 26 Blöcke und je Eintrag bis zu drei echte Deckfolien; die 26 Typen hat tm- bewertet (os `docs/tracking/2026-11-01-title-closing-max.md`)                                                                                              | P2 Agent (slides-Session)                            | nicht begonnen; Plan im Bericht, Abschnitt Plan                                                          |
| Phase 2b: schwächste und meistgenutzte Einträge bis zum Plateau: `statement`, `team-topology` (Zeile `team-topology-grammar`), `chart`, `wheel`, `content` mit Text                                                                                                   | P2 Agent (slides-Session)                            | nicht begonnen                                                                                           |
| Phase 2c: Duplikate zusammenlegen, je Gruppe nach ihrer Zeile (`merge-cards`, `merge-comparison`, `merge-flow`, `merge-phased-pills`, `merge-numbers`, `merge-content`, `merge-statement`); `merge-phased-pills` nach dd-                                             | P2 Benedikt, dann Agent                              | wartet auf die `merge-*`-Zeilen                                                                          |
| Phase 2d: neue Einträge Übung, Agenda als Zeitplan, Demo, Nächste Schritte; Sketch-Variante `image-and-grid` ins Specimen-Deck                                                                                                                                        | P2 Agent (slides-Session)                            | nicht begonnen; Lücken im Bericht, Abschnitt Lücken                                                      |
| Phase 3: Katalogseite nach `catalogue-grouping`, mit Suche und Detailansicht je Eintrag                                                                                                                                                                               | P2 Benedikt (`catalogue-grouping`), dann Agent       | wartet auf Phase 2 und die Zeile; Mockup `docs/tracking/2026-11-01-catalogue-program/katalog-mockup.jpg` |
| Phase 4: jede Deckfolie auf einen Katalogeintrag, Codemod je Repo (Zeile `catalogue-migration-scope`): 56 Übungsfolien, 13 Agenda-Tabellen und 6 Agenda-Zeitleisten, 8 `background`-Overrides, `accentColor` auf 21 und `dotColor` auf 1 Folie, `slides-density` grün | P2 Agent je Repo (talks, trainer-hub, hycle-private) | wartet auf Phase 2 und 3                                                                                 |
| trainer-hub: bei 6 Sketches (`sketch-*.png` in `image-and-grid`) fehlt `sketch: true`, sie stehen seit v0.10.0 gerahmt                                                                                                                                                | P3 Agent (trainer-hub-Session)                       | Brief für trainer-hub, nicht begonnen; Bericht, Abschnitt "Was am Katalog vorbeigeht"                    |
| trainer-hub: `background: "bg-section-growth"` auf 2 Trennerfolien, die Klasse definiert `slides.css` nicht                                                                                                                                                           | P3 Agent (trainer-hub-Session)                       | nicht begonnen; gleicher Abschnitt                                                                       |
| hycle-private/talks pinnt slides v0.8.0, talks und trainer-hub v0.10.0                                                                                                                                                                                                | P3 Agent (hycle-Session)                             | nicht begonnen                                                                                           |
