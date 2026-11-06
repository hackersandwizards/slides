# Analysis of `styles/slides.css`, 06.11.2026

An analysis only: no code, CSS or component changed. Nothing changes before Benedikt has commented.
Read at `HEAD` 177aca2 (slides v1.8.0, brand pinned at v1.12.1). Another session is raising brand to
v1.16.0 in the working tree; the brand values quoted here are the same in v1.16.0.

## The short answer

The consumers already keep no large global CSS. talks has 15 lines of its own, trainer-hub 206
across six files, hycle-private none. The large global stylesheet they all carry is this engine's
`slides.css`: 665 lines, 605 of them not blank. About half of it (320 lines) belongs to one
component or page and could move to it. Only 7 lines rebuild something brand already ships, and no
whole rule block is dead.

| Group                                 | Non-blank lines | Share |
| ------------------------------------- | --------------: | ----: |
| A. rebuilds a brand element or token  |               7 |    1% |
| B. belongs to one component or page   |             320 |   53% |
| C. belongs to brand, brand lacks it   |              28 |    5% |
| D. must stay global                   |             250 |   41% |
| E. dead                               |               0 |    0% |
| Total (every non-blank line assigned) |             605 |  100% |

The counts are exact: each line range below was counted by a script over the file, which also
checked that every non-blank line falls in exactly one range. The split into groups is my judgement
from reading the rule and each component that uses it.

## How it was measured

- Every engine selector was grepped over `components/`, `lib/`, `catalog/`, `specimen/`, `scripts/`
  and `test/`. Control: `slide-body` hits in 18 places.
- The catalog was built (`bun run build`, 522 HTML pages) and served on port 4391. A headless Chrome
  opened every page at 1920x1080 and counted the elements each stylesheet rule matches. 159 engine
  selectors matched and 38 matched nothing. The zeros are listed under group E, each with its
  cause.
- Brand's `elements/*.css`, `expert/*.css`, `tokens/*.css` and this repo's `brand-elements.json`
  were read whole. Brand's repository was read at `origin/main` (v1.16.0) for changes since the pin.
- talks, trainer-hub, hycle-private, website, documents and os were grepped read-only for similar
  rules.

## The rule blocks

Line numbers are from `styles/slides.css` at 177aca2.

### A. Rebuilds a brand element or token (7 lines)

| Lines   | Rule                                                 | Brand already ships                                                             | Measured difference                                                                                                                                          |
| ------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 342-343 | `--hw-pill-size`, `--hw-pill-pad` on the stage scale | `elements/scales.css` `[data-hw-scale="stage"]`: 1.3125rem, 0.1875rem 0.9375rem | measured on the specimen page at a 16px root: engine 27px, padding 0 20px; brand would set 21px, padding 3px 15px. At 1920 (21.333px root) 36px against 28px |
| 511-515 | `.text-gradient-brand { color: var(--color-teal) }`  | the `text-primary` utility over brand's `--color-teal`                          | none: the same value. The name says gradient and the rule paints flat teal. Used in `StatementSlide.tsx` and `ComparisonSlide.tsx`                           |

