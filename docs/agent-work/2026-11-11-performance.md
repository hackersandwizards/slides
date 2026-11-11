# Performance, 11.11.2026

The evening polish run since c3178ed changed the start row's h&w logo size, the first-slide hints,
the figure sizing constants and the pptx and density scripts, and none of the catalog pages got
slower. Across the build, the gzipped JavaScript grew by 34 bytes, from 412,913 to 412,947 over 88
files. The catalog is a static site (GitHub Pages), so there is no endpoint to time.

## Method

- Before: a detached worktree on 1847348, built with `bun run build`. After: the working tree with
  the run's fixes, built the same way.
- Both served by `scripts/serve-dir.ts` under `/slides`, uncompressed. Chrome for Testing 157
  through the project's puppeteer, headless, a fresh browser context per load, 1350x940.
- LCP and FCP as the page reports them (`PerformanceObserver`), unthrottled on 127.0.0.1: these are
  real local paints, not Lighthouse's simulated mobile LCP, which the morning run of this report
  measured. No Lighthouse CLI is installed (none on the path, in the global Bun packages or in this
  repository's `node_modules/.bin`), and the run installed nothing outside the project.
- Five rounds, each loading every page on both builds back to back, the order alternating per round.
  Each round first waited up to five minutes for the 1-minute load to fall to the 16 cores. The
  load read 9.3 to 22.4 during the series; each before and after pair ran under the same load.
- Control: the same build served as before and after in one round read the story frame at 660 ms
  both, and the print page at 160 and 128 ms: about 30 ms of noise.

## Before and after

LCP and FCP in ms, median (range) of five loads.

| Page                                        | LCP before    | LCP after     | FCP before    | FCP after     |
| ------------------------------------------- | ------------- | ------------- | ------------- | ------------- |
| Home `/slides/`                             | 60 (52–112)   | 68 (52–96)    | 60 (52–112)   | 68 (52–96)    |
| Story page `/dashboard/Types/title-slide/…` | 72 (52–92)    | 68 (48–80)    | 52 (48–92)    | 56 (48–64)    |
| Story frame `/stories/Types/title-slide/…`  | 668 (652–772) | 688 (656–692) | 52 (32–76)    | 56 (36–68)    |
| Print page `/catalog/print/`                | 132 (120–136) | 132 (120–168) | 132 (120–136) | 132 (120–168) |

Every gap lies inside the other build's range.

## Lighthouse, this morning: c5cba59 against f32b1dc

The polish run since 28beb99 measured with Lighthouse 13.6.0 (mobile preset, Chrome for Testing 156),
both builds served with gzip and `max-age=600` as Pages serves them, three interleaved rounds at
loads of 15 to 111. Scores are performance / accessibility / best practices / SEO of the median run,
LCP simulated, in ms, median (range); KB the total transfer. CLS read 0.001 or less in every run.

| Page                                        | Before                 | After                 | LCP before       | LCP after        | KB   |
| ------------------------------------------- | ---------------------- | --------------------- | ---------------- | ---------------- | ---- |
| Home `/slides/`                             | 100/100/100/92         | 100/100/100/92        | 1202 (1202–1203) | 1203 (1202–1204) | 496  |
| Story page `/dashboard/Types/title-slide/…` | 90/100/100/92          | 89/100/100/92         | 3606 (3460–3837) | 3756 (2657–3763) | 448  |
| Story frame `/stories/Types/title-slide/…`  | 91/100/100/92          | 91/100/100/92         | 3457 (3455–3460) | 3461 (3343–3474) | 377  |
| Print page `/catalog/print/`                | 97/100/100/100         | 95/100/100/100        | 2101 (2100–2701) | 2400 (1950–2401) | 1301 |
| Page                                        | 9a04bab LCP, KB        | f32b1dc LCP, KB       |
| -----------------------------               | ---------------------- | --------------------- |
| Story page, title-slide state               | 4877 (4728–5929), 1219 | 6531 (6530–6680), 992 |
| Story frame, same state                     | 6456 (6455–6528), 939  | 5852 (5778–5854), 841 |

- **The frame got faster and transfers less.** It now also loads the static Inter 500 and 700 its
  slide draws in, which the 9a04bab build never fetched. Blocking every woff2 saved 150 ms on the
  frame and 300 ms on the story page.
- **The story page read about 1.6 s slower** while it transfers less. Its LCP element is the
  catalog shell's header logo in both builds. The control in `2026-11-11-figure-review.md` shows
  Lighthouse's simulated LCP swinging between 1.8 and 7.5 s on both builds with the story frame,
  and holding 1.8 to 1.9 s without it: no slower page.
- Home transfers 496 KB against 363 KB on 09.11.: it now loads the shell's Inter Variable and the
  slide's static faces, 137 KB together, at the same score and LCP.

## `bun run preview`

It failed from the repo root under Bun with `ENOENT … catalog/astrobook/pages/app.astro`, and
served from `catalog/` or under Node. The `preview` script runs Astro under Node, and
`test/pages/preview.test.ts` fails when `bun run preview` stops serving the build. The cause inside
Astro's preview under Bun is not yet explained. Scaffolding's documented script keeps `bun --bun`.

## Still true from 08.11., not measured again

- Measure with gzip. Served uncompressed, a state page read 5.5 s of simulated LCP against 1.9 s
  with gzip, the same build (120eec5). Pages and `astro preview` both send gzip.
- A state page's own style stays inline only under Astro's 4 KB limit. Past it, every state page
  loads a render-blocking `state.*.css`, which cost 350 ms under devtools throttling. A page test
  fails when a state's page links a stylesheet the home does not.
- The catalog shell's render-blocking stylesheet costs about 800 ms of simulated LCP on story and
  part pages. The fix belongs to scaffolding's catalog shell.
- A story frame mounts its slide after hydration on purpose, so its entrance plays.
- Part frames other than `CodePanel` load no highlighter since 3d00ec7.

The story page's and the print page's gaps were noise: both builds transfer the same bytes, and each
range overlaps the other build's median. Simulated LCP moves in steps of about 300 ms.

## Since 09.11.: the story page slower, the frame not

In this morning's Lighthouse run of f32b1dc (simulated mobile LCP, served with gzip), the story
page and frame read 3.5 to 3.8 s, against 1.8 to 3.1 s on 09.11. To separate
the build from the load, both 9a04bab (the 09.11. build) and f32b1dc were served uncompressed by
`scripts/serve-dir.ts` and run three times each, interleaved, at loads of 18 to 33:

| Page                          | 9a04bab LCP, KB        | f32b1dc LCP, KB       |
| ----------------------------- | ---------------------- | --------------------- |
| Story page, title-slide state | 4877 (4728–5929), 1219 | 6531 (6530–6680), 992 |
| Story frame, same state       | 6456 (6455–6528), 939  | 5852 (5778–5854), 841 |

- **The frame got faster and transfers less.** It now also loads the static Inter 500 and 700 its
  slide draws in, which the 9a04bab build never fetched. Blocking every woff2 saved 150 ms on the
  frame and 300 ms on the story page.
- **The story page read about 1.6 s slower** while it transfers less. Its LCP element is the
  catalog shell's header logo in both builds. The control in `2026-11-11-figure-review.md` shows
  Lighthouse's simulated LCP swinging between 1.8 and 7.5 s on both builds with the story frame,
  and holding 1.8 to 1.9 s without it: no slower page.
- Home transfers 496 KB against 363 KB on 09.11.: it now loads the shell's Inter Variable and the
  slide's static faces, 137 KB together, at the same score and LCP.

## `bun run preview`

It failed from the repo root under Bun with `ENOENT … catalog/astrobook/pages/app.astro`, and
served from `catalog/` or under Node. The `preview` script runs Astro under Node, and
`test/pages/preview.test.ts` fails when `bun run preview` stops serving the build. The cause inside
Astro's preview under Bun is not yet explained. Scaffolding's documented script keeps `bun --bun`.

## Still true from 08.11., not measured again

- Measure with gzip. Served uncompressed, a state page read 5.5 s of simulated LCP against 1.9 s
  with gzip, the same build (120eec5). Pages and `astro preview` both send gzip.
- A state page's own style stays inline only under Astro's 4 KB limit. Past it, every state page
  loads a render-blocking `state.*.css`, which cost 350 ms under devtools throttling. A page test
  fails when a state's page links a stylesheet the home does not.
- The catalog shell's render-blocking stylesheet costs about 800 ms of simulated LCP on story and
  part pages. The fix belongs to scaffolding's catalog shell.
- A story frame mounts its slide after hydration on purpose, so its entrance plays.
- Part frames other than `CodePanel` load no highlighter since 3d00ec7.
