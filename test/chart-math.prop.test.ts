import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { tickLayout, trendTicks } from "../components/slides/ChartPlots";

const widths = [10, 8, 7];
const label = unicodeString.map((text) => text.replace(/\s+/g, " "));

test.prop([fc.array(label, { maxLength: 6 }), fc.integer({ min: 0, max: 1000 })], {
  examples: [
    [[], 0],
    [[""], 0],
    [["大阪/Grüße", "constructor"], 88],
    [["大阪 / Grüße"], 30],
    [["界".repeat(1024)], 60],
    [["abcd"], 28],
    [["abcd"], 27],
  ],
})(
  "chart labels use the largest font whose words fit, wrapping without losing text",
  (labels, band) => {
    const measure = (text: string, step: number) => text.length * widths[step];
    const longestWord = Math.max(
      0,
      ...labels.flatMap((label) => label.split(" ").map((word) => word.length)),
    );
    const firstFit = widths.findIndex((width) => longestWord * width <= band);
    const layout = tickLayout(labels, band, measure);
    expect(layout.angled).toBe(firstFit === -1);
    expect(layout.step).toBe(firstFit === -1 ? widths.length - 1 : firstFit);
    expect(layout.lines.map((lines) => lines.join(" "))).toEqual(labels);
    if (layout.angled) {
      expect(layout.lines).toEqual(labels.map((label) => [label]));
    } else {
      for (const lines of layout.lines) {
        for (const [index, line] of lines.entries()) {
          expect(measure(line, layout.step)).toBeLessThanOrEqual(band);
          if (index > 0)
            expect(
              measure(`${lines[index - 1]} ${line.split(" ")[0]}`, layout.step),
            ).toBeGreaterThan(band);
        }
      }
    }
  },
);

const value = fc.integer({ min: -100_000, max: 100_000 });
const point = fc.record({
  name: unicodeString,
  value,
  value2: fc.option(value, { nil: undefined }),
});

test.prop([fc.array(point, { maxLength: 10 })], {
  examples: [
    [[]],
    [[{ name: "", value: 0, value2: undefined }]],
    [
      [
        { name: "舞台/constructor", value: 1, value2: -100_000 },
        { name: "長".repeat(1024), value: -1, value2: 100_000 },
      ],
    ],
  ],
})("the trend's ordered ticks enclose zero and every measured value in both series", (data) => {
  const ticks = trendTicks(data);
  expect(ticks.length).toBeGreaterThanOrEqual(2);
  for (let i = 1; i < ticks.length; i++) expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
  const measurements = [
    0,
    ...data.map((point) => point.value),
    ...data.flatMap((point) => (point.value2 === undefined ? [] : [point.value2])),
  ];
  expect(ticks[0]).toBeLessThanOrEqual(Math.min(...measurements));
  expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(Math.max(...measurements));
});
