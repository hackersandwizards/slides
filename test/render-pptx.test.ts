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
import { checkSlide, faceFiles, pretty, woff2Tables, wrap } from "../scripts/pptx-text";
import { slideCatalog } from "../specimen/slide-catalog";
import type { ContentSlide, Slide } from "../types/slide";
import {
  contentRedrawnAs,
  gridAsContent,
  labeledGridAsCards,
  overviewAsPhases,
  regularAsContent,
  companiesWithLogo,
  WORDS,
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
  "theme",
  "sectionTheme",
  "accent",
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
    .replace(/−/g, "-")
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
    // The overflow check finds text the three over-full slides cannot hold, and nothing elsewhere.
    const [own, found] = [
      warnings.filter((w) => !w.startsWith("slide ")),
      warnings.filter((w) => w.startsWith("slide ")),
    ];
    expect(own).toEqual([
      expect.stringMatching(/^blocks table, paragraph: .* taller/),
      "lanes: 30 rows taller than the slide holds",
      "gantt: 40 rows taller than the slide holds",
    ]);
    expect(found.filter((w) => !/^slide [267]: /.test(w))).toEqual([]);
    expect(found.length).toBeGreaterThan(0);
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
      for (const [, alt, cx, cy] of xml.matchAll(
        /descr="([^"]*)"[\s\S]*?<a:ext cx="(\d+)" cy="(\d+)"/g,
      ))
        if (unescape(alt) === verbal.name.company) drawn.push(+cx / +cy);
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

  it.each(["en", "de"] as const)(
    "sets the %s claim in the deck's language, on one row",
    async (lang) => {
      const out = join(dir, `claim-${lang}.pptx`);
      await renderPptx(
        {
          name: "D",
          slides: [
            { type: "title", title: "T", lang },
            { type: "closing", line1: "Danke." },
          ],
        },
        out,
        dir,
      );
      const deck = await JSZip.loadAsync(readFileSync(out));
      const xml = await deck.file("ppt/slides/slide2.xml")!.async("string");
      expect(norm(unescape(xml.replace(/<[^>]+>/g, "")))).toContain(norm(verbal.claim[lang]));
      // One row: the claim's box no higher than its size times the line's 1.25, with some slack.
      const box = shapesOf(xml).find((sp) => sp.texts.includes(verbal.claim.word[lang]))!;
      const size = +/sz="(\d+)"/.exec(box.xml)![1] / 100;
      expect(box.h * 72).toBeLessThan(size * 1.25 * 1.5);
    },
  );

  // A list's first logo was the only one drawn, and only when it was no brand mark: the corner logo
  // the web draws went missing.
  it("stands a logo list as the web does: the last in the corner, the others at the bottom left", async () => {
    const out = join(dir, "logos.pptx");
    const partner = { src: "/specimen/slide-catalog/partner-mark.png", alt: "Partner" };
    const qr = { src: "/specimen/slide-catalog/qr-example.png", alt: "Other" };
    await renderPptx(
      {
        name: "D",
        logo: { src: "/hw-lockup.svg", alt: "hackers&wizards" },
        slideLogos: {
          0: [{ src: "/hw-lockup.svg", alt: "hackers&wizards" }, partner],
          1: [qr, partner],
          2: [],
        },
        slides: [
          { type: "statement", lines: ["A"] },
          { type: "statement", lines: ["B"] },
          { type: "statement", lines: ["C"] },
        ],
      },
      out,
      join(import.meta.dirname, ".."),
    );
    const probe = await JSZip.loadAsync(readFileSync(out));
    const pics = async (i: number) =>
      [
        ...(await probe.file(`ppt/slides/slide${i}.xml`)!.async("string")).matchAll(
          /descr="([^"]*)"[\s\S]*?<a:off x="(\d+)" y="\d+"\/>\s*<a:ext cx="\d+" cy="(\d+)"/g,
        ),
      ].map(([, alt, x, h]) => ({ alt: unescape(alt), x: +x / 914400, h: +h / 914400 }));
    const [one, two, three] = [await pics(1), await pics(2), await pics(3)];
    expect(one.find((p) => p.alt === "Partner")!.x).toBeGreaterThan(10);
    expect(one.find((p) => p.alt === verbal.name.company)!.x).toBeLessThan(1);
    // `h-9` at `bottom-6 left-6` on the print route, whose rem is 21.333 px.
    const other = two.find((p) => p.alt === "Other")!;
    expect(other.x).toBeCloseTo((1.5 * 21.333) / 144, 3);
    expect(other.h).toBeCloseTo((2.25 * 21.333) / 144, 3);
    expect(two.find((p) => p.alt === "Partner")!.x).toBeGreaterThan(10);
    expect(two.some((p) => p.alt === verbal.name.company)).toBe(false);
    expect(three.map((p) => p.alt)).toEqual([verbal.name.company]);
  });

  it("labels a centred closing's LinkedIn link as the web does", async () => {
    const out = join(dir, "closing-linkedin.pptx");
    await renderPptx(
      {
        name: "D",
        slides: [
          {
            type: "closing",
            line1: "Thanks.",
            speakers: [
              { name: "A", company: "B", linkedIn: "https://www.linkedin.com/in/example-name" },
            ],
          },
        ],
      },
      out,
      join(import.meta.dirname, ".."),
    );
    const xml = await (
      await JSZip.loadAsync(readFileSync(out))
    )
      .file("ppt/slides/slide1.xml")!
      .async("string");
    const text = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    expect(text).toContain("in/example-name");
    expect(text.join(" ")).not.toContain("linkedin.com");
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

  it("prints its own words in the deck's language and marks no unnamed cycle segment", async () => {
    const out = join(dir, "deck-words.pptx");
    const segments = [
      { label: "A", percentage: 50 },
      { label: "B", percentage: 50 },
    ];
    await renderPptx(
      {
        name: "D",
        lang: "de",
        slides: [
          {
            type: "comparison",
            variant: "guidance",
            headline: "H",
            examples: [{ title: "T", bad: "b", good: "g" }],
          },
          { type: "closing", variant: "discussion" },
          { type: "chart", variant: "cycle", headline: "C", segments },
          { type: "chart", variant: "cycle", headline: "C", segments, currentSegmentIndex: 0 },
        ],
      },
      out,
      dir,
    );
    const de = await JSZip.loadAsync(readFileSync(out));
    const text = async (n: number) =>
      unescape(
        (await de.file(`ppt/slides/slide${n}.xml`)!.async("string")).replace(/<[^>]+>/g, " "),
      );
    // The labels keep the deck's case and are drawn in capitals, so an edit keeps them capitals.
    expect(await de.file("ppt/slides/slide1.xml")!.async("string")).toMatch(
      /cap="all"[^>]*>.*?<a:t>Schlecht<\/a:t>.*cap="all"[^>]*>.*?<a:t>Gut<\/a:t>/s,
    );
    expect(await text(2)).toContain("Diskussion");
    // The shape that holds the first segment's label, teal where it is marked.
    const label = async (n: number) => {
      const xml = await de.file(`ppt/slides/slide${n}.xml`)!.async("string");
      const before = xml.slice(0, xml.indexOf("<a:t>A</a:t>"));
      return before.slice(before.lastIndexOf("<p:sp>"));
    };
    const teal = `val="${tokens["--color-teal"].slice(1).toUpperCase()}"`;
    expect(await label(3)).not.toContain(teal);
    expect(await label(4)).toContain(teal);
  });

  const unmarked = (item: string) => item.replace(/^[-+]\s*/, "");

  it("sets every text of a slide as text on that slide", () => {
    const missing = slideCatalog.slides.flatMap((slide: Slide, i) => {
      const shown = norm(unescape(slideText[i]));
      // A stats card shows its label in place of its title, as the web card does.
      // A closing whose mark stands centred shows the h&w lockup, and each partner's logo, in place
      // of the company's name.
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
                  partners: undefined,
                  speakers: slide.speakers?.map((sp) =>
                    companiesWithLogo(slide).has(sp.company.toLowerCase())
                      ? { ...sp, company: "" }
                      : sp,
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
    // The y label and the note over the plot as text, the note no longer in the annotation; a
    // line break the export sets reads as the space it replaces.
    const texts = [...xml.matchAll(/<p:txBody>(.*?)<\/p:txBody>/gs)].map(([, body]) =>
      [...body.replace(/<a:br\/>/g, "<a:t> </a:t>").matchAll(/<a:t>([^<]*)<\/a:t>/g)]
        .map((m) => m[1])
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
    );
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
    expect(xml).toContain('prst="round2DiagRect"');
  });

  it("draws a regular and a pillars grid slide as the content slides the web redraws them as", async () => {
    const regular = slideCatalog.slides.find(
      (x) => x.type === "regular" && !x.profile && x.layout !== "cards",
    ) as Extract<Slide, { type: "regular" }>;
    const grid = slideCatalog.slides.find(
      (x) => x.type === "grid" && (x.variant ?? "pillars") === "pillars",
    ) as Extract<Slide, { type: "grid"; variant?: "pillars" }>;
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
    // The words stand brand's 2 px rule and 1.25 rem gap off the rule, at the print route's 21.333
    // px rem; the export stood them 20 px off.
    const shapes = shapesOf(xml);
    const rule = shapes.find((sp) => sp.fill === purple && sp.w! < 0.02)!;
    const words = shapes.find((sp) => sp.texts.some((t) => t.includes("We stopped asking")))!;
    expect(words.x! - rule.x!).toBeCloseTo((2 + 1.25 * 21.333) / 144, 3);
  });

  it.each([
    [
      "an info callout",
      "--color-purple",
      (x: Slide) => JSON.stringify(x).includes("Two stages are active"),
    ],
    ["a process footer", "--color-teal", (x: Slide) => x.type === "process" && !!x.footer],
  ] as const)(
    "draws %s as brand's callout, %s at 10 percent on white with no line",
    (_, hue, pick) => {
      const xml = slideXml[slideCatalog.slides.findIndex(pick)];
      const tint = [1, 3, 5]
        .map((i) => Math.round(parseInt(tokens[hue].slice(i, i + 2), 16) * 0.1 + 255 * 0.9))
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      expect(xml).toContain(`val="${tint}"`);
      const shape = xml.slice(xml.lastIndexOf("<p:sp>", xml.indexOf(`val="${tint}"`)));
      expect(shape.slice(0, shape.indexOf("</p:spPr>"))).toContain("<a:ln></a:ln>");
    },
  );

  it("names a team picture's types under it only where the slide asks for a legend", () => {
    const at = slideCatalog.slides.flatMap((x, i) => (x.type === "team-topology" ? [i] : []));
    const named = at.map((i) => slideXml[i].includes(`<a:t>${WORDS.en.teams.enabling}</a:t>`));
    expect(named).toEqual(
      at.map((i) => !!(slideCatalog.slides[i] as Extract<Slide, { type: "team-topology" }>).legend),
    );
    expect(named).toContain(true);
  });

  // F32: a timed agenda aligned with tabs and set no tab stops, so each viewer's default ones did.
  it("sets tab stops on every paragraph that aligns with a tab", () => {
    const tabbed = slideXml.flatMap((xml, i) =>
      [...xml.matchAll(/<a:p>.*?<\/a:p>/gs)]
        .map(([p]) => p)
        .filter((p) => /<a:t>[^<]*\t/.test(p) && !p.includes("<a:tabLst>"))
        .map(() => i + 1),
    );
    expect(tabbed).toEqual([]);
    expect(slideXml.some((xml) => xml.includes("<a:tabLst>"))).toBe(true);
  });

  // F22: a second series that starts late was drawn at zero before its first value.
  it("leaves a gap where a point has no second value", async () => {
    const out = join(dir, "gap.pptx");
    const data = [
      { name: "a", value: 1 },
      { name: "b", value: 2 },
      { name: "c", value: 3, value2: 5 },
    ];
    await renderPptx(
      { name: "G", slides: [{ type: "chart", variant: "trend", headline: "H", data }] },
      out,
      dir,
    );
    const zipped = await JSZip.loadAsync(readFileSync(out));
    const chart = Object.keys(zipped.files).find((f) => /charts\/chart\d+\.xml$/.test(f))!;
    const second = (await zipped.file(chart)!.async("string")).split("<c:ser>")[2];
    const values = second.slice(second.indexOf("<c:val>"));
    expect([...values.matchAll(/<c:v>([^<]*)<\/c:v>/g)].map((m) => m[1])).toEqual(["", "", "5"]);
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

  it("sets the headline a row below a principle that wraps to the kicker's second row", () => {
    const at = slideCatalog.slides.findLastIndex((s) => s.type === "gantt" && s.principle);
    const s = slideCatalog.slides[at] as Slide & { principle: string; headline: string };
    const shape = (text: string) => {
      const sp = slideXml[at].split("<p:sp>").find((x) => x.includes(`>${text}<`))!;
      const [, y, cy] = /<a:off x="\d+" y="(\d+)"\/><a:ext cx="\d+" cy="(\d+)"/.exec(sp)!;
      return { top: +y, bottom: +y + +cy };
    };
    // The pill keeps the print route's place; the title's box starts below it.
    expect(shape(s.headline).top).toBeGreaterThan(shape(s.principle).bottom);
  });

  it("gives a Gantt bar's label its own line, under the months and the row above", () => {
    const at = slideCatalog.slides.findIndex((s) => s.type === "gantt");
    const d = slideCatalog.slides[at] as Extract<Slide, { type: "gantt" }>;
    const box = (text: string) => {
      const sp = slideXml[at].split("<p:sp>").find((x) => x.includes(`>${text}<`))!;
      const [, y, cy] = /<a:off x="\d+" y="(\d+)"\/><a:ext cx="\d+" cy="(\d+)"/.exec(sp)!;
      return { top: +y, bottom: +y + +cy };
    };
    const months = Math.max(...d.columns.map((c) => box(c).bottom));
    d.rows.forEach((r, i) => {
      for (const bar of r.bars) {
        expect(box(bar.label).top).toBeGreaterThanOrEqual(months);
        if (i) expect(box(bar.label).top).toBeGreaterThanOrEqual(box(d.rows[i - 1].label).bottom);
      }
    });
  });

  it("stacks milestones that share a column, as the web does", async () => {
    const xml = await onlySlide("milestones.pptx", {
      type: "gantt",
      headline: "H",
      columns: ["Q1", "Q2"],
      rows: [{ label: "R", bars: [{ label: "B", start: 1, span: 2 }] }],
      milestones: [
        { label: "Review", column: 2 },
        { label: "Go-live", column: 2 },
      ],
    });
    const top = (text: string) =>
      xml
        .split("<p:sp>")
        .find((sp) => sp.includes(`>${text}<`))
        ?.match(/<a:off x="\d+" y="(\d+)"/)?.[1];
    expect(top("Review")).toBeDefined();
    expect(Number(top("Go-live"))).toBeGreaterThan(Number(top("Review")));
  });

  it("prints a bar's figure with the deck's decimal mark", async () => {
    const out = join(dir, "bars-de.pptx");
    await renderPptx(
      {
        name: "T",
        lang: "de",
        slides: [
          {
            type: "content",
            headline: "H",
            content: [{ type: "bars", max: 10, bars: [{ label: "a", value: 2.5 }] }],
          },
        ],
      },
      out,
      dir,
    );
    const xml = await (
      await JSZip.loadAsync(readFileSync(out))
    )
      .file("ppt/slides/slide1.xml")!
      .async("string");
    expect(xml).toContain(">2,5<");
  });

  it("names what a bar chart's values count", async () => {
    const xml = await onlySlide("bar-label.pptx", {
      type: "chart",
      variant: "bar",
      headline: "H",
      data: [{ name: "Plan", value: 3 }],
      yLabel: "Open tickets",
    });
    expect(xml).toContain("Open tickets");
  });

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

// The measure reads hmtx as a plain table; a WOFF2 encoder may transform it, which drops the left
// side bearings and would shift every advance it reads.
it("refuses a face whose hmtx table is transformed, and reads one whose hmtx is plain", () => {
  const font = Buffer.from(readFileSync(faceFiles(false, false)[0]));
  expect(woff2Tables(font).get("hmtx")!.length).toBeGreaterThan(0);
  let at = 48;
  const skip = () => {
    while (font[at++] & 0x80);
  };
  for (let i = 0; i < font.readUInt16BE(12); i++) {
    const flags = font[at];
    if ((flags & 0x3f) === 3) {
      font[at] = flags | 0x40;
      break;
    }
    at += (flags & 0x3f) === 63 ? 5 : 1;
    skip();
    const index = flags & 0x3f;
    if (index === 10 || index === 11 ? flags >> 6 !== 3 : flags >> 6 !== 0) skip();
  }
  expect(() => woff2Tables(font)).toThrow(/hmtx/);
});

// Each shape of a slide: its preset, frame in inches, fill, line dash and texts.
const shapesOf = (xml: string) =>
  [...xml.matchAll(/<p:sp>(.*?)<\/p:sp>/gs)].map(([, b]) => {
    const [x, y, w, h] = (
      /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"/.exec(b) ?? []
    )
      .slice(1)
      .map((v) => +v / 914400);
    return {
      prst: /prst="(\w+)"/.exec(b)?.[1],
      x,
      y,
      w,
      h,
      fill: /<p:spPr>.*?<a:solidFill><a:srgbClr val="(\w+)"/s.exec(b)?.[1],
      dash: /<a:prstDash val="(\w+)"/.exec(b)?.[1],
      texts: [...b.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]),
      xml: b,
    };
  });
const specimenAt = (test: (s: Slide) => boolean) => slideCatalog.slides.findIndex(test);
const TEAL = tokens["--color-teal"].slice(1).toUpperCase();
const REM = 21.333 / 144;

describe("slides-pptx draws what the slide shows", () => {
  it("finds no text taller or wider than its box, across its shape or off the slide, and finds each where it is", () => {
    const found = slideXml.flatMap((x, i) =>
      checkSlide(x, 13.333, 7.5).map((f) => `slide ${i + 1}: ${f}`),
    );
    expect(found).toEqual([]);
    // Controls on a real slide: its title squeezed, a card's text pushed out of its card, the
    // title moved off the slide.
    const i = specimenAt((x) => x.type === "content" && x.content.some((b) => b.type === "cards"));
    const xml = slideXml[i];
    const title = shapesOf(xml).find(
      (sh) => sh.texts.join("") === (slideCatalog.slides[i] as ContentSlide).headline,
    )!;
    const ext = /<a:ext cx="\d+" cy="\d+"\/>/.exec(title.xml)![0];
    expect(
      checkSlide(
        xml.replace(title.xml, title.xml.replace(ext, ext.replace(/cy="\d+"/, 'cy="45720"'))),
        13.333,
        7.5,
      ).join(),
    ).toMatch(/tall in a box/);
    const off = /<a:off x="(\d+)"/.exec(title.xml)!;
    expect(
      checkSlide(
        xml.replace(title.xml, title.xml.replace(off[0], '<a:off x="11000000"')),
        13.333,
        7.5,
      ).join(),
    ).toMatch(/slide/);
    const inCard = shapesOf(xml).find(
      (sh) =>
        sh.texts.length &&
        shapesOf(xml).some(
          (c) =>
            c.prst === "round2DiagRect" &&
            c.x! <= sh.x! &&
            sh.x! + sh.w! <= c.x! + c.w! &&
            c.y! <= sh.y! &&
            sh.y! < c.y! + c.h!,
        ),
    )!;
    // Raised so its top stands above the card while its centre stays inside.
    const card = shapesOf(xml).find(
      (c) =>
        c.prst === "round2DiagRect" &&
        c.x! <= inCard.x! &&
        c.y! <= inCard.y! &&
        inCard.y! < c.y! + c.h!,
    )!;
    const at = /<a:off x="(\d+)" y="(\d+)"/.exec(inCard.xml)!;
    const raised = Math.round((card.y! - 0.4 * inCard.h!) * 914400);
    expect(
      checkSlide(
        xml.replace(inCard.xml, inCard.xml.replace(at[0], `<a:off x="${at[1]}" y="${raised}"`)),
        13.333,
        7.5,
      ).join(),
    ).toMatch(/crosses the edge/);
  });

  it("sets every line at an exact height in points, as the web's line height, never a share of the font's own", () => {
    const all = slideXml.join("");
    expect(all).not.toMatch(/<a:lnSpc><a:spcPct/);
    expect(all).toMatch(/<a:lnSpc><a:spcPts val="\d+"\/><\/a:lnSpc>/);
  });

  it("keeps a section label in the deck's case and sets it in capitals with cap", () => {
    const i = specimenAt(
      (x) =>
        "sectionLabel" in x &&
        !!x.sectionLabel &&
        /[a-z]/.test(x.sectionLabel) &&
        !/[&<>]/.test(x.sectionLabel),
    );
    const label = (slideCatalog.slides[i] as { sectionLabel: string }).sectionLabel;
    const run = new RegExp(
      `<a:rPr [^>]*cap="all"[^>]*>(?:(?!<\\/a:r>).)*<a:t>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/a:t>`,
      "s",
    );
    expect(slideXml[i]).toMatch(run);
  });

  it("breaks a headline into balanced lines, as the web's text-wrap: balance", async () => {
    const headline = "Each team ships on its own schedule, every single week";
    const out = join(dir, "balanced.pptx");
    await renderPptx(
      { name: "T", slides: [{ type: "content", headline, content: [] } as Slide] },
      out,
      dir,
    );
    const xml = await (
      await JSZip.loadAsync(readFileSync(out))
    )
      .file("ppt/slides/slide1.xml")!
      .async("string");
    const title = shapesOf(xml).find(
      (sh) =>
        sh.texts.join(" ").replace(/\s+/g, " ").trim() === headline ||
        sh.texts.join("") === headline,
    )!;
    expect(title.xml).toContain("<a:br/>");
    const lines = title.xml.split("<a:br/>").map(
      (part) =>
        [...part.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
          .map((m) => m[1])
          .join("")
          .trim().length,
    );
    expect(lines).toHaveLength(2);
    expect(Math.abs(lines[0] - lines[1])).toBeLessThan(12);
  });

  it("numbers a process's tiles as FlowSteps does, a numbered: false step's tile empty", () => {
    const i = specimenAt(
      (x) => x.type === "process" && x.headline === "A request through three teams",
    );
    const tiles = shapesOf(slideXml[i]).filter(
      (sh) => sh.prst === "roundRect" && Math.abs(sh.w! - sh.h!) < 0.01,
    );
    expect(tiles).toHaveLength(5);
    const numbers = shapesOf(slideXml[i]).filter((sh) => /^\d$/.test(sh.texts.join("")));
    expect(numbers.map((sh) => sh.texts.join(""))).toEqual(["1", "2", "3"]);
    // Each number in a tile, the first and last tiles empty.
    for (const [n, t] of numbers.map((sh, k) => [sh, tiles[k + 1]] as const))
      expect(Math.abs(n.x! - t.x!)).toBeLessThan(0.01);
  });

  it("marks a plain card with the web's short teal rule, never a square", () => {
    const i = specimenAt(
      (x) =>
        x.type === "content" &&
        x.content.some(
          (b) => b.type === "cards" && !b.numbered && !b.dense && b.items.every((it) => !it.icon),
        ),
    );
    const rules = shapesOf(slideXml[i]).filter(
      (sh) => sh.fill === TEAL && Math.abs(sh.w! - 4 * REM) < 0.01,
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) expect(r.h).toBeLessThan(r.w! / 4);
  });

  it("draws a numbers block's figures in teal mono over a rule, as the web's Numbers", () => {
    const i = specimenAt(
      (x) =>
        x.type === "content" && x.content.some((b) => b.type === "numbers" && b.items.length > 1),
    );
    const block = (slideCatalog.slides[i] as ContentSlide).content.find(
      (b) => b.type === "numbers",
    )! as Extract<ContentSlide["content"][number], { type: "numbers" }>;
    const shapes = shapesOf(slideXml[i]);
    expect(shapes.filter((sh) => sh.prst === "line").length).toBeGreaterThanOrEqual(
      block.items.length,
    );
    const figure = shapes.find((sh) =>
      sh.texts.join("").endsWith(block.items[0].value.replace(/^-/, "−")),
    )!;
    expect(figure.xml).toContain(`<a:srgbClr val="${TEAL}"/>`);
    expect(figure.xml).toContain('typeface="JetBrains Mono"');
  });

  it("writes a timeline figure's minus as the web's", () => {
    const i = specimenAt(
      (x) =>
        x.type === "content" &&
        x.content.some((b) => b.type === "timeline" && b.events.some((e) => e.figure === "-90 %")),
    );
    expect(slideXml[i]).toContain("<a:t>−90 %</a:t>");
    expect(slideXml[i]).not.toContain("-90");
  });

  // A figure's box is one line high, so a wrapped figure warns as text taller than its box.
  it("keeps a five-digit figure with its unit on one line in every numbers layout", async () => {
    type Numbers = Extract<ContentSlide["content"][number], { type: "numbers" }>;
    const lone = (b: ContentSlide["content"][number]): b is Numbers =>
      b.type === "numbers" && b.items.length === 1;
    const one = slideCatalog.slides.find(
      (x) => x.type === "content" && x.content.some(lone),
    ) as ContentSlide;
    const block = one.content.find(lone)!;
    const slides = [1, 2, 4, 6].map((n) => ({
      ...one,
      content: [
        {
          ...block,
          items: Array(n).fill({ ...block.items[0], value: "12.345 %" }),
        },
      ],
    }));
    const out = join(dir, "long-figures.pptx");
    expect(await renderPptx({ name: "T", slides }, out, join(import.meta.dirname, ".."))).toEqual(
      [],
    );
  });

  it("draws a team picture as the web lays it out: enabling columns side by side, subsystem octagons in one row, the platform teams in one dotted frame, roles beside a stream team's name", () => {
    const i = specimenAt(
      (x) =>
        x.type === "team-topology" &&
        (x.complicatedSubsystem?.length ?? 0) > 1 &&
        x.platform.length > 1 &&
        x.enabling.length > 0,
    );
    const slide = slideCatalog.slides[i] as Extract<Slide, { type: "team-topology" }>;
    const shapes = shapesOf(slideXml[i]);
    const top = (sh: { y?: number }) => +sh.y!.toFixed(2);
    const octagons = shapes.filter((sh) => sh.prst === "octagon");
    expect(octagons).toHaveLength(slide.complicatedSubsystem!.length);
    expect(new Set(octagons.map(top)).size).toBe(1);
    const frames = shapes.filter((sh) => sh.dash === "sysDot" && sh.w! > 2);
    expect(frames).toHaveLength(1);
    for (const t of slide.platform) {
      const name = shapes.find((sh) => sh.texts.join("") === t.name)!;
      expect(name.x!).toBeGreaterThanOrEqual(frames[0].x!);
      expect(name.y!).toBeGreaterThanOrEqual(frames[0].y!);
      expect(name.y! + name.h!).toBeLessThanOrEqual(frames[0].y! + frames[0].h!);
    }
    const purple = tokens["--color-purple"].slice(1).toUpperCase();
    const enabling = shapes.filter(
      (sh) =>
        sh.xml.includes(`<a:ln w="`) &&
        sh.xml.includes(`val="${purple}"/></a:solidFill><a:prstDash`) &&
        sh.h! > 1,
    );
    expect(enabling.length).toBe(slide.enabling.length);
    expect(new Set(enabling.map(top)).size).toBe(1);
    // A short team's roles follow its name on its line, on the first team picture.
    const j = specimenAt((x) => x.type === "team-topology");
    const team = (slideCatalog.slides[j] as typeof slide).streamAligned[0];
    const first = shapesOf(slideXml[j]);
    const name = first.find((sh) => sh.texts.join("") === team.name)!;
    const roles = first.find((sh) =>
      sh.texts
        .join("")
        .replace(/\u00a0/g, " ")
        .includes(team.roles[0]),
    )!;
    expect(Math.abs(name.y! + name.h! / 2 - (roles.y! + roles.h! / 2))).toBeLessThan(0.05);
    expect(roles.x!).toBeGreaterThan(name.x! + name.w!);
  });

  it("draws a wheel's segments as arcs with a gap between them", () => {
    const i = specimenAt((x) => x.type === "wheel");
    const slide = slideCatalog.slides[i] as Extract<Slide, { type: "wheel" }>;
    expect(shapesOf(slideXml[i]).filter((sh) => sh.prst === "blockArc")).toHaveLength(
      slide.segments.length,
    );
  });

  it("sets a statement's QR code in a white card with its address under it, as QrStatement", () => {
    const i = specimenAt((x) => x.type === "statement" && !!x.qr && !x.attribution);
    const shapes = shapesOf(slideXml[i]);
    const card = shapes.find((sh) => sh.fill === "FFFFFF" && Math.abs(sh.w! - sh.h!) < 0.01)!;
    expect(card.w).toBeGreaterThan(3);
    const address = shapes.find((sh) => sh.texts.join("").startsWith("↗"))!;
    expect(address.y!).toBeGreaterThan(card.y! + card.h!);
  });

  it("numbers a named scale's ends and quarters under its last track, as the web's Bars", () => {
    const i = specimenAt(
      (x) =>
        x.type === "content" &&
        x.content.some(
          (b) => b.type === "bars" && b.max === 100 && b.bars.some((r) => r.from != null),
        ),
    );
    const ticks = shapesOf(slideXml[i]).filter((sh) =>
      /^(0|25|50|75|100)$/.test(sh.texts.join("")),
    );
    expect(ticks.map((sh) => sh.texts.join(""))).toEqual(["0", "25", "50", "75", "100"]);
    expect(new Set(ticks.map((sh) => sh.y!.toFixed(2))).size).toBe(1);
  });

  it("gives each of a question's options its count, as the printed QuestionSlide", () => {
    const i = specimenAt((x) => x.type === "question");
    const slide = slideCatalog.slides[i] as Extract<Slide, { type: "question" }>;
    const counts = shapesOf(slideXml[i]).filter(
      (sh) => sh.texts.join("") === "0" && sh.xml.includes(`val="${TEAL}"`),
    );
    expect(counts).toHaveLength(slide.options.length);
  });

  it("centres a contact closing's column in the slide, as ContactVariant", () => {
    const i = specimenAt(
      (x) =>
        x.type === "closing" && x.variant !== "discussion" && !x.speakers?.some((p) => p.imageSrc),
    );
    const texts = shapesOf(slideXml[i]).filter((sh) => sh.texts.join("").trim() && sh.y! < 6.8);
    const top = Math.min(...texts.map((sh) => sh.y!));
    const bottom = Math.max(...texts.map((sh) => sh.y! + sh.h!));
    expect(Math.abs((top + bottom) / 2 - 3.75)).toBeLessThan(0.1);
  });

  it("hides the page counter on a contact closing, as the web hides its corner", () => {
    const i = specimenAt((x) => x.type === "closing" && centredMark(x));
    expect(unescape(slideText[i])).not.toMatch(/\d\d \/ \d\d/);
    expect(unescape(slideText[specimenAt((x) => x.type === "content")])).toMatch(/\d\d \/ \d\d/);
  });

  it("draws a bullet as the web's square marker in a face every machine has", () => {
    const bullets = slideXml.filter((x) => x.includes("<a:buChar"));
    expect(bullets.length).toBeGreaterThan(0);
    for (const x of bullets) expect(x).toMatch(/<a:buFont typeface="Arial"/);
  });

  it("never leaves one word alone on a paragraph's last line, as brand's text-wrap: pretty", () => {
    const spans = [
      {
        text: "A team owns its code, its tests and its deployment, end to end",
        size: 18,
        mono: false,
        bold: false,
        tracking: 0,
      },
    ];
    // The measure at which the greedy lines leave "end" alone on the last of three.
    const width = [...Array(400).keys()]
      .map((w) => 100 + w)
      .find((w) => {
        const lines = wrap(spans, w);
        return lines.length === 3 && lines[2].text.trim() === "end";
      })!;
    expect(width).toBeDefined();
    const lines = pretty(spans, width)!;
    expect(lines).toHaveLength(3);
    expect(lines[2].text.trim()).toBe("to end");
    // A last word that can only join the line above by breaking a word stays alone.
    const label = [{ text: "Autonomous team", size: 18, mono: false, bold: true, tracking: 0 }];
    const w = wrap([{ ...label[0], text: "Autonomous" }], Infinity)[0].width + 2;
    expect(pretty(label, w)).toBeUndefined();
  });

  it("indents a numbered list as far as the measure assumes, and steps code highlights by its lines", () => {
    const ordered =
      slideXml[
        specimenAt(
          (x) => x.type === "content" && x.content.some((b) => b.type === "bullets" && !!b.ordered),
        )
      ];
    const numbered = [...ordered.matchAll(/<a:pPr([^>]*)>(?:(?!<\/a:pPr>).)*<a:buAutoNum/g)];
    expect(numbered.length).toBeGreaterThan(0);
    for (const [, attrs] of numbered) expect(attrs).toContain(`marL="${16 * 12700}"`);
    // The annotated code's lines at the web's 1.3 em, the step its highlights take.
    const code =
      slideXml[
        specimenAt(
          (x) => x.type === "content" && x.content.some((b) => b.type === "annotated-code"),
        )
      ];
    expect(code).toContain(`<a:spcPts val="${Math.round(16 * 1.3 * 100)}"/>`);
  });

  it("breaks a line after a space before a forced break, and after a slash", () => {
    const span = { size: 18, mono: false, bold: false, tracking: 0 };
    expect(wrap([{ ...span, text: "Hello \nWorld" }], Infinity)).toHaveLength(2);
    const path = [{ ...span, text: "input/output/storage" }];
    const lines = wrap(path, wrap([{ ...span, text: "input/output/" }], Infinity)[0].width + 1);
    expect(lines.map((l) => l.text)).toEqual(["input/output/", "storage"]);
  });

  it("gives a card brand's corner: the large radius at top left and bottom right, a quarter of it at the others", () => {
    const corners = slideXml.flatMap((x) => [
      ...x.matchAll(
        /prst="round2DiagRect"><a:avLst><a:gd name="adj1" fmla="val (\d+)"\/><a:gd name="adj2" fmla="val (\d+)"\/>/g,
      ),
    ]);
    expect(corners.length).toBeGreaterThan(0);
    for (const [, a1, a2] of corners) expect(Math.abs(+a1 / 4 - +a2)).toBeLessThanOrEqual(1);
  });
});

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

  // A mistyped flag ran the export loose and exited 0 in a gate that asked for --strict.
  it("refuses an argument it does not know, and --assets without a directory", () => {
    expect(run("--stric").status).toBe(1);
    expect(
      spawnSync("bun", [script, "-", join(dir, "cli.pptx"), "--assets"], { input: deck }).status,
    ).toBe(1);
  });

  it("warns once about a missing picture on a slide it measures before drawing", async () => {
    const closing = {
      name: "T",
      slides: [
        {
          type: "closing",
          line1: "Thanks",
          partners: [{ company: "P", src: "/missing.png", width: 2, height: 1 }],
        },
      ],
    } as unknown as Parameters<typeof renderPptx>[0];
    const warnings = await renderPptx(closing, join(dir, "closing.pptx"), dir);
    expect(warnings.filter((w) => w.includes("/missing.png"))).toHaveLength(1);
  });

  it("embeds the brand faces only under --embed-fonts: regular and bold as EOT parts PowerPoint lists", async () => {
    expect(Object.keys(zip.files).some((f) => f.startsWith("ppt/fonts/"))).toBe(false);
    expect(await zip.file("ppt/presentation.xml")!.async("string")).not.toContain("embeddedFont");
    const text = JSON.stringify({
      name: "T",
      slides: [{ type: "statement", lines: ["Größe → `code`"] }],
    });
    const out = join(dir, "fonts.pptx");
    const res = spawnSync("bun", [script, "-", out, "--embed-fonts"], {
      encoding: "utf8",
      input: text,
    });
    expect(res.status).toBe(0);
    const z = await JSZip.loadAsync(readFileSync(out));
    const pres = await z.file("ppt/presentation.xml")!.async("string");
    const list = /<p:notesSz[^>]*\/><p:embeddedFontLst>(.*?)<\/p:embeddedFontLst>/.exec(pres)?.[1];
    expect(list).toBeDefined();
    expect([...pres.matchAll(/ saveSubsetFonts=/g)]).toHaveLength(1);
    expect(await z.file("[Content_Types].xml")!.async("string")).toContain(
      '<Default Extension="fntdata" ContentType="application/x-fontdata"/>',
    );
    const rels = await z.file("ppt/_rels/presentation.xml.rels")!.async("string");
    const families: string[] = [];
    for (const [, face, slots] of list!.matchAll(
      /<p:font typeface="([^"]+)"[^>]*\/>(.*?)<\/p:embeddedFont>/g,
    )) {
      for (const [, slot, id] of slots.matchAll(/<p:(regular|bold) r:id="(\w+)"\/>/g)) {
        const target = new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`).exec(rels)![1];
        const eot = Buffer.from(await z.file(`ppt/${target}`)!.async("uint8array"));
        expect(eot.readUInt32LE(0)).toBe(eot.length);
        expect(eot.readUInt32LE(8)).toBe(0x00020001);
        expect(eot.readUInt16LE(34)).toBe(0x504c);
        expect(eot.readUInt32LE(28)).toBe(slot === "bold" ? 700 : 400);
        const size = eot.readUInt16LE(82);
        expect(Buffer.from(eot.subarray(84, 84 + size)).toString("utf16le")).toBe(face);
        families.push(`${face} ${slot}`);
      }
    }
    expect(families).toEqual([
      "Inter regular",
      "Inter bold",
      "JetBrains Mono regular",
      "JetBrains Mono bold",
    ]);
  }, 60_000);
});