The pill override is deliberate (the comment: "the pill keeps the kicker's step"). So aligning it is
either a brand change (the stage pill takes the kicker's step) or a visible change to every slide
pill, which needs a blind panel.

### B. Belongs to one component or page (320 lines)

| Lines   | Rule                                                                   | Target component                                                          | Coupling that makes the move harder                                                                                  |
| ------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 19-25   | `[data-hw-scale="stage"]` face, antialiasing, default `--slide-ground` | `SlideShell.tsx` (sets the attribute)                                     | the catalog's tiles carry the attribute too                                                                          |
| 37-49   | `.slide-viewport` overflow, scrollbar, cursor                          | `SlideContainer.tsx`                                                      | the cursor's data URI retypes brand teal as `%231A7285`                                                              |
| 71-78   | `.slide-content` size, kept line breaks                                | `SlideShell.tsx`                                                          | `scripts/density.ts` and `catalog/print.ts` select `.slide-content`                                                  |
| 80-88   | `.slide-titled` title line                                             | `primitives.tsx` (with Chart, Media, Comparison)                          | must stay unlayered to beat the slide's own utilities                                                                |
| 90-96   | footer band padding                                                    | `SlideShell.tsx`                                                          | the fit guard in `SlideShell` reads it                                                                               |
| 98-102  | the closing lockup hides the corner                                    | `ClosingSlide.tsx`                                                        | selects into `SlideContainer` and `PrintSlide` through `:has()`                                                      |
| 104-122 | `.slide-body` and its two spacers                                      | `primitives.tsx` (the body part, 18 files use it)                         |                                                                                                                      |
| 124-133 | timeline continued over slides                                         | `Visuals.tsx` (the timeline)                                              | the spacer half sits on the body                                                                                     |
| 135-139 | a growing child takes the whole body                                   | `primitives.tsx` (the body part)                                          | keys on Tailwind's `.flex-1`                                                                                         |
| 141-229 | media block: picture, box, caption, link, stack                        | `ContentSlide.tsx` (`MediaPicture`), link and caption in `primitives.tsx` | four rules reach the body through `:has()`; the stack rules are never rendered (group E)                             |
| 231-236 | `.slide-kicker` above the title line                                   | `SectionHeader.tsx`, used in Grid and Roadmap too                         |                                                                                                                      |
| 346-349 | code panel padding 0                                                   | `primitives.tsx` (`CodePanel`)                                            |                                                                                                                      |
| 353-356 | `.slide-marker-nested`                                                 | `primitives.tsx`, as a marker variant (Content, Visuals use it)           |                                                                                                                      |
| 361-369 | `.slide-title`                                                         | `primitives.tsx` (`RegularSlide.tsx` too)                                 | the phone rule (line 495) targets it                                                                                 |
| 371-375 | `.process-canvas` hidden from `md` up and in print                     | `ProcessSlide.tsx`                                                        | none: `md:hidden print:hidden` does it                                                                               |
| 377-431 | pipeline row steps 1 to 3                                              | `ContentSlide.tsx` (`PipelineRow`)                                        | `SlideShell` sets `data-step`; never rendered in the catalog (group E)                                               |
| 501-509 | below `sm`: corner above the control bar                               | `SlideContainer.tsx`                                                      | also sets `.slide-content` padding                                                                                   |
| 517-543 | `bg-section-*` grounds                                                 | `SlideShell.tsx` / `lib/section-styles.ts`                                | deck data names these classes (`types/slide.ts:11`); trainer-hub's `deck-assets.test.ts` reads `slides.css` for them |
| 569-596 | `.print-slide` page, last page, first child, watermark                 | `PrintSlide.tsx`                                                          | `render-pdf.ts`, `density.ts` and `catalog/print.ts` select `.print-slide`                                           |
| 648-665 | `.team-octagon` clip path                                              | `TeamTopologySlide.tsx`                                                   | brand's `stage.css` owns the octagon's measures                                                                      |

### C. Belongs to brand, brand lacks it (28 lines)

| Lines   | Rule                                                       | Similar rule elsewhere (read-only grep)                                                                                          |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 27-35   | headings: `text-wrap: balance`, heading family, weight 700 | os `src/styles/global.css:171` (family), documents `document.css:151` (balance), website components (balance per block)          |
| 51-54   | `::selection` teal on white, `!important`                  | none: website, os and documents keep the browser's selection. A brand decision first                                             |
| 350-352 | `.hw-marker` size on the stage                             | none: brand's stage scale sets every other `--hw-*` measure but not `--hw-marker-size`, so a stage surface must add it           |
| 357-359 | `.hw-label > .hw-marker` mid at `0.5cap`                   | documents `tokens.css`, `readout.css` set `--hw-marker-mid`. `marker.css` names 0.5cap for capitals and leaves it to the surface |
| 444-453 | `text-wrap: pretty` on slide paragraphs and items          | documents `onepager.css:33`, website `TopicBox.astro:116`                                                                        |

### D. Must stay global (250 lines)

| Lines        | Rule                                                       | Why it stays global                                                                                      |
| ------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1-9          | imports, `@source`                                         | the stylesheet's entry: Tailwind, tokens, brand marker and elements, static faces                        |
| 11-17        | `* { border-border }`, `body` colours                      | Tailwind base: v4 draws a border in `currentColor` without it. The `body` rule reaches the host page     |
| 56-69        | root font size on a page with a slide, and in print        | only `html` can set the rem every utility grows with                                                     |
| 238-325      | the hairline overlay on every border and brand box         | cuts across every part: it repaints Tailwind's border utilities and three brand elements                 |
| 327-332      | `@utility card-pad-*`                                      | a utility is declared in the stylesheet Tailwind compiles                                                |
| 334-341, 344 | stage settings: `--hw-hairline` at the 1px layout border   | brand's element settings for the stage, wherever a part renders; the overlay paints the hairline instead |
| 433-442      | `.card-text-lg`, `.card-text-base` with `--card-boost`     | an engine-wide type step: six slide types use it, the fit guard in `SlideShell` drives it                |
| 455-499      | the phone layout below `md`                                | overrides utilities on every slide type (`.grid`, `.p-8`, `.text-5xl` and the rest)                      |
| 545-553      | wordmark day/night switch                                  | theme switch                                                                                             |
| 555-567      | night: `bg-white`, `bg-background`, `text-white`           | theme switch, with `!important` on the grounds                                                           |
| 598-632      | `@media print`: page box, no shadows, no motion, no canvas | print rules                                                                                              |
| 634-646      | reduced motion                                             | brand leaves it to the surface (`tokens.css:298`)                                                        |

### E. Dead (no whole block)

No rule block is dead: every engine class in the stylesheet is set by a component. Dead by grep are
parts of selectors and properties:

- `.border-r`, `.border-x`, `.border-y` in the hairline overlay (lines 249-251, 265-267 and the four
  side rules): no engine file sets them, and deck data cannot pass a class. The control
  `.border-b` hits. trainer-hub's own pages use `border-y`, but outside the slide scope the overlay
  is limited to.
- `.p-10` in the phone rule (line 488): no hit. The control `.p-8` hits 3 times.
- `-ms-overflow-style` (line 40): no browser reads it.
- `page-break-after` and `page-break-inside` beside `break-after` (lines 574, 581, 612): legacy
  aliases of the same property.
- `--slide-ground: var(--background)` in `.bg-section-intro` (line 521) repeats the default line 24
  sets.

The browser count's 38 zeros are not dead. Each has a cause:

- the catalog renders no player, so every `.slide-viewport` rule reads zero there (used in
  `SlideContainer.tsx`);
- pipeline `data-step` 1 to 3 is set only when stages wrap, which no specimen slide does;
- **`.slide-media-stack` (lines 207-229) is never rendered**: no specimen slide holds two pictures;
- the night `.text-white` and `.hw-wordmark-night` rules and the closing-mark rule need a
  combination the print page does not show (a night slide with white type, a closing slide's
  watermark).

## Tailwind's role

Rules that exist only because a utility is missing or misused:

- `.process-canvas` (371-375): `md:hidden print:hidden`.
- `.text-gradient-brand` (511-515): `text-primary`.
- `.slide-media`, `.slide-media-item`, `.slide-media-caption`, `.slide-media-link` (144-167) are
  flex, gap and size utilities spelled as CSS: `m-0 flex flex-col items-center gap-(--slide-media-gap)`
  and so on.
- `.slide-title` (361-368) is five utilities: `font-heading`, `text-(length:--slide-title-size)`,
  `leading-(--slide-title-leading)` and the rest.
- The text-balance rescue (449-453) exists because the `pretty` rule above it is unlayered. In
  `@layer base` the utility would win by itself and the rescue could go.
- The phone layout (455-499) exists because the slide types are written desktop-first. Each
  override is a `max-md:` variant the component could carry.
- The night overrides of `bg-white` and `text-white` (555-567) exist because components paint
  surfaces with `bg-white` (32 places) instead of a role that turns with night. Brand's `hw-card`
  already turns on night.
- `.team-octagon` and the pipeline steps are not utility-shaped. A clip path and a run-time step
  stay CSS.

## Can a group B rule move into its component and still reach the consumers?

Yes, with conditions:

- The consumers render the engine's source (`vite.ssr.noExternal` in Astro), so a CSS file a `.tsx`
  imports reaches each consumer's bundle. Astro collects CSS a rendered framework component imports.
- **Cascade order is the risk.** Many B rules are unlayered on purpose, to beat the slide's own
  utilities (comments at lines 82, 449, 456). A per-component file loads in its own order. It must
  name its layer, or its rules lose to utilities or win where they never did.
- **trainer-hub's hub pages render engine components without `slides.css`** (they import only
  `sources.css`, `src/styles/global.css:11`). A rule moved into a component arrives on those pages
  for the first time. It is a visible change there, either a fix or a regression.
