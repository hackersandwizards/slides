import { describe, expect, it } from "vitest";
import type { Block } from "../scripts/pptx/blocks/kind";
import { figurePara, numbersLayout } from "../scripts/pptx/blocks/numbers";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import type { Para, TextProps } from "../scripts/pptx/text";

describe("figurePara", () => {
  it.each<{ label: string; raw: string; leadStyle: TextProps; expected: Para }>([
    {
      label: "a plain negative figure without leading words",
      raw: "-42%",
      leadStyle: { fontSize: 36 },
      expected: { runs: [{ text: "−42%" }] },
    },
    {
      label: "leading words before a negative figure",
      raw: "up to -10%",
      leadStyle: { fontFace: "Inter", bold: false, color: "545861", fontSize: 20 },
      expected: {
        runs: [
          {
            text: "up to ",
            options: { fontFace: "Inter", bold: false, color: "545861", fontSize: 20 },
          },
          { text: "−10%" },
        ],
      },
    },
  ])("builds figure runs for $label", ({ raw, leadStyle, expected }) => {
    expect(figurePara(raw, leadStyle)).toEqual(expected);
  });
});

describe("numbersLayout", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{
    label: string;
    block: Block<"numbers">;
    expected: {
      cw: number;
      over: number;
      rule: boolean;
      bodyLine: number;
      boldLabel: boolean;
      leadOpt: TextProps | undefined;
      lastY: number;
      sourceH: number;
      h: number;
    };
  }>([
    {
      label: "a single-row grid",
      block: {
        type: "numbers",
        items: [
          { value: "up to 42%", label: "Faster", text: "Note" },
          { value: "-10%", label: "Less" },
        ],
      },
      expected: {
        cw: 5.740744791666667,
        over: 0.4722152777777777,
        rule: true,
        bodyLine: 1.375,
        boldLabel: false,
        leadOpt: { fontSize: 53 },
        lastY: 0,
        sourceH: 0,
        h: 2.642331597222222,
      },
    },
    {
      label: "a wrapped 3-column grid with a source",
      block: {
        type: "numbers",
        source: "Study 2026",
        items: Array.from({ length: 6 }, (_, i) => ({
          value: `ca. ${i + 1}0%`,
          label: `Metric ${i + 1}`,
        })),
      },
      expected: {
        cw: 3.604944444444444,
        over: 0.1481458333333333,
        rule: false,
        bodyLine: 1.25,
        boldLabel: true,
        leadOpt: { fontFace: "Inter", bold: false, color: "545861", fontSize: 20 },
        lastY: 2.273118055555555,
        sourceH: 0.870361111111111,
        h: 4.379576388888888,
      },
    },
    {
      label: "a wrapped 4-column grid with a source",
      block: {
        type: "numbers",
        source: "Study 2026",
        items: Array.from({ length: 8 }, (_, i) => ({
          value: `ca. ${i + 1}0%`,
          label: `Metric ${i + 1}`,
        })),
      },
      expected: {
        cw: 2.5555625,
        over: 0.1481458333333333,
        rule: false,
        bodyLine: 1.25,
        boldLabel: true,
        leadOpt: { fontFace: "Inter", bold: false, color: "545861", fontSize: 20 },
        lastY: 1.8286805555555552,
        sourceH: 0.870361111111111,
        h: 3.935138888888888,
      },
    },
  ])("lays out $label", ({ block, expected }) => {
    const layout = numbersLayout(look, block, { w: 12, k: 1 });
    expect({
      cw: layout.cw,
      over: layout.over,
      rule: layout.rule,
      bodyLine: layout.o.line,
      boldLabel: layout.cells[0].paras[0].bold,
      leadOpt: layout.cells[0].figure.runs[0].options,
      lastY: layout.cells[layout.cells.length - 1].y,
      sourceH: layout.sourceH,
      h: layout.h,
    }).toEqual(expected);
  });
});
