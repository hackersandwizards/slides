import { join } from "node:path";
import type JSZip from "jszip";
import { assert, beforeAll, describe, expect, it } from "vitest";
import { HW_LOGO } from "../lib/logo";
import { slideDrawn } from "../scripts/pptx/slides";
import { slideCatalog, specimenImages } from "../specimen/slide-catalog";
import type { Presentation, Slide } from "../types/slide";
import {
  norm,
  rendered,
  specimen,
  specimenAt,
  specimenSlide,
  texts,
  unescapeNamedEntities,
} from "./fixtures/rendered-deck";

// The slide is 13.33 by 7.5 in, in EMU.
const [SLIDE_W, SLIDE_H] = [12192000, 6858000];

const assetsRoot = join(import.meta.dirname, "..");
const qrHref = "https://example.com/talk?utm_source=deck&utm_medium=qr";

// Slides the specimen keeps within bounds, pushed past them: a link with `&`, a stack taller than
// the slide, chip rows wider than it, a picture without alt text (F02, F05, F07, F12).
const overFullDeck: Presentation = {
  name: "T",
  slides: [
    {
      type: "title",
      kicker: "Field report",
      name: "Lumen Harness",
      title: "Four hundred engineers, one delivery harness, twelve months",
      speakers: ["Mara Lindqvist", "Jonas Okafor"],
      event: "Delivery Days 2026 · 14 May · Rotterdam",
      qr: { src: specimenImages["qr-example.png"], href: qrHref },
      notes: "title: a talk's opening, every field, the QR code to a fictional link.",
    },
    {
      type: "content",
      headline: "A table taller than the slide",
      content: [
        {
          type: "table",
          headers: ["Team", "Lead time", "Failure rate"],
          rows: Array.from({ length: 10 }, (_, i) => [`Team ${i}`, `${i} days`, `${i}%`]),
        },
        { type: "paragraph", text: "Under it." },
      ],
    },
    {
      type: "lanes",
      headline: "Three tickets at once",
      sectionLabel: "Lanes",
      principle: "In parallel",
      footer: "Each lane is one agent.",
      notes: "lanes: three lanes, kicker, principle, footer.",
      lanes: [
        { label: "LF-142", stages: Array.from({ length: 6 }, (_, i) => `Stage number ${i + 1}`) },
        { label: "LF-143", stages: ["Plan", "Build"] },
        { label: "LF-144", stages: ["Plan"] },
      ],
    },
    {
      type: "phased-pills",
      title: "Pipeline stages",
      phases: [
        {
          label: "Plan",
          theme: "primary",
          items: Array.from({ length: 6 }, (_, i) => ({ number: i, title: "Long item" })),
        },
        {
          label: "Build",
          theme: "primary",
          items: [
            { number: 3, title: "Implement" },
            { number: 4, title: "Test" },
          ],
        },
        {
          label: "Ship",
          theme: "primary",
          items: [
            { number: 5, title: "Review" },
            { number: 6, title: "Deploy" },
          ],
        },
      ],
      notes: "phased-pills: three phases, new and active states.",
    },
    {
      type: "content",
      sectionLabel: "Block: image",
      headline: "A screenshot at its full size",
      content: [{ type: "image", src: specimenImages["screen-team-board.png"] }],
      notes: "content blocks: image.",
    },
    {
      type: "lanes",
      headline: "Three tickets at once",
      sectionLabel: "Lanes",
      principle: "In parallel",
      footer: "Each lane is one agent.",
      notes: "lanes: three lanes, kicker, principle, footer.",
      lanes: Array.from({ length: 30 }, (_, i) => ({ label: `L${i}`, stages: ["a"] })),
    },
    {
      type: "gantt",
      headline: "The programme at a glance",
      sectionLabel: "Plan",
      principle: "A month is a planning unit",
      columns: ["M1", "M2", "M3", "M4", "M5", "M6"],
      rows: Array.from({ length: 40 }, (_, i) => ({ label: `R${i}`, bars: [] })),
      milestones: [
        { label: "Baseline", column: 1 },
        { label: "Handover", column: 6 },
      ],
      milestonesLabel: "Milestones",
      footer: "Fictional plan.",
      notes: "gantt: kicker, principle, sublabels, continuous bar, milestones, footer.",
    },
  ],
};

