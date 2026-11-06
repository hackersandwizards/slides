# Review round of 06.11.2026: panel scores and what shipped (v1.1.0)

Blind panels, Claude (opus) and Codex (gpt-6.1-sol), shuffled letters, each image at the persona's
display width. Criteria: glance, clarity, legibility, breathing, calm, brand, human, overall (0 to
10). Score = panel mean of overall. Noise = mean |run 1 − run 2| of the same reviewer on the same
image.

| Surface                 | Personas                          | Variants (overall)                                                                   | Noise | Shipped                                             |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------ | ----- | --------------------------------------------------- |
| Closing                 | client CTO, participant, designer | A quote 5.88, B claim 7.25, C claim with its word in teal 7.50 (best 7 of 8)         | 0.67  | C: `claim: "en" \| "de"` from brand's `verbal.json` |
| Positions, round 1      | trainer, participant, designer    | A current 7.00, B neutral cards 7.50, C columns 7.38                                 | 0.83  | tie, round 2                                        |
| Positions, round 2      | same                              | A current 6.75, B 7.50, B2 cards, middle as label, resolution as heading 8.00        | 0.58  | B2 (Claude 6.5 → 7, Codex 7 → 9)                    |
| Split vs two-column     | trainer, participant, designer    | comparison split 7.58, content with two-column and footer 7.02 (split best 16 of 16) | 0.17  | a lone neutral two-column draws as split            |
| Survey readout, round 1 | client engineering lead, trainer  | A current 7.00, B 7.42, C 7.75                                                       | n/a   | round 2                                             |
| Survey readout, round 2 | same                              | A current 7.50, B 7.50, C2 8.50 (best 6 of 6)                                        | 0.00  | C2, brief to documents                              |
| Type list               | trainer, deck author (text lists) | new list 7.33, old list 5.50 (distinctness 5.83 vs 3.67)                             | 0.00  | the print page's "Replaced forms"                   |

One reviewer prompt, verbatim (positions round 2, trainer, Claude, run 1):

> You are a trainer who presents hackers&wizards workshop and conference decks and picks the slide
> type for each point. You judge the slides on your laptop at 1280 pixels wide, as you rehearse.
>
> The medium: slides of hackers&wizards, a consultancy for agentic software engineering, from
> workshop decks, client decks and conference talks (German and English), 16:9, projected in a room
> or shared on a screen. Every slide below sets two people's opposing positions side by side, each
> a stance and a quote, and resolves them in one line.
>
> The hackers&wizards brand: a light off-white ground (#f7f9fa) with dark ink text (#19283a), and
> night (#0b1118, near-black) as a second ground that is part of the system. Accent colours with
> fixed roles: teal (#1a7285, the primary accent) and purple (#9333ea, the secondary accent); green
> (dark #15803d) for success; amber (dark #b45309) for warnings; red (#dc2626) only for errors and
> anti-patterns; a grey-blue (#7c849c) for neutral marks. Tints come from one opacity ladder: 7, 15,
> 25, 40, 70 and 100 %. Cards, fields and frames take the brand corner (large radius top-left and
> bottom-right, small radius elsewhere); small marks such as list markers are square. JetBrains Mono
> for headings and labels, Inter for text. The brand forbids decoration such as glow, particles or
> ornaments.
>
> Below are 2 slides, numbered s01 to s02. Each slide comes in several renderings of the same
> content, letters A, B and so on. Read every image file listed.
>
> (six image paths)
>
> Criteria, each scored 0 to 10 for your role: glance (the one key point is clear within 3
> seconds), clarity (structure and relationships are understood without explanation), legibility
> (every text readable at your display size), breathing (room, not cramped, nothing touching or
> crowding another element), calm (nothing competes for attention, no clutter), brand (fits the
> brand described above), human (looks deliberately designed, not like generic AI-generated
> slideware: 10 means it does not look generated), overall.
>
> For each rendering answer with one JSON object on its own line: (schema). Then for each slide one
> line (best, decided). Answer with JSON objects only, one per line, nothing else.

## Merges in v1.1.0

- `deep-dive-divider` draws as `transition` with `night: true` (pixel diff 0).
- A content slide holding one neutral two-column block alone (titles and items, no text, no label,
  subtitle, principle, badge, stage marker, ground or centred layout) draws as comparison `split`,
  its footer as the punchline.
- The print page lists each replaced form under "Replaced forms"; the catalogue offers only the
  survivors.

Kept on purpose: chart `bar` beside `bars` (FT Visual Vocabulary: columns for a time series, bars for
categories with long labels).

## Still open

- Shapes and colours wait for brand's `shape-and-colour-system`: the closing's email pills and
  portrait rings, the read-more button, labels in a meaning's hue (`label-hue`), list markers, the
  stage pill, `GradientTitlePill`.
- The two-column block's grey item text reads lower in contrast than split's (split panel finding).
- Media vs the image blocks: a merge, filed in `work-phase-2e-v0-18-0-shipped-activity`.

## Overlaps after v1.1.0: blind type-list panel (06.11.2026, slides v1.1.1)

Personas deck author and trainer, each image at 1280 x 720, groups and sets shuffled per reviewer
under neutral letters; Claude (opus) twice, Codex (gpt-6.1-sol) once. Criterion: distinct (0 to 10,
10 = two different communication jobs, each needed), with a verdict. Noise = |run 1 − run 2| of
Claude per persona.

| Pair                                           | Distinct (mean of 6) | Verdicts                                         | Noise | Outcome                   |
| ---------------------------------------------- | -------------------- | ------------------------------------------------ | ----- | ------------------------- |
| process slide vs pipeline block                | 7.33                 | 6 keep                                           | 0     | kept                      |
| timeline block vs roadmap slide                | 6.83                 | 6 keep                                           | 0     | kept                      |
| content slide vs regular with profile          | 9.50                 | 6 keep                                           | 0–1   | kept                      |
| media slide vs image, linked-image, image-grid | 2.67                 | 6 merge, image block survives, gallery its form  | 0     | filed (phase 2e)          |
| code and annotated code vs terminal and hooks  | 5.17                 | Claude 3 merge, 1 unsure (3–4); Codex 2 keep (8) | 0–1   | kept: the models disagree |

Beside the pairs, regular with profile vs the profiles slide scored 5.67 (Claude unsure or keep at 4
to 5, Codex keep at 7 to 8): no merge either.
