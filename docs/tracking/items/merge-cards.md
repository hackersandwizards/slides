---
kind: decision
status: assumed
priority: 2
order: 1002
area: slides
owner: Benedikt
options:
  - key: merge
    label: Merge into cards
    detail: After a tie in the blind panel. grid stays only with quotes (2 slides).
    score: 7.33
    noise: 0.37
  - key: keep
    label: Leave it
    detail: All five stay; phase 2 optimises each shape on its own.
    score: 7.03
    noise: 0.37
recommended: merge
assumption: "Blind review 02.11. (brv): merge, cards 7.33 against 7.03 for today's shapes, lead +0.30 inside noise 0.37, so level; Claude 7.00 vs 6.47, Codex 7.67 vs 7.60. The hooks slide lost (6.83 vs 8.17)."
images:
  merge:
    - src: merged.jpg
      caption: "Real deck slide as cards (merge target, planned highlight and list)"
  keep:
    - src: today.jpg
      caption: "The same slide as grid pillars today"
---

# Should five card shapes become one: grid pillars, labeled-grid, four-column and hooks into cards?

Five entries show parallel points as cards: cards (100 deck slides), grid pillars (45), labeled-grid (16), four-column (11), hooks (5). Differences: number tiles with a colour per card, one highlighted cell, a list per column, the name in mono. cards would gain highlighting, a list and reveal; the colour per card goes. Applies only once cards scores at least level on real deck slides in the blind panel. Phase 4 converts 77 slides. Report, group 1.

## Blind review 02.11.

Panel: three personas from the audience (workshop participant at 1000 px, presenting trainer at 1280 px, brand designer at 1920 px), Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each, 12 scores per image. Criteria fixed before the first score: glance, clarity, legibility, breathing, calm, brand, human, overall, 0 to 10. Each slide in two renderings of the same content, today's type and the merge target, letters and order shuffled per reviewer, file names neutral hashes. Real deck slides from trainer-hub and talks decks, rendered hydrated at 1920 x 1080 (scratch copy of the engine at v0.26.1). Noise: mean distance between run 1 and run 2 of the same reviewer per image. Rule from this item: the merge holds where the target scores at least level (inside the noise or ahead).

| Deck slide                                         |                  today |                  cards |
| -------------------------------------------------- | ---------------------: | ---------------------: |
| grid pillars, three rules (talk)                   |                   6.50 |                   8.08 |
| grid pillars, four done items, success tone        |                   7.25 |                   7.67 |
| labeled-grid, severity levels (deep dive on Night) |                   5.92 |                   7.08 |
| four-column, context files                         |                   7.33 |                   7.00 |
| hooks, six checks                                  |                   8.17 |                   6.83 |
| **mean** (Claude / Codex)                          | **7.03** (6.47 / 7.60) | **7.33** (7.00 / 7.67) |

Lead +0.30 at noise 0.37, the same in both runs (+0.30, +0.30): level, so the merge holds. The target was built with the fields this item plans (`highlight`, a list per card, a column count) on a scratch copy; the colour per card is gone. Not level everywhere: the hooks slide loses 1.34 (six cards with large mono names, `checks/unchecked-completion` breaks across lines), the four-column slide 0.33. Phase 2c should keep hooks as rows inside `cards` or leave `hooks` as a block. Reveal was not rendered (print mode).

One reviewer prompt, verbatim (batch 1, participant, Claude, run 1; image paths shortened):

```text
You are a participant in a hands-on workshop of hackers&wizards, an engineering manager or developer sitting in row 8 of a training room. The slide is projected on a screen; the images below are shown at 1000 pixels wide, the size the slide appears to you from your seat.

The medium: slides of hackers&wizards, a consultancy for agentic software engineering, from workshop decks, client decks and conference talks (German and English), 16:9, projected in a training room or shared on a screen. Every slide below is a real deck slide.

The hackers&wizards brand: a light off-white ground (#f7f9fa) with dark ink text (#19283a), and night (#0b1118, near-black) as a second ground that is part of the system. Accent colours with fixed roles: teal (#1a7285, the primary accent) and purple (#9333ea, the secondary accent); green (dark #15803d) for success; amber (dark #b45309) for warnings; red (#dc2626) only for errors and anti-patterns; a rust hue (#a3402a) only for the Software Factory product area; a grey-blue (#7c849c) for neutral marks. Tints come from one opacity ladder: 7, 15, 25, 40, 70 and 100 %. Cards, fields and frames take the brand corner (large radius top-left and bottom-right, small radius elsewhere); small marks such as swatches and list markers are square. JetBrains Mono for headings and labels, Inter for text. A thin teal-to-purple strip runs along the top edge of every slide and the pixel wordmark "hackers&wizards" sits bottom right. The brand forbids decoration such as glow, particles or ornaments, and allows a gradient only as one bounded field with a job (a band, a panel, a pill), never as a background behind content.

Below are 8 slides, numbered s01 to s08. Each slide comes in two renderings of the same content, letters A and B. Read every image file listed.

s01 A: …/e89e5b43fc.png
s01 B: …/cf631eb9e5.png
s02 A: …/48587f335d.png
s02 B: …/1330667ca7.png
s03 A: …/3bd89a2b84.png
s03 B: …/dc26c33cbc.png
s04 A: …/0fcbdd7627.png
s04 B: …/21a8b6b69a.png
s05 A: …/c42db5cb3f.png
s05 B: …/61b4c1b33b.png
s06 A: …/e20d25ab3c.png
s06 B: …/cbda15f30b.png
s07 A: …/b60a3dba16.png
s07 B: …/f37d7fe69e.png
s08 A: …/df3c03c41a.png
s08 B: …/d1ab5ad68e.png

Criteria, each scored 0 to 10 for your role: glance (the one key point is clear within 3 seconds), clarity (structure and relationships are understood without explanation), legibility (every text readable at your display size), breathing (room, not cramped, nothing touching the edges or the footer), calm (nothing competes for attention, no clutter), brand (fits the brand described above), human (looks deliberately designed, not like generic AI-generated slideware: 10 means it does not look generated), overall.

For each rendering answer with one JSON object on its own line: {"slide":"s01","letter":"A","glance":0,"clarity":0,"legibility":0,"breathing":0,"calm":0,"brand":0,"human":0,"overall":0,"below10":"what keeps overall below 10, concrete: which element, what is wrong"}. Then for each slide one line {"slide":"s01","best":"A","decided":"the one difference that decided it, in a few concrete words"}.
Answer with JSON objects only, one per line, nothing else.
```
