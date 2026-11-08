# `styles/slides.css`: where its rules live

The analysis of 06.11. (read at v1.8.0), carried out as far as a change leaves every page's pixels
unchanged (v1.19.0); the rules brand took over left in v1.23.0 (brand v1.32.1). This file keeps the
measurement and why the rest stays.

## Measured at v1.18.0, before the change

- `styles/slides.css`: 841 lines, 776 not blank, 146 selectors.
- Grep over `components/`, `lib/`, `catalog/`, `specimen/`, `types/`: no file sets `.border-r`,
  `.border-x`, `.border-y` or `.p-10` (control: `.border-b` 2 hits, `.p-8` 3). In the consumers
  (talks, trainer-hub, hycle-private, read-only) only trainer-hub's own pages set `border-y`,
  outside the slide scope that the hairline overlay is limited to.
- The built catalog (530 pages) opened in headless Chrome at 1920x1080, every selector's matches
  counted: 121 selectors match, 25 match nothing. Control: `.slide-body` 584 matches, a class no
  file sets 0. The zeros:
  - `.slide-media-stack` (7 selectors): no specimen slide holds two pictures.
  - pipeline `data-step` 1 to 3 (10): no specimen pipeline wraps.
  - `.slide-corner-start` (3): no specimen deck has a partner logo.
  - `.slide-flow-long` loop label and label (3): no long flow with a loop in the specimen.
  - night `.bg-background`, night `.text-white`, `canvas` in print (3).

## What changed

Placement decided by a code review of four options (Claude and Codex, the same unprimed brief, one
run each): a file beside the component imported by `slides.css` where its rules stood, a file the
component imports, utilities in the component, or staying in `slides.css`. Both chose the first as
the default: it keeps the compiled stylesheet as it is, while the other two would bring the rules
to trainer-hub's hub pages, which render engine components without `slides.css`, and could change
the cascade order.

| Moved to                                  | Rules                                                               | Non-blank lines |
| ----------------------------------------- | ------------------------------------------------------------------- | --------------: |
| `components/slides/Visuals.css`           | the flow and framed flow on a phone                                 |             117 |
| `components/slides/SlideContainer.css`    | the viewport, the corner row on a phone, the control bar below `sm` |              73 |
| `components/slides/PrintSlide.css`        | the printed page and its watermark                                  |              28 |
| `components/slides/TeamTopologySlide.css` | the octagon                                                         |              18 |
| `components/slides/ProcessSlide.css`      | the cycle's canvas hidden from `md` up                              |               6 |
| `components/slides/ClosingSlide.css`      | the closing lockup hides the corner                                 |               5 |

- Group A: `.text-gradient-brand` (flat teal under a gradient's name) became the theme's
  `text-primary` in `StatementSlide` and `ComparisonSlide`: `--color-primary` is
  `var(--color-teal)`, on night too.
- Group E: `.border-r`, `.border-x`, `.border-y` left the hairline overlay, `.p-10` the phone rule,
  `-ms-overflow-style` the viewport, and the legacy `page-break-*` gave way to `break-after` and
  `break-inside`.
- `slides.css` now: 507 lines, 461 not blank (776 before). Every stylesheet together: 755 not blank.
- `test/tokens.test.ts` reads `slides.css` and every stylesheet it imports for raw values, and
  fails on a stylesheet beside a component that `slides.css` does not import or a component imports
  itself (controls: a `padding: 3px`, an unimported file and a component's own import each fail
  it).
- The compiled print stylesheet before and after differs only by the removals above and by the
  phone corner rules, which now follow the phone flow rules: no element carries both.
- Pixels: every catalog page (530, the print page with every specimen slide included) at 1920x1080
  and at 375 px with phone emulation, a slide that scrolls inside its viewport shot screen by
  screen, before and after, compared pixel by pixel. Of 1,304 tiles (544 at 1920, 760 at 375),
  1,287 are identical. The 17 others lie on pages whose render depends on timing, which two runs of
  the unchanged build show as well: an iframe caught before its slide enters, a video before its
  first frame, the fit guard's two stable layouts on the density and timeline slides. Each was shot
  three more times per build: every one of those after-shots equals a before-shot. In 4 tiles the
  first after-shot was a state the before build never showed in 4 shots, and the after build never
  showed again. Control: the octagon's cut set to 0 in a copy of the build differs at both sizes.

## Why the rest stays in `slides.css`

- **`.bg-section-*`**: trainer-hub's `src/lib/__tests__/deck-assets.test.ts` reads the class names
  from the text of `slides.css`; they move to `lib/section-styles.ts`' owner only after that test
  reads an exported list. The `--slide-ground` in `.bg-section-intro` is not dead: it resolves
  `--background` on its own element, which a night element redefines.
- **Kept on purpose** (both reviewers): the slide body with its media, timeline and growing-child
  `:has()` rules, whose spacers compete at equal specificity; `.slide-title`, which the phone rule
  also sets; the hairline overlay; the phone layout over every slide type, until each type carries
  `max-md:` variants.
- **Brand's since v1.23.0**: the stage marker size and the capitals marker (brand's stage scale
  and `marker.css`), the stage pill (brand's preset), the heading and paragraph base
  (`text-base.css`), the selection colour (the browser's) and the player's cursor
  (`@hackersandwizards/brand/cursor.svg`).
