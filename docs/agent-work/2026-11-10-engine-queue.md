# Engine queue, 10.11.2026

Four open engine items from the queue audit, each measured on a build of `main` at v2.21.2 (brand
v2.7.0, scaffolding v5.7.7). Chrome for Testing 156.0.8078.47, headless, temporary profile, the
build served by `test/pages/serve-dist.ts`, which does not compress.

## 1. Split the slide types out of the deck bundle: no

`lib/slide-components.ts` imports every slide type. The heavy parts load already on demand: the
recharts plots (`ChartPlots`, 389 KB) and the code highlighter (462 KB) are `lazy()` chunks.

What the deck view story (`/stories/Deck/deck-view/specimen-deck/`) ships statically:

| Measure                                              | Raw       | gzip      |
| ---------------------------------------------------- | --------- | --------- |
| All JavaScript, 37 files                             | 571,073 B | 193,349 B |
| The slide-type chunks among them, `Visuals` included | 124,356 B | 43,610 B  |

LCP on that story, 1440 x 810, 1.6 Mbit/s with 150 ms latency, CPU slowed 4x, four runs each:

| Run                     | LCP               |
| ----------------------- | ----------------- |
| As built                | 3,056 to 3,068 ms |
| JavaScript switched off | 2,940 to 2,956 ms |

Dropping every script moves LCP by about 110 ms, and the slide-type chunks are a fifth of the
scripts. A split would save a deck page some of those 44 KB gzip at most, since every deck uses
the title, content and statement types. The page server sends raw bytes, so the 110 ms already
overstates what JavaScript costs. The story bundle also carries the specimen deck, which a
consumer's deck page does not. A split would add a loading gap to the first slide of each type a
presenter reaches. Not built.

## 2. scaffolding's `dashboardCss` for the catalog: yes

The viewport scaling in `styles/slides.css` (`html:has(.slide-viewport, .slide-story)`) is no
duplicate of `dashboardCss`: that option lists the stylesheets of a state's page. The `.slide-story`
selector scales the story page that `catalog/SlideFrame.astro` draws, in this catalog and in each
consumer's, so it stays.

What `dashboardCss` and `homeCss` fix: the catalog loaded brand's tokens and `elements.css` on
every page. The home and each state's page declared no `@font-face` (0 against 34 on a story
page), so their header and story bar fell back to system faces. Each story page loaded
`elements.css` (125,617 B) beside `slides.css`, which imports the elements a slide draws.

Now `css` is the tokens alone, `homeCss` adds `fonts.css` and `elements.css`, and `dashboardCss`
adds `fonts.css` and brand's focus ring (`elements/focus.css`, 1,537 B), which `Head.astro` turns
on and `elements.css` used to bring. Stylesheets linked per page, chart slide's bar state:

| Page           | Before                          | After                           |
| -------------- | ------------------------------- | ------------------------------- |
| Home           | 131,004 B, 0 faces              | 140,077 B, 14 faces             |
| A state's page | 125,617 B (20,749 gz), 0 faces  | 39,002 B (6,985 gz), 14 faces   |
| A story page   | 303,216 B (69,066 gz), 34 faces | 207,509 B (54,090 gz), 34 faces |

Screenshots of all 282 built pages at 1440 x 900, before and after: every story page is
pixel-identical except one, which also differs between two runs of the same build (4 of 277 pages
did). The home and every state's page changed: their header and bar now set Inter.

## 3. `numbered` in `gridAsContent`: live, kept

`gridAsContent` sets `numbered` where no card names an icon. Removed, the built print page stays
byte-identical, since it shows no replaced grid slide. The story of the specimen's "Pillars
continued, all active" slide (`numberFrom: 5`, no icons) then loses its number tiles 5 and 6. The
line stays. The comment above `Cards` in `components/slides/Visuals.tsx` names the `four-column`
and `labeled-grid` blocks, which `deprecated.values.type` still lists and the engine still
converts, so it is accurate.

## 4. Bar and trend tiles on `/catalog/print/`: drawn at once, the stall not yet explained

Both tiles frame their story page. Their plots grew in, as on a slide reached in a deck. Sampled
every 100 ms after the tile came into view:

| Where                                    | Bars drawn                                    |
| ---------------------------------------- | --------------------------------------------- |
| Story page alone                         | growing from 0.4 s, whole at 0.8 s            |
| Bar slide reached in the deck view story | growing from 0.4 s, whole at 0.7 s            |
| Print page, tab in view                  | none until 2.4 to 6 s, then whole in one step |
| Print page, tab in the background        | none in 7 s                                   |

With `prefers-reduced-motion: reduce`, which stops recharts' growth, the print page draws the
bars at once, so the growth animation is on the path. Animation frames ran at 60 per second in the
tile throughout. Removing every other frame of the page, starting the frame off-screen and scaling
it changed nothing; a lone frame on an empty page grows normally. Why the growth waits on the
print page is not yet explained. A background tab runs no animation frame, so there the tile stays
empty.

Fix: a plot on a slide opening revealed draws at once, as on a printed slide and on the slide a
page load opens on (`usePlot` in `components/slides/ChartSlide.tsx`, which `DrawIn` reads too).
Revealed is `?revealed`, which every catalogue tile and story page carries, or a slide reached
backwards, as for every other build step. A deck stepping forward onto a chart still grows it. A chart story in the catalog
no longer shows the growth; the deck view story does. `test/pages/print-chart-cards.test.ts` failed
before the fix on both tiles (a bar group without its bar, an area under recharts' growing clip)
and passes after it. The stall itself stays open in
`items/work-print-frame-stall.md`.
