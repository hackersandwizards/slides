---
kind: decision
status: assumed
evidence: "slides 5ee9d7a (v0.26.2, leading words), 2244788 (released v0.27.0)"
priority: 2
order: 1006
area: slides
owner: Benedikt
options:
  - key: merge
    label: Merge into numbers
    detail: grid stats goes.
    score: 7.65
    noise: 0.41
  - key: keep
    label: Leave it
    detail: Both number shapes stay.
    score: 7.21
    noise: 0.41
recommended: merge
assumption: "Blind review 02.11. (brv): merge, once numbers wraps after four figures and sizes a figure with leading words correctly: round 2 numbers 7.65 against grid stats 7.21, lead +0.44 at noise 0.41, level to ahead. Round 1 with today's numbers lost (5.97 vs 7.69)."
images:
  merge:
    - src: merged.jpg
      caption: "Round 2: a grid stats deck slide as numbers"
  keep:
    - src: today.jpg
      caption: "The same slide as grid stats today"
---

# Should grid stats merge into numbers?

Two number shapes: numbers (9 deck slides; value, label, source) and grid stats (7; the same values in cards with icon and description, without a source). Applies only after a tie in the blind panel. Report, group 5.

## Blind review 02.11.

Panel: three personas from the audience (workshop participant at 1000 px, presenting trainer at 1280 px, brand designer at 1920 px), Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each, 12 scores per image. Criteria fixed before the first score: glance, clarity, legibility, breathing, calm, brand, human, overall, 0 to 10. Each slide in two renderings of the same content, today's type and the merge target, letters and order shuffled per reviewer, file names neutral hashes. Real deck slides from trainer-hub and talks decks, rendered hydrated at 1920 x 1080 (scratch copy of the engine at v0.26.1). Noise: mean distance between run 1 and run 2 of the same reviewer per image. Rule from this item: the merge holds where the target scores at least level (inside the noise or ahead). Two rounds. Round 1 as above; round 2 fixed the cause the reviewers named for the target, rebuilt only the target, and scored it again against today's unchanged slides with the same panel.

| Deck slide                                       |              grid stats today | numbers, round 1 |       numbers, round 2 |
| ------------------------------------------------ | ----------------------------: | ---------------: | ---------------------: |
| six factory figures                              |                   7.67 / 6.83 |             6.00 |                   7.73 |
| four case-study figures                          |                   7.58 / 7.36 |             8.67 |                   8.50 |
| four figures with descriptions and a source line |                   7.83 / 7.43 |             3.25 |                   6.71 |
| **mean** (Claude / Codex)                        | 7.69 / **7.21** (6.56 / 7.86) |             5.97 | **7.65** (7.06 / 8.24) |

Today's column gives round 1 / round 2. Round 1: lead -1.72. Two causes. Six figures stood in six narrow columns. And "up to +70%" ran off the slide edge: `Figure` sets only "up" small (lazy match `^([a-z][a-z\s]*?)\s+`), while the size calculation in `Numbers` strips all of "up to " before measuring. That is a defect of today's numbers block, independent of the merge. Round 2 wraps after four figures (three columns), sets every leading word small and counts it at half width. Lead +0.44 at noise 0.41, +0.11 and +0.77 per run: level to ahead, so the merge holds. Still lost: the slide whose cards carried a description under each figure (7.43 to 6.71), since numbers has no description line.

Reviewer prompt: the same as quoted in full in `merge-cards`, with this item's images.
