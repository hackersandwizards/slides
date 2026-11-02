---
kind: decision
status: assumed
evidence: "slides a7f65fa (released v0.27.0)"
priority: 2
order: 1008
area: slides
owner: Benedikt
options:
  - key: merge
    label: Merge into statement
    detail: layout centered goes.
    score: 6.72
    noise: 0.66
  - key: keep
    label: Leave it
    detail: Both stay.
    score: 6.43
    noise: 0.66
recommended: merge
assumption: "Blind review 02.11. (brv): merge, level: round 2 statement 6.72 against content centered 6.43, lead +0.29 inside noise 0.66, so a tie, which goes to fewer types. The two linked-image slides still score about 0.7 lower as statement."
images:
  merge:
    - src: merged.jpg
      caption: "Round 2: a centered content slide as statement"
  keep:
    - src: today.jpg
      caption: "The same slide as content centered today"
---

# Should content centered merge into statement?

Two shapes for a single statement: statement (96 deck slides, score 5.75) and content with layout centered (7). Four of the seven centered slides carry a linked QR code, so statement gets a linked image; the one positions slide goes with merge-comparison, and the one terminal slide stays content without centring. statement gets reworked in phase 2 anyway: the reviewers faulted the glow behind the content and the struck-through word. Applies only after a tie in the blind panel. Report, group 7.

## Blind review 02.11.

Panel: three personas from the audience (workshop participant at 1000 px, presenting trainer at 1280 px, brand designer at 1920 px), Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each, 12 scores per image. Criteria fixed before the first score: glance, clarity, legibility, breathing, calm, brand, human, overall, 0 to 10. Each slide in two renderings of the same content, today's type and the merge target, letters and order shuffled per reviewer, file names neutral hashes. Real deck slides from trainer-hub and talks decks, rendered hydrated at 1920 x 1080 (scratch copy of the engine at v0.26.1). Noise: mean distance between run 1 and run 2 of the same reviewer per image. Rule from this item: the merge holds where the target scores at least level (inside the noise or ahead). Two rounds. Round 1 as above; round 2 fixed the cause the reviewers named for the target, rebuilt only the target, and scored it again against today's unchanged slides with the same panel. statement got the linked image this item plans, built on a scratch copy.

| Deck slide                                              |        content centered today | statement, round 1 |     statement, round 2 |
| ------------------------------------------------------- | ----------------------------: | -----------------: | ---------------------: |
| live-demo outcome, linked pull request screenshot       |                   6.67 / 6.56 |               5.83 |                   5.83 |
| callback to the same screenshot                         |                   6.33 / 6.65 |               6.08 |                   5.92 |
| centered hero with subtitle and callout (specimen deck) |                   6.08 / 6.09 |               8.58 |                   8.41 |
| **mean** (Claude / Codex)                               | 6.36 / **6.43** (6.39 / 6.48) |               6.83 | **6.72** (6.89 / 6.56) |

Today's column gives round 1 / round 2. Round 1: +0.47 at noise 0.53; reviewers found the headline jammed under the top strip with the image. Round 2 narrows the image to 46 % of the slide: +0.29 at noise 0.66. Both rounds are a tie, which goes to the variant with fewer types, so the merge holds. The slides that motivated it do not gain: both linked-image slides lose about 0.7, because statement has no kicker ("Live Demo", "The Proof") and the screenshot text is too small. Phase 2 should give statement a kicker before those slides move.

Reviewer prompt: the same as quoted in full in `merge-cards`, with this item's images.
