import { defined } from "@hackersandwizards/scaffolding/defined";
import type JSZip from "jszip";
import { tokens } from "@hackersandwizards/brand/tokens";
import { assert, beforeAll, describe, expect, it } from "vitest";
import { slideCatalog } from "../specimen/slide-catalog";
import { onlySlide, rendered, specimen, specimenSlide } from "./fixtures/rendered-deck";

let slideCharts: string[][];
const allCharts = () => slideCharts.flat();

beforeAll(async () => {
  ({ slideCharts } = await specimen());
}, 60_000);

describe("slides-pptx on the specimen deck", () => {
  describe("a marked trend", () => {
    const firstPoint = {
      type: "chart",
      variant: "trend",
      headline: "Every run measures against the first",
      data: [
        { name: "Month 0", value: 2 },
        { name: "Month 3", value: 3 },
        { name: "Month 6", value: 5 },
        { name: "Month 12", value: 8 },
      ],
      xLabel: "Time",
      yLabel: "Teams on the harness",
      currentMarker: "Month 0",
      futureNote: "Baseline → repeat run → progress view → adoption over time",
      annotation: "Fictional figures.",
    } as const;
    let renderedTrend: Awaited<ReturnType<typeof rendered>>;
    let chart: string;
    let xml: string;

    beforeAll(async () => {
      renderedTrend = await rendered({
        name: "Trend",
        slides: [
          { ...firstPoint, data: [...firstPoint.data] },
          { ...firstPoint, data: [...firstPoint.data], currentMarker: "Month 3" },
        ],
      });
      [xml] = renderedTrend.slideXml;
      [[chart]] = renderedTrend.slideCharts;
    });

    // The planned half starts at the marked point, the measured one ends there.
    it.each([
      {
        marker: "first point",
        index: 0,
        measured: ["2", "", "", ""],
        planned: ["2", "3", "5", "8"],
      },
      {
        marker: "second point",
        index: 1,
        measured: ["2", "3", "", ""],
        planned: ["", "3", "5", "8"],
      },
    ])(
      "joins solid measured and dashed planned series at the $marker",
      ({ index, measured, planned }) => {
        const [source] = renderedTrend.slideCharts[index];
        const series = [...source.matchAll(/<c:ser>.*?<\/c:ser>/gs)].map(([markup]) => {
          const values = /<c:val>(.*?)<\/c:val>/s.exec(markup);
          assert(values, "The series has a value cache");
          const stroke = /<c:spPr>.*?<\/c:spPr>/s.exec(markup);
          assert(stroke, "The series has shape properties");
          const dash = /<a:prstDash val="([^"]+)"\/>/.exec(stroke[0]);
          assert(dash, "The series stroke specifies a dash style");
          return {
            dash: dash[1],
            values: [...values[1].matchAll(/<c:v>([^<]*)<\/c:v>/g)].map(([, value]) => value),
          };
        });
        expect(series).toEqual([
          { dash: "solid", values: measured },
          { dash: "dash", values: planned },
        ]);
      },
    );

    it("puts a dot only on the marked trend's current point", () => {
      const measured = /<c:ser>.*?<\/c:ser>/s.exec(chart);
      assert(measured, "The measured series is present");
      expect(measured[0]).toMatch(/<c:dPt><c:idx val="0"\/><c:marker><c:symbol val="circle"\/>/);
      // In the schema's order: the series' marker, its points, then its labels.
      expect(measured[0]).toMatch(/<c:marker>.*?<c:dPt>.*?<c:dLbls>/s);
      const specimenMarked = specimenSlide("Every run measures against the first", "chart");
      const markedAt = slideCatalog.slides.indexOf(specimenMarked);
      const others = slideCharts.filter((_, i) => i !== markedAt).flat();
      expect(others.length).toBeGreaterThan(0);
      expect(others.filter((xml) => xml.includes("<c:dPt>"))).toEqual([]);
    });

    // The names leave the chart's axis for text under the points, the marked one teal and bold
    // as the web's tick, nothing over the point, and a dashed guide from the dot to the axis.
    it("hides native category labels and point labels", () => {
      expect(chart).toMatch(/<c:catAx>.*?<c:tickLblPos val="none"\/>/s);
      expect(chart).not.toContain("<c:dLbl>");
    });

    it.each([
      { name: "Month 0", emphasis: { teal: true, bold: true } },
      { name: "Month 3", emphasis: { teal: false, bold: false } },
      { name: "Month 6", emphasis: { teal: false, bold: false } },
      { name: "Month 12", emphasis: { teal: false, bold: false } },
    ])("sets $name as slide text with its tick emphasis", ({ name, emphasis }) => {
      const teal = tokens["--color-teal"].slice(1).toUpperCase();
      const runs = [...xml.matchAll(/<a:r>(.*?)<\/a:r>/gs)]
        .map(([, run]) => run)
        .filter((run) => run.includes(`<a:t>${name}</a:t>`));
      expect(
        runs.map((run) => ({
          teal: run.includes(`val="${teal}"`),
          bold: run.includes('b="1"'),
        })),
      ).toEqual([emphasis]);
    });

    it("draws a dashed guide from the dot to the axis", () => {
      expect(xml).toMatch(/<a:prstDash val="dash"\/>/);
    });

    // recharts' ticks for 0 to 8, categories on the plot's edges, no axis titles in the chart.
    it("writes the trend's axis scale and edge categories without native axis titles", () => {
      const scale = [...chart.matchAll(/<c:(max|min|majorUnit|crossBetween) val="([^"]+)"\/>/g)];
      expect(Object.fromEntries(scale.map(([, key, value]) => [key, value]))).toEqual({
        max: "8",
        min: "0",
        majorUnit: "2",
        crossBetween: "midCat",
      });
      expect(chart).not.toContain("<c:title>");
    });

    // The y label and the note over the plot as text, the note no longer in the annotation; a
    // line break the export sets reads as the space it replaces.
    it("writes the axis titles, future note and annotation as separate slide texts", () => {
      const texts = [...xml.matchAll(/<p:txBody>(.*?)<\/p:txBody>/gs)].map(([, body]) =>
        [...body.replace(/<a:br\/>/g, "<a:t> </a:t>").matchAll(/<a:t>([^<]*)<\/a:t>/g)]
          .map((m) => m[1])
          .join("")
          .replace(/\s+/g, " ")
          .trim(),
      );
      expect(texts).toEqual(
        expect.arrayContaining([
          "Teams on the harness",
          "Baseline → repeat run → progress view → adoption over time",
          "Time",
          "Fictional figures.",
        ]),
      );
    });

    // The annotation in the secondary colour, the measured half filled where it has two points
    // or more, the plot on a card.
    it("writes the annotation in the secondary colour", () => {
      const purple = tokens["--color-purple"].slice(1).toUpperCase();
      const annotation = [...xml.matchAll(/<a:r>(.*?)<\/a:r>/gs)]
        .map(([, run]) => run)
        .filter((run) => run.includes("<a:t>Fictional figures.</a:t>"));
      expect(annotation).toEqual([expect.stringContaining(`<a:srgbClr val="${purple}"/>`)]);
    });

    it("leaves the measured area unfilled at the first point", () => {
      expect(xml).not.toContain("<a:custGeom>");
    });

    it("draws the trend on a rounded card", () => {
      expect(xml).toContain('prst="round2DiagRect"');
    });
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
    const chart = defined(
      Object.keys(zipped.files).find((f) => /charts\/chart\d+\.xml$/.test(f)),
      "chart XML path",
    );
    const second = (await defined(zipped.file(chart), chart).async("string")).split("<c:ser>")[2];
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
    expect(
      await defined(zipped.file("ppt/slides/slide1.xml"), "ppt/slides/slide1.xml").async("string"),
    ).toContain("<a:custGeom>");
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
    const chart = defined(
      Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f)),
      "chart XML path",
    );
    expect(await defined(zipped.file(chart), chart).async("string")).not.toContain('rot="0"');
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
    const chart = defined(
      Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f)),
      "chart XML path",
    );
    const xml = await defined(zipped.file(chart), chart).async("string");
    expect(xml.match(/<c:legendEntry>/g)).toHaveLength(2);
    expect(xml.match(/<a:prstDash val="dash"\/>/g)).toHaveLength(2);
  });

  const chartXml = (zipped: JSZip) => {
    const chart = defined(
      Object.keys(zipped.files).find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f)),
      "chart XML path",
    );
    return defined(zipped.file(chart), chart).async("string");
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
