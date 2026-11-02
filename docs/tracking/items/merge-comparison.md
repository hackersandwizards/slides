---
kind: decision
status: assumed
evidence: "slides 1232724 (released v0.27.0)"
priority: 2
order: 1003
area: slides
owner: Benedikt
options:
  - key: merge
    label: Merge into comparison
    detail: transform becomes before-after; guidance and positions become variants of their own.
    score: 7.94
    noise: 0.42
  - key: keep
    label: Leave it
    detail: All four stay.
    score: 7.29
    noise: 0.42
recommended: merge
assumption: "Blind review 02.11. (brv): merge, if before-after gets an option without strike-through: round 2 comparison 7.94 against transform 7.29, lead +0.64 above noise 0.42, both models. Round 1 with today's strike-through lost (6.81 vs 7.69)."
images:
  merge:
    - src: merged.jpg
      caption: "Round 2: a transform deck slide as comparison before-after without strike-through"
    - src: merged-round-1.jpg
      caption: "Round 1: the same with today's before-after, which strikes the before side"
  keep:
    - src: today.jpg
      caption: "The same slide with the transform block today"
---

# Should transform, guidance and positions become variants of comparison?

Four full-page comparisons: comparison (21 deck slides), transform (6, before and after, the same as comparison before-after), guidance (2, bad and good, score 6.50), positions (1, two stances and a resolution). The two-column block (105) stays, because it shares the slide with other blocks. Applies only after a tie in the blind panel. Report, group 2.

## Blind review 02.11.

Panel: three personas from the audience (workshop participant at 1000 px, presenting trainer at 1280 px, brand designer at 1920 px), Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each, 12 scores per image. Criteria fixed before the first score: glance, clarity, legibility, breathing, calm, brand, human, overall, 0 to 10. Each slide in two renderings of the same content, today's type and the merge target, letters and order shuffled per reviewer, file names neutral hashes. Real deck slides from trainer-hub and talks decks, rendered hydrated at 1920 x 1080 (scratch copy of the engine at v0.26.1). Noise: mean distance between run 1 and run 2 of the same reviewer per image. Rule from this item: the merge holds where the target scores at least level (inside the noise or ahead). Two rounds. Round 1 as above; round 2 fixed the cause the reviewers named for the target, rebuilt only the target, and scored it again against today's unchanged slides with the same panel. Panelled: the transform block (7 deck slides) into before-after. guidance and positions become variants of their own that keep their drawing, so a merge changes their code, not their look; they were not panelled.

| Deck slide                        |               transform today | before-after, round 1 | before-after without strike, round 2 |
| --------------------------------- | ----------------------------: | --------------------: | -----------------------------------: |
| the trap and the shift (workshop) |                   7.75 / 7.33 |                  7.58 |                                 7.81 |
| what stays, what needs building   |                   7.92 / 7.16 |                  5.08 |                                 8.05 |
| prompts to context                |                   7.42 / 7.38 |                  7.75 |                                 7.95 |
| **mean** (Claude / Codex)         | 7.69 / **7.29** (6.72 / 7.86) |                  6.81 |               **7.94** (7.56 / 8.32) |

Today's column gives round 1 / round 2. Round 1: lead -0.89 at noise 0.28. Every reviewer read the struck-through before side as "dropped", which contradicts a heading like "Stays from stage 3". Round 2 adds `strike: false` to before-after (no line-through, no cross icon) and leads by +0.64 at noise 0.42, +0.61 and +0.68 per run, ahead with both models. The merge holds with that option; without it, it does not.

Reviewer prompt: the same as quoted in full in `merge-cards`, with this item's images.
