import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";
import verbal from "@hackersandwizards/brand/verbal.json";
import { tokens } from "@hackersandwizards/brand/tokens";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { centredMark, renderPptx } from "../scripts/render-pptx";
import { slideCatalog } from "../specimen/slide-catalog";
import type { ContentSlide, Slide } from "../types/slide";
import {
  contentRedrawnAs,
  gridAsContent,
  labeledGridAsCards,
  overviewAsPhases,
  regularAsContent,
  TEAM_TYPES,
  twoColumnAsSplit,
} from "../lib/slide-utils";

const require = createRequire(import.meta.url);

const NOT_TEXT = new Set([
  "type",
  "src",
  "poster",
  "imageSrc",
  "logo",
  "href",
  "linkedIn",
  "url",
  "icon",
  "notes",
  "storageKey",
  "variant",
  "layout",
  "align",
  "theme",
  "sectionTheme",
  "accent",
  "accentColor",
  "state",
  "tone",
  "dotColor",
  "team",
  "kind",
  "language",
  "closingStyle",
  "background",
  "ground",
  "alt",
  "imageAlt",
  "highlight",
  "highlightPhase",
  "contact",
  "continues",
  "order",
]);

function texts(value: unknown, key = ""): string[] {
  if (NOT_TEXT.has(key)) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => texts(v));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => texts(v, k));
  return [];
}