let zip: JSZip;
let slideXml: string[];
let slideText: string[];

beforeAll(async () => {
  ({ zip, slideXml, slideText } = await specimen());
}, 60_000);

describe("slides-pptx on the specimen deck", () => {
  it("renders the specimen without a warning", async () => {
    expect((await specimen()).warnings).toEqual([]);
  });

  it("writes one slide per deck slide", () => {
    expect(slideXml).toHaveLength(slideCatalog.slides.length);
  });

  const stats = specimenSlide("Numbers after six months", "grid");
  const versus = specimenSlide("Prompting against a harness", "comparison");
  const imageSteps = specimenSlide("One board, built up step by step", "content");
  const questions = slideCatalog.slides.find(
    (slide) => slide.type === "closing" && slide.line1 === "Questions?",
  );
  const partnerClosing = slideCatalog.slides.find(
    (slide) => slide.type === "closing" && slide.partners?.length === 1,
  );
  assert(questions, "Specimen contact closing without portraits");
  assert(partnerClosing, "Specimen contact closing with the partner logo");

  // A stats card shows its label in place of its title, as the web card does.
  // A closing whose mark stands centred shows the h&w lockup, and each partner's logo, in place
  // of the company's name.
  // A vs comparison item's leading + or - is its mark, not its text.
  // Image steps show their last step, as print does: a file has no arrow steps.
  const specialTextSlides = new Set([stats, versus, imageSteps, questions, partnerClosing]);

  // An overview draws as phased pills, its stage descriptions gone, as on the web.
  it("sets every text of a slide as text on that slide", () => {
    const slides = [...slideCatalog.slides.entries()].filter(
      ([, slide]) => !specialTextSlides.has(slide),
    );
    expect(slides).toHaveLength(134);
    const missing = slides.flatMap(([i, slide]) => {
      const shown = norm(unescapeNamedEntities(slideText[i]));
      return texts(slideDrawn(slide))
        .filter((t) => !shown.includes(norm(t)))
        .map((t) => `slide ${i + 1} (${slide.type}): ${t}`);
    });
    expect(missing).toEqual([]);
  });

  it("uses a stats card's label in place of its title", () => {
    const shown = norm(unescapeNamedEntities(slideText[slideCatalog.slides.indexOf(stats)]));
    const xml = slideXml[slideCatalog.slides.indexOf(stats)];
    const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(([, text]) => norm(text));
    const titles = ["Lead time", "Rework", "Teams"];
    const visible = [
      stats.headline,
      "2d",
      "from 9d",
      "Median, all teams.",
      "-40%",
      "per ticket",
      "Fictional.",
      "38",
      "on the harness",
      "Of 40.",
    ];
    expect({
      missing: visible.filter((text) => !shown.includes(norm(text))),
      printedTitles: titles.filter((text) => runs.includes(norm(text))),
    }).toEqual({ missing: [], printedTitles: [] });
  });

  it.each([
    { name: "lockup", slide: questions, companies: [HW_LOGO.alt], labels: [HW_LOGO.alt] },
    {
      name: "partner logo and lockup",
      slide: partnerClosing,
      companies: [HW_LOGO.alt, "Northwind"],
      labels: ["Northwind", HW_LOGO.alt],
    },
  ])(
    "shows the $name in place of the centred closing's company text",
    ({ slide, companies, labels }) => {
      const i = slideCatalog.slides.indexOf(slide);
      const shown = norm(unescapeNamedEntities(slideText[i]));
      const copy = texts(slide).filter((text) => !companies.includes(text));
      const logos = [...slideXml[i].matchAll(/<p:pic>.*?<p:cNvPr [^>]*descr="([^"]*)"/gs)].map(
        ([, alt]) => unescapeNamedEntities(alt),
      );
      expect({
        missing: copy.filter((text) => !shown.includes(norm(text))),
        printedCompanies: companies.filter((company) => shown.includes(norm(company))),
        logos,
      }).toEqual({ missing: [], printedCompanies: [], logos: labels });
    },
  );

  it("sets a vs comparison's minus as a separate mark before the item text", () => {
    const i = slideCatalog.slides.indexOf(versus);
    const shown = norm(unescapeNamedEntities(slideText[i]));
    const items = [...slideXml[i].matchAll(/<a:t>− {2}<\/a:t>.*?<a:t>([^<]*)<\/a:t>/g)].map(
      ([, text]) => text,
    );
    expect({
      missing: texts(versus).filter((text) => !shown.includes(norm(text))),
      minusItems: items,
    }).toEqual({ missing: [], minusItems: ["Ad hoc", "Hard to review", "Knowledge in heads"] });
  });

  it("prints only the final image step's caption", () => {
    const shown = norm(unescapeNamedEntities(slideText[slideCatalog.slides.indexOf(imageSteps)]));
    const earlier = ["The board as the sprint starts", "The chart it feeds"];
    expect({
      missing: texts(imageSteps)
        .filter((text) => !earlier.includes(text))
        .filter((text) => !shown.includes(norm(text))),
      earlierCaptions: earlier.filter((text) => shown.includes(norm(text))),
    }).toEqual({ missing: [], earlierCaptions: [] });
  });

  it("places pictures only for a deck's images and the h&w mark", () => {
    const slidesWithExtraPictures = slideCatalog.slides
      .map((slide, i) => ({
        slide: i + 1,
        pictures: [...slideXml[i].matchAll(/<p:pic>/g)].length,
        allowed:
          1 +
          [
            ...JSON.stringify(slide).matchAll(
              /"(src|imageSrc|logo)":"[^"]+\.(png|jpe?g|webp|gif|svg|mp4|webm|mov)(\?[^"]*)?"/g,
            ),
          ].length,
      }))
      .filter(({ pictures, allowed }) => pictures > allowed);
    expect(slidesWithExtraPictures).toEqual([]);
  });

  const portraitSlides = [
    specimenSlide("Regular slide with a profile sidebar", "regular"),
    slideCatalog.slides[
      specimenAt(
        (slide) =>
          slide.type === "statement" &&
          slide.lines[0] === "We stopped asking how fast the agent types",
      )
    ],
    specimenSlide("Two who changed how they review", "grid"),
    specimenSlide("Your trainers", "profiles"),
    slideCatalog.slides[
      specimenAt(
        (slide) =>
          slide.type === "closing" && slide.speakers?.some((speaker) => speaker.imageSrc) === true,
      )
    ],
    slideCatalog.slides[
      specimenAt(
        (slide) => slide.type === "statement" && slide.lines[0] === "The build time set the pace",
      )
    ],
  ];

  it("crops every portrait to a circle, as the slides' avatar", () => {
    const portraits = slideCatalog.slides
      .map((slide, i) => ({ slide, i }))
      .filter(({ slide }) => /"imageSrc":"[^"]*portrait-/.test(JSON.stringify(slide)));
    expect(portraits.length).toBeGreaterThanOrEqual(5);
    expect(portraits.map(({ slide }) => slide)).toEqual(portraitSlides);
    expect(
      portraits.filter(({ i }) => !/<p:pic>(?:(?!<\/p:pic>).)*prst="ellipse"/s.test(slideXml[i])),
    ).toEqual([]);
  });

  const contentSlides = slideCatalog.slides.filter((slide) => slide.type === "content");
  const chartSlides = slideCatalog.slides.filter((slide) => slide.type === "chart");

  it.each([
    {
      kind: "table",
      covered: contentSlides.filter((slide) =>
        slide.content.some((block) => block.type === "table"),
      ),
      slides: [
        specimenSlide("Table, full and compact", "content"),
        specimenSlide("Table, revealed row by row", "content"),
      ],
      markup: "<a:tbl>",
    },
    {
      kind: "trend chart",
      covered: chartSlides.filter((slide) => slide.variant === "trend"),
      slides: [
        specimenSlide("Lead time fell, review wait did not", "chart"),
        specimenSlide("Every run measures against the first", "chart"),
      ],
      markup: "drawingml/2006/chart",
    },
    {
      kind: "bar chart",
      covered: chartSlides.filter((slide) => slide.variant === "bar"),
      slides: [
        specimenSlide("Build holds the most tickets", "chart"),
        specimenSlide("Review time goes to waiting", "chart"),
      ],
      markup: "drawingml/2006/chart",
    },
  ])("draws each $kind as editable PowerPoint content", ({ slides, covered, markup }) => {
    expect(covered).toEqual(slides);
    expect(
      slides.filter((slide) => !slideXml[slideCatalog.slides.indexOf(slide)].includes(markup)),
    ).toEqual([]);
  });

  // F32: a timed agenda aligned with tabs and set no tab stops, so each viewer's default ones did.
  it("sets tab stops on every paragraph that aligns with a tab", () => {
    const paragraphs = slideXml.flatMap((xml, i) =>
      [...xml.matchAll(/<a:p>.*?<\/a:p>/gs)].map(([xml]) => ({ slide: i + 1, xml })),
    );
    const tabbed = new Set(paragraphs.filter(({ xml }) => /<a:t>[^<]*\t/.test(xml)));
    const stopped = new Set(paragraphs.filter(({ xml }) => xml.includes("<a:tabLst>")));
    expect(tabbed.size).toBeGreaterThan(0);
    expect(tabbed.difference(stopped)).toEqual(new Set());
  });

  it("names the brand fonts with their pitch, so a machine without them substitutes in kind", () => {
    const all = slideXml.join("");
    expect(all).toContain('typeface="Inter" pitchFamily="34" charset="0"');
    expect(all).toContain('typeface="JetBrains Mono" pitchFamily="49" charset="0"');
    expect(all).not.toMatch(/typeface="JetBrains Mono" pitchFamily="34"/);
  });
});

