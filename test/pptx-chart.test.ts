import type JSZip from "jszip";
import { tokens } from "@hackersandwizards/brand/tokens";
import { beforeAll, describe, expect, it } from "vitest";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Slide } from "../types/slide";
import { onlySlide, rendered, specimen } from "./fixtures/rendered-deck";

let slideXml: string[];
let slideCharts: string[][];
const allCharts = () => slideCharts.flat();

const markedAt = slideCatalog.slides.findIndex(
  (s) => s.type === "chart" && s.variant === "trend" && s.currentMarker,
);

beforeAll(async () => {
  ({ slideXml, slideCharts } = await specimen());
}, 60_000);

describe("slides-pptx on the specimen deck", () => {
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

  // F22: a second series that starts late was drawn at zero before its first value.
  it("leaves a gap where a point has no second value", async () => {
    const data = [
      { name: "a", value: 1 },
      { name: "b", value: 2 },
      { name: "c", value: 3, value2: 5 },
    ];
    const { zip: zipped } = await rendered({
      name: "G",
      slides: [{ type: "chart", variant: "trend", headline: "H", data }],
    });
    const chart = Object.keys(zipped.files).find((f) => /charts\/chart\d+\.xml$/.test(f))!;
    const second = (await zipped.file(chart)!.async("string")).split("<c:ser>")[2];
    const values = second.slice(second.indexOf("<c:val>"));
    expect([...values.matchAll(/<c:v>([^<]*)<\/c:v>/g)].map((m) => m[1])).toEqual(["", "", "5"]);
  });

  it("fills a lone series' measured part when it holds two points or more", async () => {
    const { zip: zipped } = await rendered({
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
    });
    expect(await zipped.file("ppt/slides/slide1.xml")!.async("string")).toContain("<a:custGeom>");
  });

  it("keeps a bar's names level where every word fits its band, else lets them tilt", async () => {
    const bars = allCharts().filter((xml) => xml.includes("<c:barChart>"));
    expect(bars.length).toBeGreaterThan(0);
    for (const xml of bars) expect(xml).toMatch(/<c:catAx>.*?<a:bodyPr rot="0" vert="horz"\/>/s);
    const name = "Implementierungsphasenabschlussbericht";
    const { zip: zipped } = await rendered({
      name: "B",
      slides: [
        {
          type: "chart",
          variant: "bar",
          headline: "H",
          data: Array.from({ length: 8 }, (_, i) => ({ name: `${name} ${i}`, value: i + 1 })),
        },
      ],
    });
    const chart = Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))!;
    expect(await zipped.file(chart)!.async("string")).not.toContain('rot="0"');
  });

  it("keeps a marked two-series trend's planned halves out of the legend", async () => {
    const { zip: zipped } = await rendered({
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
    });
    const chart = Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))!;
    const xml = await zipped.file(chart)!.async("string");
    expect(xml.match(/<c:legendEntry>/g)).toHaveLength(2);
    expect(xml.match(/<a:prstDash val="dash"\/>/g)).toHaveLength(2);
  });

  const chartXml = (zipped: JSZip) => {
    const chart = Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))!;
    return zipped.file(chart)!.async("string");
  };

  it("leaves an unnamed series out of the legend, as the web does", async () => {
    const { zip } = await rendered({
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
    });
    const xml = await chartXml(zip);
    expect(xml).toContain('<c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>');
    expect(xml.match(/<c:legendEntry>/g)).toHaveLength(1);
  });

  it("names what a bar chart's values count", async () => {
    const xml = await onlySlide({
      type: "chart",
      variant: "bar",
      headline: "H",
      data: [{ name: "Plan", value: 3 }],
      yLabel: "Open tickets",
    });
    expect(xml).toContain("Open tickets");
  });
});
