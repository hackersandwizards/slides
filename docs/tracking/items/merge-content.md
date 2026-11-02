---
kind: decision
status: assumed
priority: 2
order: 1007
area: slides
owner: Benedikt
options:
  - key: merge
    label: Merge into content
    detail: A codemod converts the 60 slides; PDFs already sent stay as they are.
    score: 7.6
    noise: 0.31
  - key: keep
    label: Leave it
    detail: regular stays a type of its own.
    score: 6.83
    noise: 0.31
recommended: merge
assumption: "Blind review 02.11. (brv): merge, content 7.60 against regular 6.83, lead +0.77 above noise 0.31 in both runs and both models. The profile sidebar was not panelled."
images:
  merge:
    - src: merged.jpg
      caption: "Real deck slide as content with a two-column block"
  keep:
    - src: today.jpg
      caption: "The same slide as regular today"
---

# Should regular merge into content?

regular (60 deck slides, 54 of them in talks) sets sections with title, list, text, link and icon, optionally a profile sidebar. content (1,033) builds the same from blocks. The sidebar would become an option of content. The biggest conversion in phase 4, mainly pitch and client decks in talks. Applies only after a tie in the blind panel. Report, group 6.

## Blind review 02.11.

Panel: three personas from the audience (workshop participant at 1000 px, presenting trainer at 1280 px, brand designer at 1920 px), Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each, 12 scores per image. Criteria fixed before the first score: glance, clarity, legibility, breathing, calm, brand, human, overall, 0 to 10. Each slide in two renderings of the same content, today's type and the merge target, letters and order shuffled per reviewer, file names neutral hashes. Real deck slides from trainer-hub and talks decks, rendered hydrated at 1920 x 1080 (scratch copy of the engine at v0.26.1). Noise: mean distance between run 1 and run 2 of the same reviewer per image. Rule from this item: the merge holds where the target scores at least level (inside the noise or ahead).

| Deck slide                                     |          regular today |                content |
| ---------------------------------------------- | ---------------------: | ---------------------: |
| two titled lists (talk, German)                |                   6.17 |                   7.50 |
| cards layout with icons, agenda                |                   8.00 |                   6.92 |
| two lists plus a closing line (pitch)          |                   6.83 |                   7.92 |
| two lists plus a closing line, centred (pitch) |                   6.33 |                   8.08 |
| **mean** (Claude / Codex)                      | **6.83** (6.00 / 7.67) | **7.60** (7.33 / 7.88) |

Lead +0.77 at noise 0.31, +0.79 and +0.75 per run, ahead with both models: the merge holds. Conversion: two titled sections became a neutral `two-column` block, three titled sections `cards` with a list, an untitled closing section a `callout`. Not level everywhere: the agenda in the cards layout loses 1.08 as cards; the os report of 01.11. sends that layout to `agenda`, which phase 2c should follow. The profile sidebar (the option this item plans for content) was not built, so `regular` slides with a profile are not covered by this result.

Reviewer prompt: the same as quoted in full in `merge-cards`, with this item's images.
