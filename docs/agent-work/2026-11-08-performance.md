# Performance, 08.11.2026

The first performance baseline for this repo: no earlier report exists. The catalog is a static
site (GitHub Pages), so there is no backend endpoint to time; the dev-only deck edit endpoint
(`lib/deck-edit-server.ts`) runs in the consumers, not here.

## Method

- Lighthouse 13.6.0 through `bunx`, mobile (default) and desktop (`--preset=desktop`), three runs
  each, median. Chrome headless with a fresh profile per run, against the production build served
  under `/slides` with gzip and `max-age=600`, as Pages serves it (a scratch Bun server on port
  4400; `astro preview` fails from the repo root, see below).
- Every Lighthouse run waited until the 1-minute load was 4 or lower. The load column gives the
  range of the 1-minute load over the batch's runs.
- Navigation in headless Chrome (puppeteer from the repo), median of five, unthrottled, at a
  1-minute load of 3.5 to 4.2.
- Start times: wall clock to the first HTTP 200, three runs each.

## Start times

| Command                                  | Median | Runs              | 1-min load |
| ---------------------------------------- | ------ | ----------------- | ---------- |
| `bun run dev`                            | 1.02 s | 1.09, 1.01, 1.02  | 7.0–7.2    |
| `astro preview --root .` from `catalog/` | 0.46 s | 0.44, 0.46, 0.47  | 5.2–5.5    |
| `bun run build` (260 pages)              | 2.26 s | 2.85, 2.26, 2.26  | 5.0–5.7    |
| `astro preview --root catalog` from root | fails  | Astrobook's route | —          |

`astro preview --root catalog` run from the repo root exits with `ENOENT … catalog/astrobook/pages/app.astro`.
The same command run from `catalog/` with `--root .` serves. That one changed factor, the working
directory, separates the two. The repo has no `preview` script, so nothing calls it today. Astro
7.4.7 also starts preview in the background unless `ASTRO_PREVIEW_BACKGROUND=1` is set, and that
background child doubles a relative `--root` (`catalog/catalog/dist`).

## Lighthouse, before and after

Scores are performance / accessibility / best practices / SEO. SEO stays at 60–63 by design: the
catalog carries `noindex` (`is-crawlable`). The frames page has no such tag and scores 91.

| Page                                | Preset  | Before         | After          | LCP ms before → after | Bytes KB before → after |
| ----------------------------------- | ------- | -------------- | -------------- | --------------------- | ----------------------- |
| Home `/slides/`                     | mobile  | 97/100/100/63  | 96/100/100/63  | 2100 → 2250           | 708 → 704               |
| Home                                | desktop | 98/100/100/63  | 98/100/100/63  | 601 → 601             | 1120 → 1120             |
| Story page `/dashboard/Types/…`     | mobile  | 92/100/100/63  | 91/100/100/63  | 3378 → 3527           | 408 → 381               |
| Story page                          | desktop | 100/100/100/63 | 100/100/100/63 | 702 → 742             | 408 → 381               |
| Story frame `/stories/Types/…`      | mobile  | 94/100/100/60  | 94/100/100/60  | 3020 → 3001           | 333 → 305               |
| Story frame                         | desktop | 100/100/100/60 | 100/100/100/60 | 605 → 607             | 333 → 305               |
| Part page `/dashboard/Parts/…`      | mobile  | 90/100/100/63  | 90/100/100/63  | 3678 → 3609           | 410 → 396               |
| Part page                           | desktop | 100/100/100/63 | 100/100/100/63 | 705 → 746             | 410 → 396               |
| Print page `/catalog/print/`        | mobile  | 97/100/100/63  | unchanged      | 2101                  | 1285                    |
| Print page                          | desktop | 100/100/100/63 | unchanged      | 561                   | 1285                    |
| Frames `/catalog/print/frames.html` | mobile  | 100/100/100/91 | unchanged      | 901                   | 1228                    |
| Frames                              | desktop | 100/100/100/91 | unchanged      | 241                   | 1228                    |

1-minute load: before 3.02–4.00 (36 runs), after 2.85–3.93 (24 runs). The after column moves within
the spread between runs; the byte drop is the measured change.

## What changed

Every story frame loaded all 25 slide types (`StorySlide` read the registry in
`lib/slide-components.ts`) and the whole specimen deck (`state.ts` ran in the client, although
Astrobook reads a story's args on the server only, `@astrobook/core` renders
`<mod.default.component {...args} client:load />`). Now each story file hands its own component to
`storySlide()`, and `state()` returns nothing in the client build. JavaScript per story frame, gzip:

| Story frame       | Before | After  |
| ----------------- | ------ | ------ |
| `title-slide`     | 182 KB | 135 KB |
| `chart-slide/bar` | 182 KB | 137 KB |
| `statement-slide` | 182 KB | 137 KB |
| `gantt-slide`     | 182 KB | 137 KB |
| `content-slide`   | 182 KB | 153 KB |

The rendered HTML of every page is the same apart from asset names. Seven story frames screenshot
pixel-identical before and after, and all 128 story frames hydrate with no console error.

## Where the mobile LCP goes, and who owns it

- **Story frame (3.0 s mobile):** the slide mounts after hydration on purpose, so its entrance plays
  (`catalog/StorySlide.tsx`). The LCP element, the kicker, waits 656 ms of render delay
  unthrottled. This is a design choice and stays.
- **Story and part pages (3.4–3.7 s mobile):** the LCP element is the shell header's logo. Two
  controls, each changing one factor:
  - `fetchpriority="high"` on the logo: no change (3678 → 3678 ms, 3378 → 3377 ms; load 3.56–3.93).
  - The shell built without `slides.css` (stylesheet 198 KB → 29 KB): performance 90 → 95, LCP
    3678 → 2864 ms on the part page (load 3.90–3.99). This control breaks home, though: the header
    mascot draws unbounded, since the shell's header relies on the Tailwind base that `slides.css`
    brings. The shell also loads the night lockup (24 KB) on light pages.
  - So the render-blocking stylesheet costs about 800 ms of simulated LCP. The fix belongs to
    scaffolding's catalog shell: Astrobook loads the `css` option on every page, and the dashboard
    route pulls the story module's CSS in although it draws the story in an iframe.

## Navigation and interaction

Medians in ms, unthrottled, before → after.

| Action                                        | Before | After |
| --------------------------------------------- | ------ | ----- |
| Story page: sidebar to another type, hydrated | 35–66  | 38–65 |
| Story page: next state, hydrated              | 56     | 58    |
| Theme toggle, next frame                      | 12     | 8     |
| Home tile to story, hydrated                  | 445    | 448   |
| Print page, load event                        | 352    | 356   |
| Print search, five keys typed, next frame     | 22     | 25    |
| Print job filter, next frame                  | 16     | 16    |

Sidebar and step links reload the page fully. Home tile to story takes 445 ms when the click lands
right at home's load event, while the tile previews are still loading. Clicked once the network is
idle, the same tile takes 40 ms (one control, the wait condition). Home's cold load event measured
224 ms before and 234 ms after, interleaved in one browser at a load of 3.8–3.9.

## Open

- **Part frames still load every part.** `Part.tsx` reads `catalog/parts.ts`, which imports Shiki's
  `highlightLines` statically for the CodePanel tile, so every part frame loads
  `code-highlight.*.js` (462 KB raw, 84 KB gzip), PulseDot and NumberTile included. Swapping in
  `CodeLines` would load it lazily, but the print page renders `PARTS` to static markup that never
  hydrates, so its CodePanel tile would lose its highlighting. The fix splits `parts.ts`, so each
  part story imports only its own render; not built or measured yet.
