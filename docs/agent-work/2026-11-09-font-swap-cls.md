# Layout shift on a slide's first paint, 09.11.2026

A consumer measured a layout shift of 0.084 on a story page, always on a block with
`data-entrance`, in 2 of 14 Lighthouse runs on one build and 5 of 14 on the next. This report
names the cause and what slides v2.17.1 changes.

## Cause: the web font swaps in after the first paint

The block is the entrance wrapper, but the entrance never runs there: a slide drawn from the
server's markup opens with `initial={false}`. What moves is the text inside it. `slides.css` loads
brand's static faces with `font-display: swap`, so a page painted before a face arrived draws the
fallback face first, and the swap changes its line breaks.

Setup: the catalog's prose story, rendered on the server as a consumer's story page renders it
(the catalog's own stories mount the slide after hydration and never shift), puppeteer with Chrome
for Testing 156, 412 × 823 px at 1.75, the size Lighthouse's mobile preset uses. One factor
changed per series, 30 runs each:

| Series                       | Runs with a shift | CLS   | Load      |
| ---------------------------- | ----------------- | ----- | --------- |
| unchanged                    | 19/30             | 0.034 | 15.7–20.0 |
| hydration script blocked     | 15/30             | 0.034 | 19.0–22.2 |
| web fonts blocked            | 0/30              | 0     | 13.0–22.2 |
| Inter on a metric fallback\* | 0/30              | 0     | 4.3–8.9   |
| beside it, unchanged         | 8/30              | 0.034 | 4.5–11.6  |

\* An Arial face with `size-adjust: 107.06%`, `ascent-override: 90.49%`,
`descent-override: 22.56%`, `line-gap-override: 0%`, injected into the page.

The entrance, hydration and the shell's fit are ruled out: with no script the shift stays. The
rate follows the machine's load (8/30 at load 5, 19/30 at load 16 to 20), which can explain 2 of
14 against 5 of 14 without any change between the two builds. That part is not controlled.

On the deck page (`DeckView`) the moving block holds a JetBrains Mono heading: the Inter fallback
leaves its rate as it was (9/30 against 6/30).

## What v2.17.1 changes

`SlideContainer` preloads four of the static faces: Inter 400 and 500, JetBrains Mono 500 and 700.
Across the 115 specimen story states with no preload, these four are every face of 59 (1440 px) and
61 (412 px) slides, more than any other four. Three faces cover 44, six cover 95 but leave 2.3 to
2.4 preloaded faces unused per page.

Preloads kept against stripped on one build, alternating blocks of 10. Rows marked † ran with an
earlier set, Inter 400, 500 and 700 with JetBrains Mono 700, which covers those pages as well:

| Page                                   | Kept  | Stripped | Load      |
| -------------------------------------- | ----- | -------- | --------- |
| deck page, puppeteer                   | 3/30  | 12/30    | 8.0–23.3  |
| deck page, Lighthouse 13.6.0 mobile †  | 2/12  | 7/12     | 7.6–17.1  |
| prose story, all its faces preloaded † | 2/30  | 14/30    | 10.5–15.5 |
| prose story, Inter 700 not in the set  | 14/30 | 9/30     | 9.6–23.3  |

A slide drawing a face outside the set gains nothing; the difference on the last row is within
chance (p ≈ 0.3). A preload only moves the race.

## Re-measured on brand v2.2.0

Brand v2.2.0 puts metric-matched fallback faces for both families in the stacks. Setup as above, on
the deck page, the first slide, 30 runs per cell in alternating blocks of 10, every cell a fresh
browser context. "Slow 4G" is 1.6 Mbit/s and 150 ms latency. The phone rows are Chrome's emulation on a Mac, which has Arial: a device without the fallback's local font skips the face.

The phone's position pill ("1 / 125") was 94.8 px wide in the fallback and 87.8 px in Inter, which
moved the next-slide button 3.5 px. Its width now follows the digit count of the deck: the button
reads the same x in both faces (282.2 px at 412).

Preload kept against stripped, with the pill fixed:

| Width, network | Runs with a shift, kept | Stripped | CLS, kept | Stripped | First paint, kept | Stripped |
| -------------- | ----------------------- | -------- | --------- | -------- | ----------------- | -------- |
| 412, slow 4G   | 0/30                    | 30/30    | 0         | 0.0039   | 2860 ms           | 2388 ms  |
| 1440, slow 4G  | 0/30                    | 0/30     | 0         | 0        | 2852 ms           | 2376 ms  |
| 412, local     | 0/30                    | 0/30     | 0         | 0        | 40 ms             | 40 ms    |
| 1440, local    | 0/30                    | 0/30     | 0         | 0        | 40 ms             | 40 ms    |

The preload stays: it removes the one shift the run still finds. It costs about 470 ms of first
paint on slow 4G (why is not controlled). The prose story at 1440 shows the same cost (2412 against 1944 ms). At 412 the prose story often had
not painted when the run read it, so its zeros say nothing.

The shift left without the preload is the title's subtitle, whose `text-wrap: balance` picks a
different break in the two faces. Against the same page with the font delayed 600 ms, 412 px:

| `text-wrap` | Runs with a shift | CLS    |
| ----------- | ----------------- | ------ |
| `balance`   | 30/30             | 0.0039 |
| `pretty`    | 0/30              | 0      |
| `wrap`      | 0/30              | 0      |

That shows one string, and at 1440 all three are 0/30. Four subtitles at 55 widths from 360 to
1440 px, comparing the lines in the fallback with the lines in the web face:

| `text-wrap` | Breaks differ | Line count differs | Last line a single word, web |
| ----------- | ------------- | ------------------ | ---------------------------- |
| `balance`   | 6 of 220      | 2                  | 0                            |
| `pretty`    | 5 of 220      | 2                  | 0                            |
| `wrap`      | 5 of 220      | 2                  | 19                           |

`balance` stays. A changed break comes from the faces' small width difference, under any of the
three settings, on a different string each time. Dropping it would trade this string's shift for
another's, and plain `wrap` brings back the lone last word the setting was added against.

## Preload measured against the 0.01 bar: kept

A real build with the preload and one without, every story server-rendered as a consumer's is, 30
runs per cell in alternating blocks of 10, each in a fresh browser context with the cache off, Chrome
for Testing on a Mac at load 7 to 54. CLS is the sum of the layout-shift entries once the page has
painted, its fonts have loaded and 1.2 s have passed. Slow 4G as above; 240 runs on the local network
show no shift anywhere.

With the metric-matched faces drawing, as on a device that has Arial:

| Page, width, slow 4G | Runs with a shift, kept | Stripped | CLS, kept | Stripped | First paint, kept | Stripped |
| -------------------- | ----------------------- | -------- | --------- | -------- | ----------------- | -------- |
| deck, 412            | 0/30                    | 30/30    | 0         | 0.0039   | 2728 ms           | 2280 ms  |
| deck, 1440           | 0/30                    | 0/30     | 0         | 0        | 2730 ms           | 2280 ms  |
| prose story, 412     | 0/30                    | 0/30     | 0         | 0        | 2328 ms           | 1884 ms  |
| prose story, 1440    | 0/30                    | 0/30     | 0         | 0        | 2328 ms           | 1876 ms  |

Brand v2.2.0's fallback faces name `local("Arial")` and `local("Courier New")` only. On a device without
them the face is skipped and the next family in the stack draws. Simulated
on this Mac by renaming those `local()` sources in the served CSS, 412 px, 30 runs per cell (the
generic that draws here is the Mac's system font, which another device's need not match):

| Page, width, slow 4G | Runs with a shift, kept | Stripped | CLS, kept | Stripped | First paint, kept | Stripped |
| -------------------- | ----------------------- | -------- | --------- | -------- | ----------------- | -------- |
| deck, 412            | 0/30                    | 30/30    | 0         | 0.0052   | 2728 ms           | 2280 ms  |
| prose story, 412     | 30/30                   | 30/30    | 0.0013    | 0.0323   | 2328 ms           | 1882 ms  |

Control of the same shape, the fallback faces kept but their metric overrides removed: the story at
412 px reaches 0.0311 stripped against 0 kept, the deck 0.0054 against 0, 1440 px 0.0014 to 0.0015
against 0 (30 runs per cell). The zero in the Arial table is a measurement that can fail.

Over the 0.01 bar stands only the story at 412 px on a device without Arial, 0.0323. The preload
stays, at a cost of 444 to 452 ms of first paint on slow 4G.

## Re-measured with Android's Roboto on brand v2.4.1, 10.11.2026: kept

Brand v2.4.0 adds "Inter Fallback Roboto", metric-matched to Android's Roboto, and names Droid
Sans Mono, whose advances equal Courier New's, in the mono fallback. Both builds pin brand v2.4.1. Setup: Debian sid's
Chromium 156.0.8078.79 in a container, Android's variable `Roboto-Regular.ttf` and
`DroidSansMono.ttf` from AOSP `main` as the only fonts, no Arial, Liberation or DejaVu. The
catalog's server-rendered stories from one build with the preload and one without, 412 × 823 at
1.75 without `isMobile`, slow 4G as above, 30 runs per cell in alternating blocks of 10, each a
fresh context with the cache off, host load 6.5 to 19. CLS as above. With the font files blocked,
`CSS.getPlatformFontsForNode` reads Roboto for the running text and Droid Sans Mono for the
heading. The control is the build without the preload, with every metric override removed from
its CSS.

| Page, 412, slow 4G | Runs with a shift, kept | Stripped | Control | CLS, kept | Stripped | Control | First paint, kept | Stripped |
| ------------------ | ----------------------- | -------- | ------- | --------- | -------- | ------- | ----------------- | -------- |
| prose story        | 0/30                    | 22/30    | 30/30   | 0         | 0.0894   | 0.0327  | 4900 ms           | 4624 ms  |
| deck view story    | 0/30                    | 0/30     | 30/30   | 0         | 0        | 0.0050  | 2792 ms           | 2336 ms  |

The two shifts differ. The control's shift is the one from 09.11: three blocks of the prose story
move down for good. Brand's Roboto overrides remove it; no stripped run shows it. The stripped
shift is new: the text after the bold run of the last paragraph drops one line and returns 15 ms
later, 0.0382 plus 0.0512, about 470 ms after first paint. Its cause is not yet explained. With no
throttling and every font file held 1500 ms after navigation and released together, 10 runs per
cell, it still appears in 2/10 without the preload and 1/10 with it, and the control shows its own
shift in 10/10. So a face arriving after the others does not explain it alone. Nor does a bold
fallback drawn from the regular instance: with the fonts blocked the bold run draws Roboto at 700,
177.6 px against Inter Bold's 175.1 px, and the paragraph's sentence at 700 measures 1054.4 against
1050.8 px.

The deck view story shows no subtitle shift stripped, where the 09.11 deck page shifted 30/30 at
0.0039 to 0.0052. That this story draws the same slide as the 09.11 deck page is not checked.

The preload stays: without it the prose story at 412 px reaches 0.0894, over the 0.01 bar. Its
cost here is 276 ms (prose) and 456 ms (deck) of first paint. It can go once the stripped shift is
explained and gone at 412 px on Roboto.

## Open

- The cause of the stripped prose story's 0.0894 shift on Roboto, above: not yet explained.
- Whether the dev server fetches a preloaded face twice: not checked, the catalog's dev server did
  not start within its 30 s limit at load 20.
