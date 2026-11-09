import { readdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { serveDist } from "./serve-dist";

// On a phone (390 px) every numbers and cards grid stacks into one column and every figure fits its
// column on one line. An inline column template once outranked the phone rule, so a two-figure row
// kept its columns and "87,3 %", sized for the stage, ran over the figure beside it (2026-11-08).
const STORIES = [
  "content-slide/visual-numbers",
  "content-slide/visual-numbers-one",
  "content-slide/visual-numbers-six",
  "grid-slide/replaced-by-numbers",
  "content-slide/visual-cards",
  "content-slide/visual-cards-four-columns",
  "content-slide/visual-cards-dense",
  "grid-slide/replaced-by-cards",
];

let browser: Browser;
let dist: Awaited<ReturnType<typeof serveDist>>;
beforeAll(async () => {
  dist = await serveDist();
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(async () => {
  await browser?.close();
  dist?.close();
});

/** Runs in the page: the column count of each counted grid, and each figure's overflow in px. */
function measure() {
  const grids = [...document.querySelectorAll<HTMLElement>(".slide-content .grid")].filter((g) =>
    g.style.getPropertyValue("--slide-cols"),
  );
  const figures = [...document.querySelectorAll<HTMLElement>(".slide-content span.font-heading")];
  const width = document.documentElement.clientWidth;
  return {
    columns: grids.map((g) => getComputedStyle(g).gridTemplateColumns.split(" ").length),
    figures: figures.map((f) => ({
      text: f.textContent,
      over: Math.max(
        f.scrollWidth - f.parentElement!.clientWidth,
        f.getBoundingClientRect().right - width,
      ),
    })),
  };
}

it.each(STORIES)(
  "stacks %s into one column with every figure inside it",
  async (story) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${dist.origin}/slides/stories/Types/${story}/`, { waitUntil: "networkidle0" });
    const { columns, figures } = await page.evaluate(measure);
    await page.close();
    expect(figures.filter(({ over }) => over > 1)).toEqual([]);
    // A lone figure stands in no grid; every other story has one, and a numbers story its figures.
    if (!story.endsWith("-one")) expect(columns.length).toBeGreaterThan(0);
    if (story.includes("numbers")) expect(figures.length).toBeGreaterThan(0);
    expect(columns.filter((n) => n !== 1)).toEqual([]);
  },
  60_000,
);

// A profile's company ran past its card beside the portrait on a phone (209 px of text in 148 px,
// 2026-11-08): there the portrait stands above, and one company in the specimen is one long word.
it.each(["profiles-slide/specimen", "profiles-slide/specimen2"])(
  "keeps every line of %s inside its card on a phone",
  async (story) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${dist.origin}/slides/stories/Types/${story}/`, { waitUntil: "networkidle0" });
    const lines = await page.$$eval(".slide-content :is(h2, p)", (all) =>
      all.map((e) => ({ text: e.textContent, over: e.scrollWidth - e.clientWidth })),
    );
    await page.close();
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.filter(({ over }) => over > 1)).toEqual([]);
  },
  60_000,
);

// Three defects consumers found on v2.12 (2026-11-09): a card title of one long word ran 100 px out
// of its card, a timeline's columns left 85 px for a title on a phone, and a trend marked at its
// first point set the point's name on the value axis while its last category lost a digit.

async function open(story: string, width: number): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width, height: width > 800 ? 810 : 844 });
  await page.goto(`${dist.origin}/slides/stories/Types/${story}/`, { waitUntil: "networkidle0" });
  return page;
}

it.each([1440, 390])(
  "keeps every card title of visual-cards inside its card at %i px",
  async (width) => {
    const page = await open("content-slide/visual-cards", width);
    const titles = await page.$$eval(".slide-content h2", (all) =>
      all.map((h) => ({ text: h.textContent, over: h.scrollWidth - h.clientWidth })),
    );
    await page.close();
    expect(titles.map((t) => t.text)).toContain("Internationalization");
    expect(titles.filter(({ over }) => over > 1)).toEqual([]);
  },
  60_000,
);

it.each([
  "content-slide/visual-timeline",
  "content-slide/visual-timeline-continued",
  "content-slide/visual-timeline-segments",
  "content-slide/visual-timeline-staggered",
])(
  "stands %s upright on a phone, every title and text inside the screen",
  async (story) => {
    const page = await open(story, 390);
    const { stages, over } = await page.evaluate(() => {
      const shown = [...document.querySelectorAll<HTMLElement>(".slide-timeline")].filter(
        (t) => t.offsetParent,
      );
      const texts = shown.flatMap((t) => [...t.querySelectorAll<HTMLElement>("h2, p")]);
      const width = document.documentElement.clientWidth;
      return {
        stages: shown
          .flatMap((t) => [...t.querySelectorAll<HTMLElement>(".slide-timeline-stage")])
          .map((s) => s.getBoundingClientRect().top),
        over: texts
          .map((e) => ({
            text: e.textContent,
            over: Math.max(e.scrollWidth - e.clientWidth, e.getBoundingClientRect().right - width),
          }))
          .filter(({ over }) => over > 1),
      };
    });
    await page.close();
    expect(stages.length).toBeGreaterThan(2);
    // Upright: each stage starts below the one before.
    expect(stages.every((top, i) => i === 0 || top > stages[i - 1])).toBe(true);
    expect(over).toEqual([]);
  },
  60_000,
);