const norm = (t: string) =>
  t
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|`|[*“”"]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const unescape = (t: string) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

// The slide is 13.33 by 7.5 in, in EMU.
const [SLIDE_W, SLIDE_H] = [12192000, 6858000];

/** What PowerPoint draws off the slide, at a negative size, or cropped outside the picture: each
 *  shape's offset and extent against the slide, and each crop's edges against 0 to 100 %. */
function misplaced(xml: string): string[] {
  const out: string[] = [];
  for (const [, x, y, cx, cy] of xml.matchAll(
    /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(-?\d+)" cy="(-?\d+)"\/>/g,
  )) {
    const [l, t, w, h] = [x, y, cx, cy].map(Number);
    if (w < 0 || h < 0) out.push(`negative size ${w} x ${h}`);
    // A rounding tenth of a millimetre past the edge is no defect.
    if (l < -3600 || t < -3600 || l + w > SLIDE_W + 3600 || t + h > SLIDE_H + 3600)
      out.push(
        `off the slide at ${(l / 914400).toFixed(2)}, ${(t / 914400).toFixed(2)} in, ${(w / 914400).toFixed(2)} x ${(h / 914400).toFixed(2)} in`,
      );
  }
  for (const [rect] of xml.matchAll(/<a:srcRect [^>]*\/>/g))
    for (const [, edge, value] of rect.matchAll(/ ([lrtb])="(-?\d+)"/g))
      if (+value < 0 || +value > 100000) out.push(`crop ${edge}=${value}`);
  return out;
}

let dir: string;
let zip: JSZip;
const slideXml: string[] = [];
const slideText: string[] = [];
const slideCharts: string[][] = [];
const allCharts = () => slideCharts.flat();
const markedAt = slideCatalog.slides.findIndex(
  (s) => s.type === "chart" && s.variant === "trend" && s.currentMarker,
);

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "slides-pptx-"));
  const out = join(dir, "specimen.pptx");
  // Vite names the specimen's images from the repository root.
  const warnings = await renderPptx(slideCatalog, out, join(import.meta.dirname, ".."));
  expect(warnings).toEqual([]);
  zip = await JSZip.loadAsync(readFileSync(out));
  for (let i = 1; zip.file(`ppt/slides/slide${i}.xml`); i++) {
    const xml = await zip.file(`ppt/slides/slide${i}.xml`)!.async("string");
    const rels = (await zip.file(`ppt/slides/_rels/slide${i}.xml.rels`)?.async("string")) ?? "";
    const charts = await Promise.all(
      [...rels.matchAll(/Target="[^"]*\/charts\/(chart\d+\.xml)"/g)].map((m) =>
        zip.file(`ppt/charts/${m[1]}`)!.async("string"),
      ),
    );
    slideXml.push(xml);
    slideCharts.push(charts);
    slideText.push(
      [xml, ...charts]
        .flatMap((x) => [...x.matchAll(/<(?:a:t|c:v)>([^<]*)<\/(?:a:t|c:v)>/g)].map((m) => m[1]))
        .join(""),
    );
  }
}, 60_000);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("slides-pptx on the specimen deck", () => {
  it("writes one slide per deck slide", () => {
    expect(slideXml).toHaveLength(slideCatalog.slides.length);
  });

  // A malformed part opens in no viewer: Quick Look hangs on it and PowerPoint offers a repair.
  it("writes well-formed XML in every part", async () => {
    const parts = Object.keys(zip.files).filter((f) => /\.(xml|rels)$/.test(f));
    for (const part of parts) {
      const doc = new DOMParser().parseFromString(
        await zip.file(part)!.async("string"),
        "application/xml",
      );
      expect(doc.getElementsByTagName("parsererror"), part).toHaveLength(0);
    }
  });

  // The annotated image's band, 8 % to 52 % of the picture (F06).
  it("crops an annotated image to its band", () => {
    const i = slideCatalog.slides.findIndex((x) =>
      JSON.stringify(x).includes('"crop":{"top":0.08,"bottom":0.52}'),
    );
    expect(slideXml[i]).toContain('<a:srcRect l="0" r="0" t="8000" b="48000"/>');
  });

  it("keeps every shape on the slide, with a positive size and a crop inside the picture", () => {
    expect(slideXml.flatMap((xml, i) => misplaced(xml).map((m) => `slide ${i + 1}: ${m}`))).toEqual(
      [],
    );
  });

  // Slides the specimen keeps within bounds, pushed past them: a link with `&`, a stack taller than
  // the slide, chip rows wider than it, a picture without alt text (F02, F05, F07, F12).
  it("keeps over-full slides on the slide and their parts well-formed", async () => {
    const at = (type: string) => structuredClone(slideCatalog.slides.find((x) => x.type === type)!);
    const href = "https://example.com/talk?utm_source=deck&utm_medium=qr";
    const title = structuredClone(slideCatalog.slides.find((x) => "qr" in x && x.qr)!) as Slide;
    (title as { qr: { href: string } }).qr.href = href;
    const rows = Array.from({ length: 10 }, (_, i) => [`Team ${i}`, `${i} days`, `${i}%`]);
    const tall = {
      type: "content",
      headline: "A table taller than the slide",
      content: [
        { type: "table", headers: ["Team", "Lead time", "Failure rate"], rows },
        { type: "paragraph", text: "Under it." },
      ],
    } as Slide;
    const lanes = at("lanes") as Extract<Slide, { type: "lanes" }>;
    lanes.lanes[0].stages = Array.from({ length: 6 }, (_, i) => `Stage number ${i + 1}`);
    const pills = at("phased-pills") as Extract<Slide, { type: "phased-pills" }>;
    pills.phases[0].items = Array.from({ length: 6 }, (_, i) => ({
      number: i,
      title: "Long item",
    }));
    const manyLanes = at("lanes") as Extract<Slide, { type: "lanes" }>;
    manyLanes.lanes = Array.from({ length: 30 }, (_, i) => ({ label: `L${i}`, stages: ["a"] }));
    const gantt = at("gantt") as Extract<Slide, { type: "gantt" }>;
    gantt.rows = Array.from({ length: 40 }, (_, i) => ({ label: `R${i}`, bars: [] }));
    const pictured = structuredClone(
      slideCatalog.slides.find(
        (x) => x.type === "content" && x.content.some((b) => b.type === "image"),
      )!,
    ) as ContentSlide;
    for (const b of pictured.content) if (b.type === "image") delete b.alt;
    const out = join(dir, "over-full.pptx");
    const root = join(import.meta.dirname, "..");
    const warnings = await renderPptx(
      { name: "T", slides: [title, tall, lanes, pills, pictured, manyLanes, gantt] },
      out,
      root,
    );
    expect(warnings).toEqual([
      expect.stringMatching(/^blocks table, paragraph: .* taller/),
      "lanes: 30 rows taller than the slide holds",
      "gantt: 40 rows taller than the slide holds",
    ]);
    const probe = await JSZip.loadAsync(readFileSync(out));
    expect(await probe.file("ppt/slides/_rels/slide1.xml.rels")!.async("string")).toContain(
      `Target="${href.replace("&", "&amp;")}"`,
    );
    const problems: string[] = [];
    for (const part of Object.keys(probe.files).filter((f) => /\.(xml|rels)$/.test(f))) {
      const xml = await probe.file(part)!.async("string");
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      if (doc.getElementsByTagName("parsererror").length) problems.push(`${part}: malformed`);
      // The lanes and the gantt hold more rows than fit: they warn, and stay well-formed.
      const warned = /slides\/slide[67]\.xml$/.test(part);
      if (/slides\/slide\d+\.xml$/.test(part))
        problems.push(
          ...misplaced(xml)
            .filter((m) => !warned || !m.startsWith("off the slide"))
            .map((m) => `${part}: ${m}`),
        );
      if (xml.includes(root)) problems.push(`${part}: names a local path`);
    }
    expect(problems).toEqual([]);
  });

  // Each cut of the brand marks has its own proportions; the night lockup is wider (F20).
  it("draws each brand mark of a night deck at its own file's proportions", async () => {
    const out = join(dir, "night.pptx");
    const slides = slideCatalog.slides.filter((x) => x.type === "title" || x.type === "closing");
    await renderPptx(
      { name: "T", theme: "brand-dark", slides },
      out,
      join(import.meta.dirname, ".."),
    );
    const probe = await JSZip.loadAsync(readFileSync(out));
    const ratio = (png: Buffer) => png.readUInt32BE(16) / png.readUInt32BE(20);
    const cuts = await Promise.all(
      ["lockup-night", "wordmark-night"].map((name) =>
        ratio(readFileSync(require.resolve(`@hackersandwizards/brand/logos/${name}.png`))),
      ),
    );
    const drawn: number[] = [];
    for (let i = 1; probe.file(`ppt/slides/slide${i}.xml`); i++) {
      const xml = await probe.file(`ppt/slides/slide${i}.xml`)!.async("string");
      for (const [, cx, cy] of xml.matchAll(
        /descr="hackers&amp;wizards"[\s\S]*?<a:ext cx="(\d+)" cy="(\d+)"/g,
      ))
        drawn.push(+cx / +cy);
    }
    expect(drawn.length).toBeGreaterThan(0);
    for (const r of drawn) expect(Math.min(...cuts.map((c) => Math.abs(c - r)))).toBeLessThan(0.01);
  });

  it("sets brand's claim on a contact closing unless it turns the claim off", () => {
    const at = (claim: boolean) =>
      slideCatalog.slides.findIndex(
        (sl) => sl.type === "closing" && sl.variant === "contact" && (sl.claim !== false) === claim,
      );
    expect(norm(unescape(slideText[at(true)]))).toContain(norm(verbal.claim.en));
    expect(norm(unescape(slideText[at(false)]))).not.toContain(norm(verbal.claim.en));
  });

  it("sets the claim in the deck's language", async () => {
    const out = join(dir, "de.pptx");
    await renderPptx(
      {
        name: "D",
        slides: [
          { type: "title", title: "T", lang: "de" },
          { type: "closing", line1: "Danke." },
        ],
      },
      out,
      dir,
    );
    const de = await JSZip.loadAsync(readFileSync(out));
    const xml = await de.file("ppt/slides/slide2.xml")!.async("string");
    expect(norm(unescape(xml.replace(/<[^>]+>/g, "")))).toContain(norm(verbal.claim.de));
  });

  it("sets a title slide's speakers and QR alt text in the deck's language", async () => {
    const out = join(dir, "deck-lang.pptx");
    await renderPptx(
      {
        name: "D",
        lang: "de",
        slides: [
          {
            type: "title",
            title: "T",
            speakers: ["A", "B"],
            qr: { src: "/specimen/slide-catalog/qr-example.png", href: "https://example.com/" },
          },
        ],
      },
      out,
      join(import.meta.dirname, ".."),
    );
    const de = await JSZip.loadAsync(readFileSync(out));
    const xml = await de.file("ppt/slides/slide1.xml")!.async("string");
    expect(norm(unescape(xml.replace(/<[^>]+>/g, "")))).toContain(norm("A und B"));
    expect(unescape(xml)).toContain('descr="QR-Code: example.com"');
  });

  const unmarked = (item: string) => item.replace(/^[-+]\s*/, "");

  it("sets every text of a slide as text on that slide", () => {
    const missing = slideCatalog.slides.flatMap((slide: Slide, i) => {
      const shown = norm(unescape(slideText[i]));
      // A stats card shows its label in place of its title, as the web card does.
      // A closing whose mark stands centred shows the h&w lockup in place of the company's name.
      // An overview draws as phased pills, its stage descriptions gone, as on the web.
      // A vs comparison item's leading + or - is its mark, not its text.
      const data =
        slide.type === "grid" && slide.variant === "stats"
          ? { ...slide, cards: slide.cards.map((cd) => (cd.label ? { ...cd, title: "" } : cd)) }
          : slide.type === "overview"
            ? overviewAsPhases(slide)
            : slide.type === "closing" && centredMark(slide)
              ? {
                  ...slide,
                  speakers: slide.speakers?.map((sp) =>
                    sp.company.toLowerCase() === "hackers&wizards" ? { ...sp, company: "" } : sp,
                  ),
                }
              : slide.type === "comparison" &&
                  (slide.variant === undefined || slide.variant === "vs")
                ? {
                    ...slide,
                    left: { ...slide.left, items: slide.left.items.map(unmarked) },
                    right: { ...slide.right, items: slide.right.items.map(unmarked) },
                  }
                : slide;
      return texts(data)
        .filter((t) => !shown.includes(norm(t)))
        .map((t) => `slide ${i + 1} (${slide.type}): ${t}`);
    });
    expect(missing).toEqual([]);
  });

  it("places pictures only for a deck's images and the h&w mark", () => {
    slideCatalog.slides.forEach((slide: Slide, i) => {
      const images =
        JSON.stringify(slide).match(
          /"(src|imageSrc|logo)":"[^"]+\.(png|jpe?g|webp|gif|svg|mp4|webm|mov)(\?[^"]*)?"/g,
        ) ?? [];
      const pictures = slideXml[i].match(/<p:pic>/g) ?? [];
      expect(pictures.length, `slide ${i + 1} (${slide.type})`).toBeLessThanOrEqual(
        images.length + 1,
      );
    });
  });

  it("crops every portrait to a circle, as the slides' avatar", () => {
    const portraits = slideCatalog.slides.flatMap((slide: Slide, i) =>
      /"imageSrc":"[^"]*portrait-/.test(JSON.stringify(slide)) ? [slideXml[i]] : [],
    );
    expect(portraits.length).toBeGreaterThanOrEqual(5);
    for (const xml of portraits) expect(xml).toMatch(/<p:pic>(?:(?!<\/p:pic>).)*prst="ellipse"/s);
  });

  it("draws tables as tables and trend and bar charts as charts", () => {
    slideCatalog.slides.forEach((slide: Slide, i) => {
      if (slide.type === "content" && slide.content.some((b) => b.type === "table")) {
        expect(slideXml[i], `slide ${i + 1}`).toContain("<a:tbl>");
      }
      if (slide.type === "chart" && (slide.variant === "trend" || slide.variant === "bar")) {
        expect(slideXml[i], `slide ${i + 1}`).toContain("drawingml/2006/chart");
      }
    });
  });

  it("dashes a marked trend's planned half and dots the marked point", () => {
    const charts = allCharts();
    const [marked] = slideCharts[markedAt];
    const [measured, planned] = marked.match(/<c:ser>.*?<\/c:ser>/gs)!;
    const specimen = slideCatalog.slides[markedAt] as {
      data: { name: string }[];
      currentMarker: string;
    };
    const now = specimen.data.findIndex((p) => p.name === specimen.currentMarker);
    expect(planned).toContain('<a:prstDash val="dash"/>');
    expect(measured).toContain('<a:prstDash val="solid"/>');
    expect(measured).toMatch(
      new RegExp(`<c:dPt><c:idx val="${now}"/><c:marker><c:symbol val="circle"/>`),
    );
    // In the schema's order: the series' marker, its points, then its labels.
    expect(measured.indexOf("<c:dPt>")).toBeLessThan(measured.indexOf("<c:dLbls>"));
    // The planned half starts at the marked point, the measured one ends there.
    expect(planned).not.toMatch(new RegExp(`<c:pt idx="${now - 1}"><c:v>\\d`));
    expect(measured).not.toMatch(new RegExp(`<c:val>.*<c:pt idx="${now + 1}"><c:v>\\d`, "s"));
    expect(charts.filter((xml) => xml !== marked).some((xml) => xml.includes("<c:dPt>"))).toBe(
      false,
    );
  });

  it("labels a marked trend as the web does: names, scale, fill, card and annotation", () => {
    const slide = slideCatalog.slides[markedAt] as Slide & { type: "chart" };
    const [chart] = slideCharts[markedAt];
    const xml = slideXml[markedAt];
    const now = slide.data!.findIndex((p) => p.name === slide.currentMarker);
    // The names leave the chart's axis for text under the points, the marked one teal and bold
    // as the web's tick, nothing over the point, and a dashed guide from the dot to the axis.
    expect(chart).toMatch(/<c:catAx>.*?<c:tickLblPos val="none"\/>/s);
    expect(chart).not.toContain("<c:dLbl>");
    const teal = tokens["--color-teal"].slice(1).toUpperCase();
    for (const [i, { name }] of slide.data!.entries()) {
      const run = xml.slice(0, xml.indexOf(`<a:t>${name}</a:t>`));
      expect(run, name).not.toBe(xml);
      const props = run.slice(run.lastIndexOf("<a:rPr"));
      expect(props.includes(`val="${teal}"`) && props.includes('b="1"'), name).toBe(i === now);
    }
    expect(xml).toMatch(/<a:prstDash val="dash"\/>/);
    // recharts' ticks for 0 to 8, categories on the plot's edges, no axis titles in the chart.
    expect(chart).toContain('<c:max val="8"/>');
    expect(chart).toContain('<c:min val="0"/>');
    expect(chart).toContain('<c:majorUnit val="2"/>');
    expect(chart).toContain('<c:crossBetween val="midCat"/>');
    expect(chart).not.toContain("<c:title>");
    // The y label and the note over the plot as text, the note no longer in the annotation.
    const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    expect(texts).toEqual(
      expect.arrayContaining([slide.yLabel, slide.futureNote, slide.xLabel, slide.annotation]),
    );
    // The annotation in the secondary colour, the measured half filled where it has two points
    // or more, the plot on a card.
    const run = xml.slice(0, xml.indexOf(`<a:t>${slide.annotation}`));
    expect(run.slice(run.lastIndexOf("<a:rPr"))).toContain(
      `<a:srgbClr val="${tokens["--color-purple"].slice(1).toUpperCase()}"/>`,
    );
    expect(xml.includes("<a:custGeom>")).toBe(now > 0);
    expect(xml).toContain('prst="roundRect"');
  });

  it("draws a regular and a pillars grid slide as the content slides the web redraws them as", async () => {
    const regular = slideCatalog.slides.find(
      (x) => x.type === "regular" && !x.profile && x.layout !== "cards",
    ) as Extract<Slide, { type: "regular" }>;
    const grid = slideCatalog.slides.find(
      (x) => x.type === "grid" && (x.variant ?? "pillars") === "pillars",
    ) as Extract<Slide, { type: "grid" }>;
    const out = join(dir, "redrawn.pptx");
    await renderPptx(
      {
        name: "R",
        slides: [regular, regularAsContent(regular)!, grid, gridAsContent(grid)] as Slide[],
      },
      out,
      dir,
    );
    const zipped = await JSZip.loadAsync(readFileSync(out));
    const xmlOf = (n: number) => zipped.file(`ppt/slides/slide${n}.xml`)!.async("string");
    // Each pair is one drawing, but for the shapes' ids and names and the page counter.
    const shapes = (xml: string) =>
      xml.replace(/ id="\d+"| name="[^"]*"|<a:t>\d+ \/ \d+<\/a:t>/g, "");
    expect(shapes(await xmlOf(1))).toBe(shapes(await xmlOf(2)));
    expect(shapes(await xmlOf(3))).toBe(shapes(await xmlOf(4)));
  });

  it("sets a quote grid as the web's brand quote: upright, no quotation marks, the author in teal", () => {
    const at = slideCatalog.slides.findIndex((x) => x.type === "grid" && x.variant === "quotes");
    const xml = slideXml[at];
    const slide = slideCatalog.slides[at] as Extract<Slide, { type: "grid" }>;
    expect(xml).not.toContain("“");
    expect(xml).not.toContain(' i="1"');
    const teal = tokens["--color-teal"].slice(1).toUpperCase();
    for (const { author } of slide.cards) {
      const run = xml.slice(0, xml.indexOf(`<a:t>${author}</a:t>`));
      expect(run.slice(run.lastIndexOf("<a:rPr"))).toMatch(new RegExp(`b="1".*val="${teal}"`, "s"));
    }
  });

  it("sets a content slide's quote behind a purple rule, its source in grey", () => {
    const at = slideCatalog.slides.findIndex(
      (x) => x.type === "content" && x.content.some((b) => b.type === "quote"),
    );
    const xml = slideXml[at];
    const purple = tokens["--color-purple"].slice(1).toUpperCase();
    const muted = tokens["--color-muted"].slice(1).toUpperCase();
    expect(xml).toContain(`<a:srgbClr val="${purple}"`);
    expect(xml).toContain("We stopped asking for a release date.");
    const run = xml.slice(0, xml.indexOf("<a:t>Mara Lindqvist"));
    expect(run.slice(run.lastIndexOf("<a:rPr"))).toContain(`val="${muted}"`);
  });

  it("names a team picture's types under it only where the slide asks for a legend", () => {
    const at = slideCatalog.slides.flatMap((x, i) => (x.type === "team-topology" ? [i] : []));
    const named = at.map((i) => slideXml[i].includes(`<a:t>${TEAM_TYPES.en.enabling}</a:t>`));
    expect(named).toEqual(
      at.map((i) => !!(slideCatalog.slides[i] as Extract<Slide, { type: "team-topology" }>).legend),
    );
    expect(named).toContain(true);
  });

  it("fills a lone series' measured part when it holds two points or more", async () => {
    const out = join(dir, "fill.pptx");
    await renderPptx(
      {
        name: "F",
        slides: [
          {
            type: "chart",
            variant: "trend",
            headline: "H",
            data: [1, 2, 4, 5].map((value, i) => ({ name: `M${i}`, value })),
            currentMarker: "M2",
          },
        ],
      },
      out,
      dir,
    );
    const zipped = await JSZip.loadAsync(readFileSync(out));
    expect(await zipped.file("ppt/slides/slide1.xml")!.async("string")).toContain("<a:custGeom>");
  });

  it("keeps a bar's names level where every word fits its band, else lets them tilt", async () => {
    const bars = allCharts().filter((xml) => xml.includes("<c:barChart>"));
    expect(bars.length).toBeGreaterThan(0);
    for (const xml of bars) expect(xml).toMatch(/<c:catAx>.*?<a:bodyPr rot="0" vert="horz"\/>/s);
    const out = join(dir, "long.pptx");
    const name = "Implementierungsphasenabschlussbericht";
    await renderPptx(
      {
        name: "B",
        slides: [
          {
            type: "chart",
            variant: "bar",
            headline: "H",
            data: Array.from({ length: 8 }, (_, i) => ({ name: `${name} ${i}`, value: i + 1 })),
          },
        ],
      },
      out,
      dir,
    );
    const zipped = await JSZip.loadAsync(readFileSync(out));
    const chart = Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))!;
    expect(await zipped.file(chart)!.async("string")).not.toContain('rot="0"');
  });

  it("keeps a marked two-series trend's planned halves out of the legend", async () => {
    const out = join(dir, "two.pptx");
    await renderPptx(
      {
        name: "T",
        slides: [
          {
            type: "chart",
            variant: "trend",
            headline: "H",
            currentMarker: "b",
            seriesLabel: "A",
            series2Label: "B",
            data: [
              { name: "a", value: 1, value2: 2 },
              { name: "b", value: 2, value2: 3 },
              { name: "c", value: 3, value2: 4 },
            ],
          },
        ],
      },
      out,
      dir,
    );
    const zipped = await JSZip.loadAsync(readFileSync(out));
    const chart = Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))!;
    const xml = await zipped.file(chart)!.async("string");
    expect(xml.match(/<c:legendEntry>/g)).toHaveLength(2);
    expect(xml.match(/<a:prstDash val="dash"\/>/g)).toHaveLength(2);
  });

  const chartXml = async (out: string) => {
    const zipped = await JSZip.loadAsync(readFileSync(out));
    const chart = Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))!;
    return zipped.file(chart)!.async("string");
  };

  it("leaves an unnamed series out of the legend, as the web does", async () => {
    const out = join(dir, "unnamed.pptx");
    await renderPptx(
      {
        name: "T",
        slides: [
          {
            type: "chart",
            variant: "trend",
            headline: "H",
            series2Label: "B",
            data: [
              { name: "a", value: 1, value2: 2 },
              { name: "b", value: 2, value2: 3 },
            ],
          },
        ],
      },
      out,
      dir,
    );
    const xml = await chartXml(out);
    expect(xml).toContain('<c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>');
    expect(xml.match(/<c:legendEntry>/g)).toHaveLength(1);
  });

  const onlySlide = async (name: string, slide: Slide) => {
    const out = join(dir, name);
    await renderPptx({ name: "T", slides: [slide] }, out, dir);
    return (await JSZip.loadAsync(readFileSync(out)))
      .file("ppt/slides/slide1.xml")!
      .async("string");
  };

  // The export drew three forms by rules of its own (F11).
  it("draws a labeled grid as the cards block the web draws it as", async () => {
    const block = {
      type: "labeled-grid" as const,
      items: [1, 2, 3, 4].map((n) => ({ title: `T${n}`, subtitle: `s${n}` })),
    };
    const content = (b: ContentSlide["content"][number]): Slide => ({
      type: "content",
      headline: "H",
      content: [b],
    });
    expect(await onlySlide("grid.pptx", content(block))).toBe(
      await onlySlide("cards.pptx", content(labeledGridAsCards(block))),
    );
  });

  it("draws a roadmap's items column beside its phased one", async () => {
    const xml = await onlySlide("roadmap.pptx", {
      type: "roadmap",
      headline: "H",
      columns: [
        {
          label: "A",
          title: "Phased",
          accent: "ingredients",
          phases: [{ label: "P", items: [{ title: "Pill" }] }],
        },
        { label: "B", title: "Listed", accent: "deepdive", items: [{ title: "Listed item" }] },
      ],
    });
    expect(xml).toContain("Pill");
    expect(xml).toContain("Listed item");
  });

  it("draws a complicated-subsystem branch in the team's colour", async () => {
    const slide = slideCatalog.slides.find(
      (x) => x.type === "decision" && x.yes.team === "complicated-subsystem",
    )!;
    const factory = tokens["--color-factory"].slice(1).toUpperCase();
    expect(await onlySlide("decision.pptx", slide)).toContain(`<a:srgbClr val="${factory}"/>`);
  });

  it("draws a centered content slide the statement type takes as that statement", async () => {
    const slide: ContentSlide = {
      type: "content",
      layout: "centered",
      headline: "One claim",
      content: [{ type: "paragraph", text: "Under it." }],
    };
    expect(await onlySlide("centered.pptx", slide)).toBe(
      await onlySlide("statement.pptx", contentRedrawnAs(slide)!),
    );
  });

  it("draws a toned two-column's markers in its hues and a neutral one's in teal", async () => {
    const column = { title: "T", items: ["one"] };
    const xml = await onlySlide("toned.pptx", {
      type: "content",
      headline: "H",
      content: [
        { type: "two-column", variant: "success-error", left: column, right: column },
        { type: "two-column", left: column, right: column },
      ],
    });
    const hues = [...xml.matchAll(/<a:buClr><a:srgbClr val="(\w+)"\/>/g)].map((m) => m[1]);
    const hex = (v: string) => v.replace("#", "").toUpperCase();
    expect(new Set(hues)).toEqual(
      new Set([
        hex(tokens["--color-green-dark"]),
        hex(tokens["--color-red"]),
        hex(tokens["--color-teal"]),
      ]),
    );
    expect(xml).not.toMatch(/&#xE00|<a:t>\+ {2}<\/a:t>/);
  });

  it("shrinks a transform's gap with its text", async () => {
    const items = Array.from({ length: 12 }, () => "A line of a long list, written out in full");
    const side = (label: string, list: string[]) => ({ label, items: list });
    const gap = async (name: string, list: string[]) => {
      const xml = await onlySlide(name, {
        type: "content",
        headline: "H",
        content: [{ type: "transform", before: side("B", list), after: side("A", list) }],
      });
      return Number(/<a:ext cx="(\d+)" cy="914"\/>/.exec(xml)?.[1]);
    };
    expect(await gap("dense.pptx", items)).toBeLessThan(await gap("sparse.pptx", ["One"]));
  });

  it("puts a plus between the sides of a before-after that adds", async () => {
    const at = slideCatalog.slides.findIndex((s) => s.type === "comparison" && "adds" in s);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(slideXml[at]).toContain("<a:t>+</a:t>");
    expect(slideXml[at]).not.toContain("tailEnd");
  });

  it("marks only a vs comparison's items, bullets a split's and strikes only a struck before side", () => {
    const sided = slideCatalog.slides.flatMap((slide: Slide, i) => {
      const sides = slide.type === "content" ? twoColumnAsSplit(slide) : slide;
      return sides?.type === "comparison" &&
        sides.variant !== "positions" &&
        sides.variant !== "guidance"
        ? [{ sides, xml: slideXml[i], at: `slide ${i + 1}`, converted: slide !== sides }]
        : [];
    });
    expect(sided.map((s) => s.sides.variant ?? "vs")).toEqual(
      expect.arrayContaining(["vs", "before-after", "split"]),
    );
    // A lone neutral two-column exports as the split it reads as on the web.
    expect(sided.some((s) => s.converted)).toBe(true);
    for (const { sides, xml, at } of sided) {
      const variant = sides.variant ?? "vs";
      expect(xml.includes("<a:t>+  </a:t>"), at).toBe(variant === "vs");
      expect(xml.includes("<a:t>−  </a:t>"), at).toBe(variant === "vs");
      expect(xml.includes("<a:buChar"), at).toBe(variant === "split");
      expect(xml.includes('strike="sngStrike"'), at).toBe(
        variant === "before-after" && sides.strike !== false,
      );
    }
  });

  it("spells out a linked image's link and covers a video with its poster", async () => {
    const at = (type: string) =>
      slideCatalog.slides.findIndex(
        (s) => s.type === "content" && s.content.some((b) => b.type === type),
      );
    expect(slideText[at("linked-image")]).toContain("forge.example.com/acme/payments/pull/128");
    const rels = await zip
      .file(`ppt/slides/_rels/slide${at("video") + 1}.xml.rels`)!
      .async("string");
    const poster = readFileSync(
      join(import.meta.dirname, "..", "specimen", "slide-catalog", "agent-session-poster.png"),
    );
    const pictures = await Promise.all(
      [...rels.matchAll(/Target="\.\.\/media\/([^"]+\.png)"/g)].map(async (m) =>
        Buffer.from(await zip.file(`ppt/media/${m[1]}`)!.async("uint8array")),
      ),
    );
    expect(pictures.some((p) => p.equals(poster))).toBe(true);
  });

  it("names the brand fonts with their pitch, so a machine without them substitutes in kind", () => {
    const all = slideXml.join("");
    expect(all).toContain('typeface="Inter" pitchFamily="34" charset="0"');
    expect(all).toContain('typeface="JetBrains Mono" pitchFamily="49" charset="0"');
    expect(all).not.toMatch(/typeface="JetBrains Mono" pitchFamily="34"/);
  });
});

// The specimen deck has no deep-dive slide with bullets: two content slides that differ only there.
it("colours a deep-dive slide's bullets in the night teal, every other slide's in the day teal", async () => {
  const slide = {
    type: "content",
    headline: "H",
    content: [{ type: "bullets", items: ["a", "b"] }],
  };
  const out = join(dir, "bullets.pptx");
  await renderPptx(
    { ...slideCatalog, slides: [slide, { ...slide, sectionTheme: "deepdive" }] as Slide[] },
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  const pptx = await JSZip.loadAsync(readFileSync(out));
  const colour = async (n: number) =>
    [
      ...(await pptx.file(`ppt/slides/slide${n}.xml`)!.async("string")).matchAll(
        /<a:buClr><a:srgbClr val="(\w+)"/g,
      ),
    ].map((m) => m[1]);
  const [day, night] = [await colour(1), await colour(2)];
  expect(day.length).toBeGreaterThan(0);
  expect(night).toHaveLength(day.length);
  expect(new Set(night).size).toBe(1);
  expect(night[0]).not.toBe(day[0]);
});

it("marks the text of a German deck German, its notes included", async () => {
  const out = join(dir, "lang.pptx");
  await renderPptx(
    {
      ...slideCatalog,
      slides: [
        { type: "title", title: "Titel", lang: "de" },
        {
          type: "content",
          headline: "H",
          content: [{ type: "paragraph", text: "Text" }],
          notes: "N",
        },
      ] as Slide[],
    },
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  const pptx = await JSZip.loadAsync(readFileSync(out));
  for (const part of ["ppt/slides/slide2.xml", "ppt/notesSlides/notesSlide2.xml"])
    expect(await pptx.file(part)!.async("string")).toContain('lang="de-DE"');
  for (const part of Object.keys(pptx.files).filter((f) => f.endsWith(".xml")))
    expect(await pptx.file(part)!.async("string")).not.toContain('lang="en-US"');
});

// pptxgenjs splits a run at its \n into paragraphs, and text boxes and table cells reach it apart.
it.each([
  [
    "a statement's closing",
    { type: "statement", lines: ["S"], closing: "one\ntwo **three** four" },
  ],
  ["a title", { type: "title", title: "one\ntwo **three** four" }],
  [
    "a table cell",
    {
      type: "content",
      headline: "H",
      content: [{ type: "table", rows: [["x", "one\ntwo **three** four"]] }],
    },
  ],
])("sets a \\n in %s as a line break inside its paragraph", async (_, slide) => {
  const out = join(dir, "breaks.pptx");
  await renderPptx(
    { ...slideCatalog, slides: [slide as Slide] },
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  const xml = await (
    await JSZip.loadAsync(readFileSync(out))
  )
    .file("ppt/slides/slide1.xml")!
    .async("string");
  const para = [...xml.matchAll(/<a:p>(.*?)<\/a:p>/g)].find((m) => m[1].includes(">one<"))!;
  expect(para[1].match(/<a:br\/>/g)).toHaveLength(1);
  expect(para[1]).toMatch(/>two .*three.* four<\/a:t>/);
});

// pptxgenjs stores every video cover as a PNG part: another format would sit there mislabelled.
it("warns on a video poster that is no PNG and sets no cover", async () => {
  const out = join(dir, "poster.pptx");
  const warnings = await renderPptx(
    {
      ...slideCatalog,
      slides: [
        {
          type: "content",
          headline: "Video",
          content: [
            {
              type: "video",
              src: "/slide-catalog/demo.mp4",
              poster: "/slide-catalog/demo.mp4",
            },
          ],
        },
      ],
    },
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  expect(warnings).toEqual([expect.stringContaining("poster")]);
});

// The web lights the phase whose title matches `highlightPhase` in any case, and no phase without one.
it.each([true, false])(
  "lights a process slide's phase by the web's rule, loop %s",
  async (loop) => {
    const slide = (highlightPhase?: string) => ({
      type: "process",
      headline: "H",
      loop,
      nodes: ["One", "Two", "Three"].map((title) => ({ title, description: "d" })),
      ...(highlightPhase === undefined ? {} : { highlightPhase }),
    });
    const phases = ["Two", "two", undefined, "Nope", "Three"];
    const out = join(dir, "process.pptx");
    await renderPptx(
      { ...slideCatalog, slides: phases.map(slide) as Slide[] },
      out,
      join(import.meta.dirname, "..", "specimen"),
    );
    const pptx = await JSZip.loadAsync(readFileSync(out));
    // Each slide's colours in drawing order: the slides differ in nothing else but name and page.
    const [exact, lower, none, unknown, last] = await Promise.all(
      phases.map(async (_, i) =>
        [
          ...(await pptx.file(`ppt/slides/slide${i + 1}.xml`)!.async("string")).matchAll(
            /srgbClr val="(\w+)"/g,
          ),
        ]
          .map((m) => m[1])
          .join(),
      ),
    );
    expect(lower).toBe(exact);
    expect(none).toBe(unknown);
    expect(none).not.toBe(last);
  },
);

describe("slides-pptx as a command", () => {
  const script = join(import.meta.dirname, "../scripts/render-pptx.ts");
  const deck = JSON.stringify({
    name: "T",
    slides: [{ type: "content", headline: "H", content: [{ type: "image", src: "/missing.png" }] }],
  });
  const run = (...flags: string[]) =>
    spawnSync("bun", [script, "-", join(dir, "cli.pptx"), "--assets", dir, ...flags], {
      encoding: "utf8",
      input: deck,
    });

  it("writes the file and reports a warning, and exits 1 on one under --strict", () => {
    const loose = run();
    expect(loose.status).toBe(0);
    expect(loose.stderr).toContain("warning: image /missing.png");
    expect(run("--strict").status).toBe(1);
  });
});