/** What PowerPoint draws off the slide, at a negative size, or cropped outside the picture: each
 *  shape's offset and extent against the slide, and each crop's edges against 0 to 100 %. */
describe("slides-pptx package and shape bounds", () => {
  let overFull: Awaited<ReturnType<typeof rendered>>;
  beforeAll(async () => {
    overFull = await rendered(overFullDeck, assetsRoot);
  });

  it("warns when the table, lanes and gantt exceed the available height", () => {
    expect(overFull.warnings.filter((warning) => !warning.startsWith("slide "))).toEqual([
      expect.stringMatching(/^blocks table, paragraph: .* taller/),
      "lanes: 30 rows taller than the slide holds",
      "gantt: 40 rows taller than the slide holds",
    ]);
  });

  // The overflow check finds text the three over-full slides cannot hold, and nothing elsewhere.
  it("reports text overflow only on over-full slides", () => {
    const warnings = overFull.warnings.filter((warning) => warning.startsWith("slide "));
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.filter((warning) => !/^slide [267]: /.test(warning))).toEqual([]);
  });

  it("escapes the QR picture's link in its relationship", async () => {
    const part = overFull.zip.file("ppt/slides/_rels/slide1.xml.rels");
    assert(part, "The QR slide has a relationships part");
    const slide = new DOMParser().parseFromString(overFull.slideXml[0], "application/xml");
    const links = Array.from(slide.getElementsByTagName("p:pic")).flatMap((picture) =>
      Array.from(picture.getElementsByTagName("a:hlinkClick")),
    );
    expect(links).toHaveLength(1);
    const id = links[0].getAttribute("r:id");
    assert(id, "The QR picture has a relationship ID");
    const rels = [...(await part.async("string")).matchAll(/<Relationship [^>]*\/>/g)];
    expect(rels.map(([rel]) => rel).filter((rel) => rel.includes(`Id="${id}"`))).toEqual([
      expect.stringContaining(
        'Target="https://example.com/talk?utm_source=deck&amp;utm_medium=qr"',
      ),
    ]);
  });

  it("keeps the local asset path out of every XML part", async () => {
    const parts = Object.values(overFull.zip.files).filter(({ name }) =>
      /\.(xml|rels)$/.test(name),
    );
    const entries = await Promise.all(
      parts.map(async (part) => ({ name: part.name, xml: await part.async("string") })),
    );
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.filter(({ xml }) => xml.includes(assetsRoot)).map(({ name }) => name)).toEqual(
      [],
    );
  });

  // The lanes and the gantt hold more rows than fit: they warn, and stay well-formed.
  describe.each([
    {
      deck: "specimen",
      output: () => ({ zip, slideXml }),
      boundedSlides: slideCatalog.slides.length,
    },
    { deck: "over-full", output: () => overFull, boundedSlides: 5 },
  ])("$deck deck", ({ output, boundedSlides }) => {
    let parts: JSZip.JSZipObject[];
    let slides: string[];
    let frames: { slide: number; l: number; t: number; w: number; h: number }[];

    beforeAll(() => {
      const { zip, slideXml } = output();
      slides = slideXml;
      parts = Object.values(zip.files).filter(({ name }) => /\.(xml|rels)$/.test(name));
      frames = slides.flatMap((xml, i) =>
        [
          ...xml.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(-?\d+)" cy="(-?\d+)"\/>/g),
        ].map(([, x, y, cx, cy]) => ({ slide: i + 1, l: +x, t: +y, w: +cx, h: +cy })),
      );
    });

    // A malformed part opens in no viewer: Quick Look hangs on it and PowerPoint offers a repair.
    it("writes well-formed XML in every part", async () => {
      expect(parts.length).toBeGreaterThan(0);
      const parsed = await Promise.all(
        parts.map(async (part) => ({
          name: part.name,
          document: new DOMParser().parseFromString(await part.async("string"), "application/xml"),
        })),
      );
      expect(
        parsed
          .filter(({ document }) => document.getElementsByTagName("parsererror").length)
          .map(({ name }) => name),
      ).toEqual([]);
    });

    it("keeps shapes at non-negative sizes", () => {
      expect(frames.length).toBeGreaterThan(0);
      const negative = frames.filter(({ w, h }) => Math.min(w, h) < 0);
      expect(negative).toEqual([]);
    });

    it("keeps shapes on slides that fit", () => {
      expect(frames.length).toBeGreaterThan(0);
      const bounded = frames.filter(({ slide }) => slide <= boundedSlides);
      // A rounding tenth of a millimetre past the edge is no defect.
      const allowed = 3600;
      const outside = bounded.filter(
        ({ l, t, w, h }) => Math.max(-l, -t, l + w - SLIDE_W, t + h - SLIDE_H) > allowed,
      );
      expect(outside).toEqual([]);
    });

    it("keeps picture crops within the picture", () => {
      const edges = slides.flatMap((xml, i) =>
        [...xml.matchAll(/<a:srcRect [^>]*\/>/g)].flatMap(([rect]) =>
          [...rect.matchAll(/ ([lrtb])="(-?\d+)"/g)].map(([, edge, value]) => ({
            slide: i + 1,
            edge,
            value: +value,
          })),
        ),
      );
      expect(edges.filter(({ value }) => value !== Math.min(100000, Math.max(0, value)))).toEqual(
        [],
      );
    });
  });
});

