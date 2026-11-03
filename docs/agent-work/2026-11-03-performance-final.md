# Performance final run: slides

Final run of os item `work-make-every-frontend-snappier-all-os-pages`, 2026-11-03. The catalog was
already fast where slides owns the cost. This run released v0.30.0: the print catalog without its
font shift (CLS 0.131 to 0.011, Lighthouse performance 95 to 100, SEO 91 to 100), the frames page
from accessibility 84 to 96, list items and card headings a screen reader can follow, and the dev
print catalog, which answered 500, back on 200. Every page is pixel-identical.

## Method

- Production: `astro build` of the catalog (238 pages), served by a static server that emulates
  GitHub Pages (gzip, `max-age=600`, base `/slides`), before on 127.0.0.1:4683, after on :4685.
  Dev: `astro dev --ignore-lock` on a port in 4600-4699. Ports 4321-4323 untouched.
- Headless Chrome for Testing 156.0.8078.80, a temporary profile per series, a fresh context per
  load, 1440 x 900. Three runs per figure: median, range in brackets. Lighthouse 13, desktop and
  mobile presets, three runs.
- Load (1-minute average from `uptime`): 5.1-6.5 before, 9.1-12.5 after. The after series ran on a
  busier machine; its ranges carry that.
- Measured in the browser: catalog home, print catalog, frames page, 6 dashboards and 5 stories;
  Lighthouse on home, print, frames and one dashboard and story.

## Before and after

Production, median:

| Page           | LCP ms before | LCP ms after | KB before | KB after | Requests before / after |
| -------------- | ------------- | ------------ | --------- | -------- | ----------------------- |
| Catalog home   | 76 [64-80]    | 84 [64-88]   | 839       | 839      | 743 / 743               |
| Print catalog  | 120           | 120          | 1,455     | 1,449    | 934 / 960               |
| Frames         | 92            | 104 [96-108] | 1,136     | 1,136    | 27 / 28                 |
| Dashboards (6) | 36-48         | 36-56        | 271-379   | 271-379  | 26-32                   |
| Stories (5)    | 40-44         | 32-44        | 211-319   | 211-319  | 14-18                   |

The LCP shifts sit inside the load difference between the series. TTFB 1-3 ms throughout.

Lighthouse, performance / accessibility / best practices / SEO:

| Page          | Desktop before | Desktop after   | Mobile before  | Mobile after   |
| ------------- | -------------- | --------------- | -------------- | -------------- |
| Catalog home  | 100/96/100/91  | 100/96/100/91   | 97/100/100/91  | 97/100/100/91  |
| Print catalog | 95/100/100/91  | 100/100/100/100 | 99/100/100/91  | 99/100/100/100 |
| Frames        | 100/84/96/82   | 100/96/100/91   | 100/84/96/82   | 100/96/100/91  |
| Dashboard     | 100/100/100/90 | 100/100/100/90  | 100/100/100/90 | 100/100/100/90 |
| Story         | 100/100/100/90 | 100/100/100/90  | 100/100/100/90 | 100/100/100/90 |

Print catalog CLS 0.131 to 0.011 on desktop, 0.050 to 0.004 on mobile.

Dev: the print catalog answered 500 (`import.meta.resolve` in `catalog/print.ts`), now 200 at
14.8 MB, its fonts 187 KB (a dev response refetched them per iframe at 6.1 MB before the cache
header). Home, dashboards and stories unchanged (22.4, 12.4 and 12.0 MB unbundled source).

Starts: dev cold 1,159 [1,149-1,847] to 1,198 [1,177-2,184] ms, warm 1,102 [1,096-1,123] to
1,173 [1,172-1,229] ms, the after series at load 11-12 against 5. No start-path code changed, so
the difference is load. Build 1.67-2.33 s before, 1.65-2.00 s after.

## Fixes, all in v0.30.0 (05f45eb, tag v0.30.0)

- `BlurFade` takes `as="li"`, so Agenda, Activity and Roadmap render their items as `<li>` inside
  their lists. Card headings in every slide type are `<h2>` (were `<h3>` under an `<h1>`).
- The four corner wordmark images lose `priority`: the cut that is hidden by the theme never loads.
- Print catalog: meta description, preload of the four faces the first slides use, lazy part-tile
  iframes; the module lookup through `createRequire` instead of `import.meta.resolve` (the dev 500).
- Frames page: meta description, favicon, a `<main>` landmark.
- Dev middleware: `Cache-Control: max-age=3600` on brand and deck files.

Consumers raised to v0.30.0 with green gates: talks (cd5f949), trainer-hub (42143651, with a
`BlurFade` story for `as`), hycle-private (b8cd2f6).

## Pixel check and device check

- 116 story pages, the print catalog and the frames page at 1440: 0 differing pixels.
- The 82 slides of the frames page, element by element: 0 differing pixels.
- Catalog home at 1440, 1024 and 390: equal but for its entrance animation, which differs by the
  same amount (15,456 px) between two loads of the same build.
- Pixel-identical slides keep their density; the 0.8 floor in talks, trainer-hub and hycle-private
  is untouched.

## What stays below 100

- Frames page accessibility 96: `color-contrast` (#5c9ba8 on #f7f9fa) and `link-text` ("Read more")
  are both slide specimen content, shown as a deck shows them. Best practices and SEO reach 100
  and 91: SEO's one failing audit is `link-text`, the same "Read more" (measured 03.11. by polish).
- Catalog home and every dashboard and story: SEO 90-91 (no meta description) and desktop
  accessibility 96 (`target-size`, the rail links). Catalog home mobile performance 97: its 743
  requests are scaffolding's tile iframes. Scaffolding owns the shell; brief for scaffolding: emit
  `lead` as the meta description, 24 px rail targets, and load the tile iframes lazily.
- Dev print catalog: 12.7 MB of CSS refetched per iframe. An ETag on the stylesheet endpoint was
  tried and reverted: Astro's static endpoint sees no request headers in dev.

## Assumptions

- The Pages emulation stands in for `hackersandwizards.github.io/slides/`, which this run did not
  deploy to or measure.
- The route set for the browser was cut to 14 representative pages (40 s per route); the pixel check
  covers all 118 catalog pages.