it.each([1440, 390])(
  "names trend-marked's marked point on its axis, every label whole and apart, at %i px",
  async (width) => {
    const page = await open("chart-slide/trend-marked", width);
    await page.waitForSelector(".recharts-xAxis-tick-labels text");
    const { labels, teal } = await page.evaluate(() => {
      const svg = document.querySelector("[data-chart-plot] svg.recharts-surface")!;
      const box = svg.getBoundingClientRect();
      const labels = [...svg.querySelectorAll<SVGTextElement>("text")].map((t) => {
        const r = t.getBoundingClientRect();
        return {
          text: t.textContent,
          x: !!t.closest(".recharts-xAxis-tick-labels"),
          fill: t.getAttribute("fill"),
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          inside: r.left >= box.left - 1 && r.right <= box.right + 1,
        };
      });
      return { labels, teal: "var(--color-teal)" };
    });
    await page.close();
    const overlap = (a: (typeof labels)[number], b: (typeof labels)[number]) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    expect(labels.filter((l) => !l.inside)).toEqual([]);
    // Angled category names overlap as boxes, not as glyphs: every other pair is compared.
    expect(
      labels.flatMap((a, i) => labels.slice(i + 1).filter((b) => !(a.x && b.x) && overlap(a, b))),
    ).toEqual([]);
    expect(labels.some((l) => !l.x)).toBe(true);
    // The marked category alone takes the marker's colour, and no name stands over the point.
    expect(labels.filter((l) => l.fill === teal).map((l) => l.text)).toEqual([
      expect.stringMatching(/^Month ?0$/),
    ]);
    expect(labels.filter((l) => /^Month ?12$/.test(l.text ?? ""))).toHaveLength(1);
  },
  60_000,
);

// "Architecture" broke as "Architectur / e" in a team card (trainer-hub, 2026-11-09): Chrome
// hyphenates no capitalised English word and Safari none under the limit, so `break-word` cut it
// without a hyphen. Measured with `overflow-wrap: normal`, a word wider than its heading overflows.
const TYPES = join(import.meta.dirname, "..", "..", "dist", "stories", "Types");
const ALL = readdirSync(TYPES).flatMap((type) =>
  readdirSync(join(TYPES, type)).map((story) => `${type}/${story}`),
);

it.each([1440, 390])(
  "breaks no heading word without a hyphen in any story at %i px",
  async (width) => {
    const broken: unknown[] = [];
    for (let i = 0; i < ALL.length; i += 8)
      await Promise.all(
        ALL.slice(i, i + 8).map(async (story) => {
          const page = await open(story, width);
          const over = await page.$$eval(".slide-content :is(h1, h2, h3, .card-title)", (all) =>
            (all as HTMLElement[])
              .filter((h) => h.clientWidth > 0)
              .map((h) => {
                h.style.overflowWrap = "normal";
                return { text: h.textContent, over: h.scrollWidth - h.clientWidth };
              })
              .filter(({ over }) => over > 1),
          );
          await page.close();
          if (over.length) broken.push({ story, over });
        }),
      );
    expect(ALL.length).toBeGreaterThan(100);
    expect(broken).toEqual([]);
  },
  600_000,
);

// A seven-line note beside the value axis left the trend 88 px of plot on a phone (talks,
// 2026-11-09), where the plot drew 296 px without the note: there the note stands below the chart
// and the plot keeps that height.
it("keeps trend-marked's plot tall on a phone, its note below the chart", async () => {
  const page = await open("chart-slide/trend-marked", 390);
  await page.waitForSelector(".recharts-surface");
  const { plot, note, labels, dot } = await page.evaluate(() => {
    const box = (e: Element | null | undefined) => e?.getBoundingClientRect().toJSON() as DOMRect;
    const frame = document.querySelector("[data-chart-plot]")!;
    return {
      plot: box(frame.querySelector("svg.recharts-surface")),
      note: box(
        [...frame.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Baseline")),
      ),
      labels: [...frame.querySelectorAll(".recharts-xAxis-tick-labels text")].map((t) => box(t)!),
      dot: box(frame.querySelector(".recharts-reference-dot circle")),
    };
  });
  await page.close();
  expect(plot!.height).toBeGreaterThanOrEqual(296);
  expect(note!.top).toBeGreaterThan(Math.max(...labels.map((l) => l.bottom)));
  expect(
    labels.filter(
      (l) =>
        dot && l.top < dot.bottom && dot.top < l.bottom && l.left < dot.right && dot.left < l.right,
    ),
  ).toEqual([]);
}, 60_000);
