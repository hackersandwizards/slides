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

- The two-column block's grey item text reads lower in contrast than split's (split panel finding),
  in item `work-panel-text-blocks`.

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
| media slide vs image, linked-image, image-grid | 2.67                 | 6 merge, image block survives, gallery its form  | 0     | merged in v1.22.0         |
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

## Phase 2e rounds (07.11.2026, slides v1.22.0)

Personas a presenter rehearsing on a laptop, a workshop participant mid-room and the brand's design
lead, every image at 1280 px, letters and slide order shuffled per reviewer, the current drawing
scored unmarked among the variants, fictional specimen content. Round 1: Claude (opus) and Codex
(gpt-6.1-sol) twice per persona, 12 runs. Round 2: once each, 6 runs. Score = mean overall. Noise =
mean |run 1 − run 2| of the same reviewer in round 1: 0.43 (Claude 0.37, Codex 0.48). The comparison
split slide carries no punchline, so its three renderings were the same picture: all three scored
5.53, the control that equal images score equal.

| Surface                  | Renderings (overall, round 1; round 2 where run)                                                                                                            | Shipped                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Overview vs phased-pills | distinct 3.75; 10 of 12 merge, 2 keep                                                                                                                       | overview draws as phased-pills                |
| Overview, three by three | current 7.39, as phased pills 6.88; round 2 with one highlight and no numbers: current 7.65, phased pills 7.93                                              | tie, the merge                                |
| Overview, lanes          | current 5.48, as phased pills 7.24 (best 12 of 12); round 2: 5.88 against 7.52                                                                              | phased pills                                  |
| Grid quotes              | italic card (current) 6.30, `hw-quote` in a card 7.32, on the ground 7.50; round 2: 6.37, 7.42, attributions aligned 8.12                                   | `hw-quote` on the ground, aligned             |
| Comparison punchline     | vs: teal mono line (current) 7.57, purple `hw-callout` 6.97, teal 7.42; before-after: 8.32, 7.60, 7.79                                                      | kept: the current line leads                  |
| Process footer           | purple card (current) 6.88 and 6.70, purple `hw-callout` 7.67 and 7.58, teal 8.32 and 8.14 (best 22 of 24)                                                  | teal `hw-callout`                             |
| Media row, tags          | small chips (current) 5.83, outline `hw-pill` under the row 6.73, pills above the title 5.99; round 2: 5.98, 6.38, a caption per picture 8.27 (best 6 of 6) | gallery block: captions, shared tags as pills |

The process footer's lead holds with both models (Claude 6.0 to 7.83, Codex 7.75 to 8.82), as do the
lanes overview (Claude 4.67 to 6.67, Codex 6.3 to 7.82), the quotes and the captions (round 2,
Claude 5.33 to 8.0, Codex 6.63 to 8.53). In round 1 every reviewer read the media slide's tags as
labels of single pictures; round 2 tested that reading as a caption per picture.

Left for a later round, named by most reviewers, in item `work-four-specimen-panel-findings`: green
plus marks on the specimen's drawbacks in the comparison `vs` slide; the phased-pills specimen's
amber and green phases read as status colours; a pipeline of six wraps into two rows of three and
loses its order; one portrait among three quotes reads as an exception.

One reviewer prompt, verbatim (round 1, presenter, Claude, run 1; image paths left out):

> You are a trainer and conference speaker who presents hackers&wizards workshop and conference decks and picks the slide type for each point. You judge the slides on your laptop at 1280 pixels wide, as you rehearse.
>
> The medium: slides of hackers&wizards, a consultancy for agentic software engineering, from workshop decks, client decks and conference talks (German and English), 16:9, projected in a room or shared on a screen. All content shown is fictional specimen content.
>
> The hackers&wizards brand: a light off-white ground (#f7f9fa) with dark ink text (#19283a), and night (#0b1118, near-black) as a second ground. Accent colours with fixed roles: teal (#1a7285, the primary accent) and purple (#9333ea, the secondary accent); a teal-to-purple brand gradient; green for success, amber for warnings, red only for errors. Tints from one opacity ladder: 7, 15, 25, 40, 70 and 100 %. A signature corner: large radius top-left and bottom-right, small radius elsewhere. JetBrains Mono for headings and labels, Inter for text. The brand forbids decoration such as glow, particles or ornaments.
>
> Part 1. Below are 9 slides, numbered s01 to s09. Each slide comes in several renderings of the same content, letters A, B and so on; some differ only in one element, so compare them closely. Read every image file listed:
>
> (25 image paths)
>
> Criteria, each scored 0 to 10 for your role: glance (the one key point is clear within 3 seconds), clarity (structure and relationships are understood without explanation), legibility (every text readable at your display size), breathing (room, not cramped, nothing touching or crowding another element), calm (nothing competes for attention, no clutter), brand (fits the brand described above and reads as one consistent system), human (looks deliberately designed, not like generic AI-generated slideware: 10 means it does not look generated), overall.
>
> Part 2. Two slide types of the same deck engine, type X and type Y, each shown by its example slides:
>
> (3 image paths)
>
> Judge whether a deck needs both types: distinct (0 to 10, 10 = two different communication jobs, each needed; 0 = the same job, one type would do).
>
> Answer with JSON objects only, one per line, nothing else:
>
> - for each rendering: {"slide":"s01","r":"A","glance":0,"clarity":0,"legibility":0,"breathing":0,"calm":0,"brand":0,"human":0,"overall":0,"below_max":"what keeps overall below 10, in at most 12 words"}
> - for each slide: {"slide":"s01","best":"A"}
> - for the pair: {"pair":"XY","distinct":0,"verdict":"keep|merge|unsure","survivor":"X|Y|none","why":"at most 20 words"}

## Specimen findings of the 07.11. panels (08.11.2026, slides v2.7.0)

Blind panels, Claude (opus) and Codex (gpt-6.1-sol), two personas (workshop participant, brand
designer), two runs each, shuffled neutral letters, 1000 px. Noise = mean |run 1 − run 2| of the
same reviewer on the same image.

| Finding                 | Variants (overall)                                                       | Noise | Shipped                                 |
| ----------------------- | ------------------------------------------------------------------------ | ----- | --------------------------------------- |
| `vs` drawbacks          | A green plus 4.00, B specimen marks them `-` 8.50, C neutral square 7.25 | 0.00  | B, in the specimen                      |
| Phased-pills hues       | A amber, teal, green 6.12, B purple and teal 6.25, C teal alone 7.88     | 0.33  | C, in the specimen                      |
| Six stages in one phase | A two rows of three 6.50, B one row 7.50                                 | 0.00  | B, up to six pills stay on one row      |
| One portrait of three   | A one portrait 5.12, B none 8.50, C all three, two faces repeated 6.38   | 0.33  | B, and a two-quote slide with portraits |
