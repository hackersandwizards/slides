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

## Shapes and rule lines on brand v1.2.0 (06.11.2026, slides v1.3.0)

Brand's shape rule (v1.1.0) taken over: worded links are `hw-button`, the part bar is `hw-rule`,
label boxes, tiles, the stage strip and inline code take the small corner, pictures and panels the
brand corner, legend swatches are square, and no gradient remains outside the strip.

Personas participant (mid-room, 150 seats), trainer (laptop, rehearsing) and brand designer, each
image at 1280 px. Same criteria as above. Claude (opus) twice and Codex (gpt-6.1-sol) once per
persona in round 1, once each in rounds 2 and 3. Noise (round 1, Claude, |run 1 − run 2|) 0.46.

| Panel                                            | Variants (overall, mean of all reviewers)                                      | Shipped                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------- |
| Frame title, round 1 (overview, phased pills)    | ink fill 7.50, teal fill 7.43, teal outline 7.36, gradient pill (current) 6.44 | tie of the three; round 2             |
| Frame title, round 2                             | ink fill 7.56, ink outline 7.51, teal outline 7.30                             | ink outline: tie, no exception needed |
| Worded links (closing email, "Read more")        | tint with brand corner 7.66, `hw-button` secondary 7.57, pill (current) 7.07   | `hw-button`: tie, brand's own element |
| Portraits (closing, profiles)                    | brand corner 8.27 (best 17 of 18), round 8.03, current 8.04                    | brand corner                          |
| Conformance (roadmap, gantt, callout, flow, KPI) | after 7.90, before 7.39 (roadmap 8.38 vs 7.05, the rest a tie)                 | after                                 |

Reviewers' recurring reason on the closing: both email buttons are teal, though the second
speaker's name and label are purple. Brand's button has no purple hue; a brief went to brand.

One reviewer prompt, verbatim (round 1, trainer, Claude, run 1; the image list shortened):