- Several B rules name each other's classes through `:has()` (the body and its media, timeline and
  growing child; the closing mark and the corner). Moving them apart splits one rule across files.
  The body spacers and the media `:has()` rules move best as one unit with the body part.
- Class names are an API beyond CSS: `scripts/render-pdf.ts`, `scripts/density.ts`,
  `scripts/render-pptx.ts`, `catalog/print.ts` and the tests select `.print-slide`,
  `.slide-content`, `.slide-body` and `.slide-closing-mark`. A move keeps the names.
- `test/tokens.test.ts` and stylelint scan `styles/`. A component CSS file needs the same token
  guard, or raw lengths come back.

Converting a B rule to utilities inside the component's `className` avoids all of this except the
`:has()` rules. That route is open for the media block, the title, the process canvas and the
section grounds: 65 of the 320 B lines (counted: media 144-167, title 361-368, canvas 371-375, the teal text 511-515, grounds 517-543).

## Proposed end state

`slides.css` keeps group D and the few `:has()` couplings that span parts, about 280 lines
(estimate). The single-component rules live with their components, as utilities where they are
utility-shaped, else in a layered stylesheet beside the component. Groups A and C go to brand or go
away. The consumers' stylesheets stay as they are.

## Order of steps

Removal first, then moves, then additions. Each step is one release of the engine with its own
gate.

