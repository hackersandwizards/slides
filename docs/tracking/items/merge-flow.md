---
kind: decision
status: assumed
priority: 3
order: 1004
area: slides
owner: Benedikt
options:
  - key: merge
    label: Merge into flow
    detail: evolution and pipeline become options of flow.
    score: 7.62
    noise: 0.48
  - key: keep
    label: Leave it
    detail: All three stay.
    score: 6.94
    noise: 0.48
recommended: merge
assumption: "Blind review 02.11. (brv): merge pipeline into flow, 7.62 against 6.94, lead +0.69 above noise 0.48 in both runs and both models. evolution already renders through process since slides v0.19.0, so only pipeline was open."
images:
  merge:
    - src: merged.jpg
      caption: "Real deck slide with the pipeline as flow"
  keep:
    - src: today.jpg
      caption: "The same slide with the pipeline block today"
---

# Should evolution and pipeline merge into flow?

Three linear processes: flow (17 deck slides), evolution (24, stages with multiplier and badge), pipeline (37, stages with status, logos, loops and frame). Since slides v0.19.0 (d01f274) evolution renders through `process` (`evolutionAsProcess`), pixel-identical on 40 deck slides, so that half of the question is settled; the review below covers pipeline into flow. flow would gain a badge per step and an optional frame. process (circle, score 7.75), lanes and layers stay as shapes of their own. Applies only after a tie in the blind panel. Phase 4 converts 61 slides. Report, group 3.

## Blind review 02.11.

Panel: three personas from the audience (workshop participant at 1000 px, presenting trainer at 1280 px, brand designer at 1920 px), Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each, 12 scores per image. Criteria fixed before the first score: glance, clarity, legibility, breathing, calm, brand, human, overall, 0 to 10. Each slide in two renderings of the same content, today's type and the merge target, letters and order shuffled per reviewer, file names neutral hashes. Real deck slides from trainer-hub and talks decks, rendered hydrated at 1920 x 1080 (scratch copy of the engine at v0.26.1). Noise: mean distance between run 1 and run 2 of the same reviewer per image. Rule from this item: the merge holds where the target scores at least level (inside the noise or ahead).

| Deck slide                               |         pipeline today |                   flow |
| ---------------------------------------- | ---------------------: | ---------------------: |
| seven stages, first new                  |                   7.42 |                   7.42 |
| four stages in a container               |                   7.25 |                   7.83 |
| seven stages with inner loops, three new |                   6.17 |                   7.92 |
| five stages with inner loops             |                   6.92 |                   7.33 |
| **mean** (Claude / Codex)                | **6.94** (6.29 / 7.58) | **7.62** (7.42 / 7.83) |

Lead +0.69 at noise 0.48, +0.54 in run 1 and +0.83 in run 2, ahead with both models: the merge holds. Built from today's `flow` without new fields: one highlighted step (the first `new` one), no container frame, no logos, no inner loops (flow only draws a loop from the last step back to the first, so none was drawn). Slides that depend on the container's logos and side notes (`workshop-factory-dev` 10, `talk-factory-exec` 18) were not panelled; they need the planned optional frame.

Reviewer prompt: the same as quoted in full in `merge-cards`, with this item's images.
