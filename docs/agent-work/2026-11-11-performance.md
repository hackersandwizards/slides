# Performance, 11.11.2026

The polish run since 28beb99 changed the logo row, the fit guard's `data-fitted` mark and the
activity timer, and none of the catalog pages got slower. Every page transfers the same bytes
before and after. Across the whole build, the gzipped JavaScript grew by 79 bytes, from 412,189 to
412,268 over 88 files. The catalog is a static site (GitHub Pages), so there is no endpoint to time.

## Method

- Lighthouse 13.6.0, mobile preset, Chrome for Testing 156, headless with a fresh profile per run.
- Both builds served by a scratch Bun server under `/slides`, with gzip and `max-age=600`, as Pages
  serves them. Before: a detached worktree on c5cba59, built with `astro build --root catalog`.
  After: the build of f32b1dc that the gate made.
- Three rounds, each running every page on both builds back to back, before and after interleaved,
  median. Each round first waited up to five minutes for the 1-minute load to fall to the 16 cores.
- Other sessions' test runs held the load high: 49 to 111 in round 1, 21 to 32 in round 2, 15 to
  18 in round 3. Each before and after pair ran under the same load.

## Lighthouse, before and after

Scores are performance / accessibility / best practices / SEO, of the median run. LCP in ms, median
(range); KB is the total transfer. CLS read 0.001 or less in every run.

| Page                                        | Before         | After          | LCP before       | LCP after        | KB   |
| ------------------------------------------- | -------------- | -------------- | ---------------- | ---------------- | ---- |
| Home `/slides/`                             | 100/100/100/92 | 100/100/100/92 | 1202 (1202–1203) | 1203 (1202–1204) | 496  |
| Story page `/dashboard/Types/title-slide/…` | 90/100/100/92  | 89/100/100/92  | 3606 (3460–3837) | 3756 (2657–3763) | 448  |
| Story frame `/stories/Types/title-slide/…`  | 91/100/100/92  | 91/100/100/92  | 3457 (3455–3460) | 3461 (3343–3474) | 377  |
| Print page `/catalog/print/`                | 97/100/100/100 | 95/100/100/100 | 2101 (2100–2701) | 2400 (1950–2401) | 1301 |

The story page's and the print page's LCP gaps are noise: before and after transfer the same bytes,
and each range overlaps the other build's median. Simulated LCP moves in steps of about 300 ms
here, as on 09.11. Story pages and frames read 0.4 to 1.8 s slower than on 09.11. in both builds;
this run measured under a load up to seven times the core count and did not look into it.

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
