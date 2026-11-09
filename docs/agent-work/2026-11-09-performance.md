# Performance, 09.11.2026

The polish run since 2764f22 changed no page on purpose. One of its own fixes moved chart code
onto every page, and this run caught and reverted that before release. The catalog is a static site
(GitHub Pages), so there is no endpoint to time.

## Method

- Lighthouse 13.6.0, mobile preset, Chrome for Testing 156, headless with a fresh profile per run.
- Both builds served by a scratch Bun server under `/slides`, with gzip and `max-age=600`, as Pages
  serves them. Before: a detached worktree on 9a04bab, built with `astro build --root catalog`.
  After: the working tree with this run's fixes.
- Three runs per page and build, before and after interleaved, median. Each run waited while the
  1-minute load was above the 16 cores; it never was.

## Lighthouse, before and after

Scores are performance / accessibility / best practices / SEO. LCP in ms, median (range); bytes
are the total transfer in KB. 1-minute load over the batch: 4.38 to 7.23.

| Page                                        | Before         | After          | LCP before       | LCP after        | KB before → after |
| ------------------------------------------- | -------------- | -------------- | ---------------- | ---------------- | ----------------- |
| Home `/slides/`                             | 100/100/100/92 | 100/100/100/92 | 1201 (1201–1202) | 1201 (1201–1201) | 363 → 363         |
| Story page `/dashboard/Types/title-slide/…` | 99/100/100/92  | 98/100/100/92  | 1802 (1802–1803) | 2104 (1802–2404) | 381 → 381         |
| Story frame `/stories/Types/title-slide/…`  | 94/100/100/92  | 94/100/100/92  | 3077 (3077–3077) | 3077 (3077–3078) | 349 → 349         |
| Part page `/dashboard/Parts/axis-tick/…`    | 98/100/100/92  | 98/100/100/92  | 2103 (1802–2328) | 2103 (1803–2478) | 409 → 409         |
| Print page `/catalog/print/`                | 93/96/100/100  | 92/96/100/100  | 2551 (2400–3301) | 2701 (2551–3001) | 1304 → 1304       |
| Frames `/catalog/print/frames.html`         | 100/100/100/91 | 100/100/100/91 | 1051 (1051–1051) | 1051 (1051–1051) | 1242 → 1242       |

- **The story page's 300 ms is noise.** Its two builds differ by 88 bytes of HTML, a removed
  comment, and transfer the same bytes. Five more runs each, after first: before 2103
  (1801–2404), after 2404 (1801–2627), load 4.3 to 5.5. Then one factor changed, the two servers
  swapped builds: before 2104 (1802–2854), after 2103 (1801–2704), load 5.9 to 10.7. Simulated
  LCP moves in steps of about 300 ms here.
- Accessibility on the print page reads 96 in both builds. The SEO score of 92 on the catalog pages
  differs from the 60 to 63 the 08.11. report gave; this run did not look into why.

## What this run caught

The guide line of a marked trend now ends on the value axis's floor. The first version put the
shared tick helper, `trendTicks`, into `lib/slide-utils.ts`. Recharts' tick code then moved into
the `primitives` chunk, which every page loads. JavaScript per chunk, gzip, in bytes:

| Chunk        | 9a04bab | Helper in `slide-utils` | Helper in `ChartPlots` (shipped) |
| ------------ | ------- | ----------------------- | -------------------------------- |
| `primitives` | 44,918  | 51,825                  | 44,918                           |
| `ChartPlots` | 110,132 | 103,800                 | 110,194                          |

Home, story page and story frame each transferred 6 to 7 KB more in that build. The helper now
lives in `components/slides/ChartPlots.tsx`, and the transfer sizes above match 9a04bab.

## `bun run preview`

It failed from the repo root with `ENOENT … catalog/astrobook/pages/app.astro`. The 08.11. report
named the working directory as the factor. This run found a second one, the runtime:

| Runtime | From the root, `--root catalog` | From `catalog/`, `--root .` |
| ------- | ------------------------------- | --------------------------- |
| Bun     | fails                           | serves                      |
| Node    | serves                          | not run                     |

The failure needs both, Bun and the root. The `preview` script now runs Astro under Node, and
`test/pages/preview.test.ts` fails when `bun run preview` stops serving the build. Bun resolves
`astrobook/pages/app.astro` from both directories when asked directly, so the cause inside Astro's
preview under Bun is not yet explained. Scaffolding's documented script keeps `bun --bun`.

## Still true from 08.11., not measured again

- Measure with gzip. Served uncompressed, a state page read 5.5 s of simulated LCP against 1.9 s
  with gzip, the same build (120eec5). Pages and `astro preview` both send gzip.
- A state page's own style stays inline only under Astro's 4 KB limit. Past it, every state page
  loads a render-blocking `state.*.css`, which cost 350 ms under devtools throttling. A page test
  fails when a state's page links a stylesheet the home does not.
- The catalog shell's render-blocking stylesheet costs about 800 ms of simulated LCP on story and
  part pages. The fix belongs to scaffolding's catalog shell.
- A story frame mounts its slide after hydration on purpose, so its entrance plays: 3.1 s mobile
  LCP.
- Part frames other than `CodePanel` load no highlighter since 3d00ec7, which closed the open point
  of 08.11.

## Code-splitting per slide type, 10.11.2026

`lib/slide-components.ts` imports all 25 slide types statically. Measured with `Bun.build`
(minified, browser target, React, motion, recharts, shiki, lucide and brand external), JavaScript
only:

| Entry                                                 | Minified | Gzip   |
| ----------------------------------------------------- | -------- | ------ |
| All 25 types                                          | 159,041  | 41,840 |
| The 9 types one real 22-slide talk uses (09.11.)      | 110,579  | 28,491 |
| Saved per deck page by loading only the types it uses | 48,462   | 13,349 |

13 KB gzip is about 4 % of the 349 KB a story frame transfers (table above). Splitting would load
each type's chunk on the slide change that first needs it, behind a Suspense boundary, in the deck,
the speaker view and the print route. Not done: the threshold set before measuring was 10 % of a
deck page's transfer. Worth it once a type brings a heavy dependency of its own, as the chart's
plots already load lazily.
