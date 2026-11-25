import { join } from "node:path";
import type JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { centredMark } from "../scripts/pptx/chrome";
import { slideCatalog } from "../specimen/slide-catalog";
import type { ContentSlide, Slide } from "../types/slide";
import { overviewAsPhases, companiesWithLogo } from "../lib/slide-utils";
import { norm, rendered, specimen, texts, unescapeNamedEntities } from "./fixtures/rendered-deck";

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
    const root = join(import.meta.dirname, "..");
    const { warnings, zip: probe } = await rendered(
      { name: "T", slides: [title, tall, lanes, pills, pictured, manyLanes, gantt] },
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

  const unmarked = (item: string) => item.replace(/^[-+]\s*/, "");

  it("sets every text of a slide as text on that slide", () => {
    const missing = slideCatalog.slides.flatMap((slide: Slide, i) => {
      const shown = norm(unescapeNamedEntities(slideText[i]));
      // A stats card shows its label in place of its title, as the web card does.
      // A closing whose mark stands centred shows the h&w lockup, and each partner's logo, in place
      // of the company's name.
      // An overview draws as phased pills, its stage descriptions gone, as on the web.
      // A vs comparison item's leading + or - is its mark, not its text.
      // Image steps show their last step, as print does: a file has no arrow steps.
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
                : slide.type === "content"
                  ? {
                      ...slide,
                      content: slide.content.map((b) =>
                        b.type === "image-steps" ? { ...b, steps: b.steps.slice(-1) } : b,
                      ),
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
    const slides = slideCatalog.slides.map((slide, i) => ({ slide, i }));
    const tables = slides.filter(
      ({ slide }) => slide.type === "content" && slide.content.some((b) => b.type === "table"),
    );
    expect(tables.length, "table slides").toBeGreaterThan(0);
    for (const { i } of tables) expect(slideXml[i], `table slide ${i + 1}`).toContain("<a:tbl>");

    for (const variant of ["trend", "bar"]) {
      const charts = slides.filter(
        ({ slide }) => slide.type === "chart" && slide.variant === variant,
      );
      expect(charts.length, `${variant} slides`).toBeGreaterThan(0);
      for (const { i } of charts)
        expect(slideXml[i], `${variant} slide ${i + 1}`).toContain("drawingml/2006/chart");
    }
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
