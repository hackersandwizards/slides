---
kind: decision
status: assumed
priority: 3
order: 1005
area: slides
owner: Benedikt
options:
  - key: merge
    label: Merge into phased-pills
    detail: After dd- and after a tie in the blind panel.
    score: 6.17
    noise: 0.42
  - key: keep
    label: Leave it
    detail: All three stay; dd- and phase 2 rework each on its own.
    score: 7.68
    noise: 0.42
recommended: keep
assumption: "Blind review 02.11. (brv): keep, overturns merge. roadmap as phased-pills 6.17 against 7.68 today, lead -1.51 at noise 0.42, behind in both runs and both models. dual-pill-overview already renders through roadmap since slides v0.17.0."
images:
  merge:
    - src: merged.jpg
      caption: "A roadmap deck slide as phased-pills"
  keep:
    - src: today.jpg
      caption: "The same slide as roadmap today"
---

# Should dual-pill-overview and roadmap merge into phased-pills?

Since slides v0.17.0 (c1a3304, after Benedikt raised it, os report 2026-11-01-slide-system.md) dual-pill-overview renders through `roadmap` with `phases`, so the open part is roadmap into phased-pills. Three deck overviews, all weak in the type panel of tm-: phased-pills 5.58 (43 deck slides), dual-pill-overview 4.92 (1), roadmap 6.50 (5). dual-pill-overview is two phased-pills columns, roadmap two columns with a description. phased-pills would gain an optional second column. Waits on dd- (deep-dive look), which decides the column accents. overview stays for now and gets reworked. Report, group 4.

## Blind review 02.11.

Panel: three personas from the audience (workshop participant at 1000 px, presenting trainer at 1280 px, brand designer at 1920 px), Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each, 12 scores per image. Criteria fixed before the first score: glance, clarity, legibility, breathing, calm, brand, human, overall, 0 to 10. Each slide in two renderings of the same content, today's type and the merge target, letters and order shuffled per reviewer, file names neutral hashes. Real deck slides from trainer-hub and talks decks, rendered hydrated at 1920 x 1080 (scratch copy of the engine at v0.26.1). Noise: mean distance between run 1 and run 2 of the same reviewer per image. Rule from this item: the merge holds where the target scores at least level (inside the noise or ahead).

| Deck slide                                      |          roadmap today |           phased-pills |
| ----------------------------------------------- | ---------------------: | ---------------------: |
| two parts, ingredients and deep dive (workshop) |                   7.85 |                   6.00 |
| roadmap specimen, three items per part          |                   8.00 |                   6.50 |
| former dual-pill-overview, two phases per part  |                   7.17 |                   6.00 |
| **mean** (Claude / Codex)                       | **7.68** (7.16 / 8.22) | **6.17** (5.50 / 6.83) |

**The review overturns the provisional recommendation: keep.** phased-pills loses by 1.51 at noise 0.42, in both runs (-1.41, -1.61) and with both models. Reasons the reviewers gave: the headline shrinks to a gradient pill, the descriptions under each item are gone, the dashed frame runs close to the slide edges, a lone pill wraps onto its own row. The deep-dive accent (dd-) is settled as Night (os item `deep-dive-night`, assumed); the current accents were rendered. The optional second column the item planned would not bring back the descriptions, which carried most of the lost score.

Reviewer prompt: the same as quoted in full in `merge-cards`, with this item's images.
