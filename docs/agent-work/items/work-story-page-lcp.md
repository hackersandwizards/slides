---
kind: work
status: open
priority: 3
order: 650
owner: Agent (slides session)
area: software-engineering
evidence: "docs/agent-work/2026-11-11-performance.md; Lighthouse 13.6.0 mobile on /dashboard/Types/title-slide/opening/, both builds served uncompressed by scripts/serve-dir.ts, same load: 9a04bab 4877, 4728, 5929 ms, f32b1dc 6531, 6680, 6530 ms"
---

# A story page's LCP grew by about 1.6 s since 9a04bab

Find which change between 9a04bab and c5cba59 delays the story page's LCP, with a one-factor control, and fix it.

The LCP element is the catalog shell's header logo (`img.hw-header-logo`) in both builds. The story
page transfers less than before (992 against 1219 KB uncompressed), and the story frame got faster
(5.8 against 6.5 s), so the slide is not what waits. The render-blocking stylesheets changed: at
9a04bab the page blocked on brand's `elements.css` and the shell's `chrome.css`, now on brand's
`fonts.css` and `tokens.css`. Three factors moved together in that window:

- brand v1.64.0 to v2.15.0;
- scaffolding v5.5.1 to v5.17.2, whose catalog shell draws the header;
- `catalog/astro.config.ts` gained `dashboardCss` with brand's `fonts.css`.

Blocking every woff2 on today's build saves only 300 ms on the story page, so the faces' download is
not the whole gap. Change one factor at a time on a 9a04bab or f32b1dc build and measure three
interleaved runs each. A cause in scaffolding's shell or in brand goes to that repository as a
brief.