1. **Remove the dead fragments** (group E list): `.border-r`, `.border-x`, `.border-y`, `.p-10`,
   `-ms-overflow-style`, the legacy `page-break-*`, the repeated `--slide-ground`. Risk: a deck in a
   consumer that reaches one of them. Verify: grep the three consumers' decks, then the print
   frames stay byte-identical (`frames.html`) and the PDF of the specimen deck is unchanged. No
   blind review: no reader sees a change.
2. **Add the missing specimen case first**: a media slide with two pictures, so the 23 stack
   lines are rendered and tested before anything moves. Per `CLAUDE.md`, a variant lands in the
   specimen deck first.
3. **Replace the utility-shaped rules with utilities in the component**: `.process-canvas`,
   `.text-gradient-brand`, `.slide-title`, the media block's flex rules. Risk: specificity and layer
   order change (the unlayered `.slide-titled` beats utilities today). Verify: screenshot diff of
   every print-page slide before and after, zero changed pixels. No blind review while pixels stay
   equal.
4. **Move the single-component rules** (pipeline, team octagon, print page, viewport, closing
   mark) into a layered stylesheet beside each component. Risk: trainer-hub's hub pages start
   receiving them; cascade order. Verify: the same screenshot diff, plus trainer-hub's catalog with
   and without its slide stylesheet, as the v1.8.0 measurement did.
5. **The section grounds last**: deck data and trainer-hub's `deck-assets.test.ts` read the class
   names from `slides.css`. That test must change in trainer-hub before the rules leave the file.
6. **Brand additions (group C)**, as briefs to brand: the stage scale's `--hw-marker-size`, the
   capitals marker mid, a heading and paragraph base (`balance`, `pretty`, family, weight). Then the
   engine drops its copies. The pill step (group A) and `::selection` are design decisions for brand.
   A change of the pill is visible on every slide and needs a blind panel with a deck author and a
   participant.

What I would leave as is: the hairline overlay (88 lines). It is the one rule a moved stylesheet
could not own, and it holds a measured fit-guard effect: a wider border shrank slides. Also the
phone layout, until the slide types gain `max-md:` variants one by one. Rewriting it in one step
touches every type for a surface nobody presents from.

## What another repository would change (briefs, nothing sent)

- **brand**: add `--hw-marker-size` to `[data-hw-scale="stage"]` in `elements/scales.css` (the slide
  engine's `--slide-marker`, 0.5625rem). Add `--hw-marker-mid: 0.5cap` for `.hw-label > .hw-marker`
  in `marker.css`. Decide whether the stage pill takes the kicker's step (1.6875rem, padding 0
  1.25rem), as the engine overrides it today. Decide whether brand ships a heading and paragraph base
  (`text-wrap`, family, weight), which os, documents and the engine each write today, and a
  `::selection` colour.
- **trainer-hub**: before step 5, `src/lib/__tests__/deck-assets.test.ts` checks `bg-section-*`
  against an exported list rather than reading the text of `slides.css`.

## Assumptions

- Group B's "one component" also covers a part in `primitives.tsx` used by several slide types,
  since `CLAUDE.md` makes such a part the owner.
- `.card-text-*` is D rather than B: six types use it and the fit guard drives it.
- The night overrides are D (theme switch) although they exist through a Tailwind misuse.
- No blind review ran: the run changed nothing a reader sees.