// The specimen deck has no deep-dive slide with bullets: two content slides that differ only there.
it("colours a deep-dive slide's bullets in the night teal, every other slide's in the day teal", async () => {
  const slide = {
    type: "content",
    headline: "H",
    content: [{ type: "bullets", items: ["a", "b"] }],
  };
  const { zip: pptx } = await rendered(
    { ...slideCatalog, slides: [slide, { ...slide, sectionTheme: "deepdive" }] as Slide[] },
    join(import.meta.dirname, "..", "specimen"),
  );
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
  const { zip: pptx } = await rendered(
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
    join(import.meta.dirname, "..", "specimen"),
  );
  for (const part of ["ppt/slides/slide2.xml", "ppt/notesSlides/notesSlide2.xml"])
    expect(await pptx.file(part)!.async("string")).toContain('lang="de-DE"');
  for (const part of Object.keys(pptx.files).filter((f) => f.endsWith(".xml")))
    expect(await pptx.file(part)!.async("string")).not.toContain('lang="en-US"');
});

describe("slides-pptx draws what the slide shows", () => {
  it("sets every line at an exact height in points, as the web's line height, never a share of the font's own", () => {
    const all = slideXml.join("");
    expect(all).not.toMatch(/<a:lnSpc><a:spcPct/);
    expect(all).toMatch(/<a:lnSpc><a:spcPts val="\d+"\/><\/a:lnSpc>/);
  });

  it("draws a bullet as the web's square marker in a face every machine has", () => {
    const bullets = slideXml.filter((x) => x.includes("<a:buChar"));
    expect(bullets.length).toBeGreaterThan(0);
    for (const x of bullets) expect(x).toMatch(/<a:buFont typeface="Arial"/);
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
