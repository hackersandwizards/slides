---
kind: decision
status: assumed
priority: 2
order: 350
area: slides
owner: Benedikt
options:
  - key: job
    label: By communication job
    detail: "13 jobs such as compare, process, schedule, data, exercise. An entry may sit under two jobs. Search also finds every type name."
    score: 8.5
    noise: 0.22
  - key: shape
    label: By shape
    detail: "Text, cards, diagram, data, image, code, scaffold. Closer to the engine, further from the question you have while building."
    score: 6.58
    noise: 0.22
  - key: alpha
    label: "Alphabetical by type, with search"
    detail: "As today, but with every block, every variant and a search."
    score: 4.92
    noise: 0.22
recommended: job
assumption: "Blind review 02.11. (brv): job, 8.50 against 6.58 by shape and 4.92 alphabetical, noise 0.22, ahead in both runs and with both models; measured task runs 9.4 against 13.9 and 17.1 labels and tiles read per task."
images:
  job:
    - src: job.jpg
      caption: "By communication job, after clicking Compare"
  shape:
    - src: shape.jpg
      caption: "By shape, after clicking Cards"
  alpha:
    - src: alpha.jpg
      caption: "Alphabetical, top of the list"
---

# How should the catalogue page order slides, so you can find a slide for X?

Today the specimen page shows 26 tiles, the first slide of each type, with no description, only two of the 26 blocks and no variants. Phase 3 rebuilds it, with search and a detail view per entry (when to use, variants, do and don't, number of deck slides). Still open is the order in the left column. Mockup and reasoning: docs/tracking/2026-11-01-catalogue-program.md, section Katalogseite (catalogue page).

## Blind review 02.11.

Three mockups built from one template with the specimen deck's fictional slides as tiles: the same entries, the same search field, only the left column differs. Each shows the page after the reader clicked one group (job: Compare, shape: Cards, alphabetical: the top of the list). The job mockup is a new build in English, not the German mockup of 01.11.

Panel: three personas (trainer who builds decks weekly, consultant who builds a pitch deck once or twice a month, brand designer who maintains the catalogue), all at 1600 px, Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each, 12 scores per version. Criteria fixed before the first score: findability, grouping, scan, breathing, calm, brand, overall, 0 to 10. Order and letters shuffled per reviewer, file names neutral hashes.

Measured task runs, given to every reviewer: labels and tiles a reader passes top to bottom before the right entry (a model of the page structure, not timed people), plus clicks in the left column; a wrong first group costs its labels and tiles. Search is the same in all three and not counted.

| Task                                    |     job |         shape | alphabetical |
| --------------------------------------- | ------: | ------------: | -----------: |
| compare two ways of working             |       7 | 16 (2 clicks) |           10 |
| workshop exercise with timebox          |      15 | 23 (2 clicks) |            1 |
| timetable of a workshop day             |       8 | 26 (2 clicks) |            2 |
| three key figures with a source         |       9 |             5 |           28 |
| how the teams of an organisation relate |      11 |            14 |           40 |
| four points as cards side by side       |       8 |             5 |            6 |
| stages drawn as a circle                |       8 |             8 |           33 |
| **mean**                                | **9.4** |      **13.9** |     **17.1** |

| Version              |  overall | findability | grouping | Claude | Codex |
| -------------------- | -------: | ----------: | -------: | -----: | ----: |
| by communication job | **8.50** |        8.67 |     8.08 |   8.17 |  8.83 |
| by shape             |     6.58 |        6.25 |     5.75 |   6.00 |  7.17 |
| alphabetical         |     4.92 |        4.58 |     4.00 |   3.83 |  6.00 |

Noise 0.22; job leads shape by 1.92 in both runs (8.58 against 6.50, 8.42 against 6.67) and with both models: the recommendation holds. What keeps job below 10, in most runs: Orient, Explain and One statement overlap, and the exercise sits apart from Schedule and plan (15 reads). Shape loses on the tasks a reader brings as a purpose (agenda, exercise, comparison); alphabetical needs the type name.

A first run of this panel worded the goal as finding a slide "for a purpose" and findability as "without knowing type names", which favours the job grouping. It was discarded and rerun with neutral wording and two look-based tasks added (cards, circle); the order stayed the same (job 8.33, shape 5.75, alphabetical 4.92 in the discarded run).

One reviewer prompt, verbatim (trainer, Claude, run 1; image paths shortened):

```text
You are a trainer of hackers&wizards who builds workshop decks in code and opens the slide catalogue several times a week to find the right slide type for what you want to show. You look at the catalogue page on a 1600 pixel wide laptop screen, the size of the images below.

The medium: the catalogue page of the hackers&wizards slide engine, a web page that shows every slide type, content block and variant as a tile, with a search field on top. Its job: someone who needs a slide finds the right entry fast. Below are three versions of the page. They show the same entries and the same search field and differ only in how the left column orders the entries; each image shows the page after the reader clicked one entry of the left column.

A: …/0071837f47.png
B: …/7bbc64177d.png
C: …/f6197ae591.png

Measured task runs (modelled from the page structure, the same seven tasks for every version; 'read' counts the labels and tiles a reader passes, top to bottom, before reaching the right entry, 'clicks' the clicks in the left column; a reader who picks the wrong group first pays its labels and tiles too). Tasks: compare two ways of working; a workshop exercise with timebox; the timetable of a workshop day; three key figures with a source; how the teams of an organisation relate; four points as cards side by side; stages drawn as a circle. The search field works the same in all three versions and is not counted.
A: 9.4 read and 1.0 clicks per task on average (per task: 7, 15, 8, 9, 11, 8, 8)
B: 13.9 read and 1.4 clicks per task on average (per task: 16, 23, 26, 5, 14, 5, 8)
C: 17.1 read and 0.0 clicks per task on average (per task: 10, 1, 2, 28, 40, 6, 33)

Criteria, each scored 0 to 10 for your role: findability (you reach the slide you need fast), grouping (the left column's labels are understood without explanation and each entry sits where you would look for it), scan (the page reads top to bottom without hunting), breathing (room, not cramped), calm (nothing competes for attention), brand (fits the hackers&wizards brand: off-white ground, dark ink, teal and purple accents, JetBrains Mono headings, Inter text, the brand corner), overall.

For each version answer with one JSON object on its own line: {"letter":"A","findability":0,"grouping":0,"scan":0,"breathing":0,"calm":0,"brand":0,"overall":0,"below10":"what keeps overall below 10, concrete"}. Then one line {"best":"A","decided":"the one difference that decided it"}.
Answer with JSON objects only, one per line, nothing else.
```