> You are a trainer who presents hackers&wizards workshop and conference decks and picks the slide
> type for each point. You judge the slides on your laptop at 1280 pixels wide, as you rehearse.
>
> The medium: slides of hackers&wizards, a consultancy for agentic software engineering, from
> workshop decks, client decks and conference talks (German and English), 16:9, projected in a room
> or shared on a screen.
>
> The hackers&wizards brand: a light off-white ground (#f7f9fa) with dark ink text (#19283a), and
> night (#0b1118, near-black) as a second ground. Accent colours with fixed roles: teal (#1a7285,
> the primary accent) and purple (#9333ea, the secondary accent); a teal-to-purple brand gradient;
> green for success, amber for warnings, red only for errors. Tints from one opacity ladder: 7, 15,
> 25, 40, 70 and 100 %. A signature corner: large radius top-left and bottom-right, small radius
> elsewhere. JetBrains Mono for headings and labels, Inter for text. The brand forbids decoration
> such as glow, particles or ornaments.
>
> Below are 6 slides, numbered s01 to s06. Each slide comes in several renderings of the same
> content, letters A, B and so on; the renderings differ only in small details, so compare them
> closely. Read every image file listed:
>
> (19 image paths)
>
> Criteria, each scored 0 to 10 for your role: glance (the one key point is clear within 3
> seconds), clarity (structure and relationships are understood without explanation), legibility
> (every text readable at your display size), breathing (room, not cramped, nothing touching or
> crowding another element), calm (nothing competes for attention, no clutter), brand (fits the
> brand described above and reads as one consistent system), human (looks deliberately designed,
> not like generic AI-generated slideware: 10 means it does not look generated), overall.
>
> For each rendering answer with one JSON object on its own line: (schema). Then for each slide one
> line (best, decided). Answer with JSON objects only, one per line, nothing else.

## Working Products gaps: blind panel (06.11.2026, slides v1.4.0)

Personas a product manager in row 10 of a conference hall, an engineering lead following remotely
in a video call, a deck author rehearsing; Claude (opus) and Codex (gpt-6.1-sol) each, every image
at 1280 px, letters shuffled per reviewer, the current drawing scored alongside unmarked, fictional
specimen content. Score = mean overall of the six runs. Noise = mean |run 1 − run 2| of Claude as
the hall persona over all 15 renderings: 0.60.

| Surface                          | Renderings (overall)                                                                                                                                                                                       | Shipped                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Prose-only content slide         | current xl muted 6.67, 2xl muted 7.17, 2xl ink at the list measure 7.83, 3xl ink 8.00                                                                                                                      | 2xl ink: ties 3xl, needs no prose-only rule |
| Cards and callout, two-line head | current 7.50, callout full width 7.67, full width and 3rem under the title 8.00                                                                                                                            | current: every lead inside the noise        |
| Timeline, durations and a figure | duration as the event's date, figure in its text (current) 5.33; label above the line, figure under the title 7.00; label above, figure under the text 8.00; label on the line, figure under the text 8.00 | label on the line: clarity 7.6 against 7.1  |
| Statement, quotation and source  | attribution between subtitle and closing (current) 5.17, after the closing with a footer 7.83 (best 6 of 6)                                                                                                | after the closing, footer                   |
| Statement, square QR code        | 46 % wide frame (current) 6.00, frame in the picture's shape with a footer 8.33 (best 6 of 6)                                                                                                              | frame in the picture's shape                |

Left for a later round, named by most reviewers: the gap between a statement's subtitle and its
closing splits a quotation that runs across both; icon cards in a row read as template slideware;
the QR code could stand larger for the back rows.

One reviewer prompt, verbatim (Claude, hall persona, run 1; image paths shortened):

> You are a product manager attending a practitioners' conference talk in a hall of 150 people, seated in row 10, reading the projected slides while the speakers talk. You judge the slides as they reach you from your seat; each image below stands in for the projected slide at 1280 pixels wide.
>
> The medium: slides of hackers&wizards, a consultancy for agentic software engineering, from conference talks, client decks and workshops (German and English), 16:9, projected in a room or shared on a screen. All content on these slides is made up.
>
> The hackers&wizards brand: a light off-white ground (#f7f9fa) with dark ink text (#19283a), and night (#0b1118, near-black) as a second ground that is part of the system. Accent colours with fixed roles: teal (#1a7285, the primary accent) and purple (#9333ea, the secondary accent); green (dark #15803d) for success; amber (dark #b45309) for warnings; red (#dc2626) only for errors and anti-patterns; a grey-blue (#7c849c) for neutral marks. Tints come from one opacity ladder: 7, 15, 25, 40, 70 and 100 %. Cards, fields and frames take the brand corner (large radius top-left and bottom-right, small radius elsewhere); small marks such as list markers are square. JetBrains Mono for headings and labels, Inter for text. The brand forbids decoration such as glow, particles or ornaments.
>
> Below are 5 slides, numbered s01 to s05. Each slide comes in several renderings of the same content, letters A, B and so on. Read every image file listed:
> s01-A.png s01-B.png s01-C.png s01-D.png s02-A.png s02-B.png s02-C.png s03-A.png s03-B.png s03-C.png s03-D.png s04-A.png s04-B.png s05-A.png s05-B.png
>
> What each slide must do:
>
> - s01: a slide of three short paragraphs of argument under a headline, a source line at the bottom.
> - s02: three cards of what the audience takes home, and one sentence of what the speakers ask in return, under a two-line headline.
> - s03: a project's course in three stages: the time each stretch took, and one result as a figure.
> - s04: a statement whose quotation runs from the line under the headline into the closing line, with who said it and where it was said.
> - s05: a closing question with a QR code the room scans during a 20-minute discussion, and one line on where the discussion continues.
>
> Criteria, each scored 0 to 10 for your role: glance (the one key point is clear within 3 seconds), clarity (structure and relationships are understood without explanation; on s03, which times are durations and which are points in time), legibility (every text readable at your display size), breathing (room, not cramped, nothing touching or crowding another element), calm (nothing competes for attention, no clutter), brand (fits the brand described above), human (looks deliberately designed, not like generic AI-generated slideware: 10 means it does not look generated), overall.
>
> For each rendering answer with one JSON object on its own line: {"id":"s01-A","glance":0,"clarity":0,"legibility":0,"breathing":0,"calm":0,"brand":0,"human":0,"overall":0,"below_max":"what keeps the lowest criteria below 10, at most 20 words"}. Then for each slide one line {"slide":"s01","best":"A"}. Answer with JSON objects only, one per line, nothing else.
