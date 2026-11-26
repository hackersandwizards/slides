import { assert, expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import type { Area } from "../scripts/pptx/stage";
import {
  type TeamFrame,
  enablingColumns,
  platformRow,
  streamRows,
  subsystemRow,
  topologyLabel,
  topologyLayout,
  topologyLegend,
  topologyMain,
  topologyRoles,
  topologyStack,
  topologyText,
} from "../scripts/pptx/slides/topology-layout";
import type { TeamTopologySlide } from "../types/slide";

const day = new Look(palette(false), "en", false);
const style = {
  k: 1,
  bd: 3 / 144,
  titleO: { size: 18, color: day.c.ink },
  textO: { size: 18, color: day.c.ink },
};
const area = { x: 1, y: 2, w: 8, h: 4 };
const empty: TeamTopologySlide = {
  type: "team-topology",
  headline: "Picture",
  enabling: [],
  streamAligned: [],
  platform: [],
};
const round = (n: number) => +n.toFixed(4);
const rect = ({ x, y, w, h }: Area) => ({ x: round(x), y: round(y), w: round(w), h: round(h) });
const line = { runs: [{ text: "Line" }] };
const source = { runs: [{ text: "Source" }] };
function frameGeometry(frame: TeamFrame | undefined) {
  assert(frame, "A team band has a frame");
  return { ...frame, area: rect(frame.area) };
}
function fixedLook() {
  const look = new Look(day.c, "en", false);
  vi.spyOn(look, "need").mockReturnValue(0.5);
  return look;
}

it("keeps stack offsets after each leading gap", () => {
  expect(
    topologyStack(
      fixedLook(),
      [
        { text: line, o: style.titleO, gap: 0 },
        { text: source, o: style.textO, gap: 0.125 },
      ],
      2,
    ),
  ).toEqual({
    width: 2,
    height: 1.125,
    lines: [
      { text: line, o: style.titleO, h: 0.5, offset: 0 },
      { text: source, o: style.textO, h: 0.5, offset: 0.625 },
    ],
  });
});

it("places a measured stack from its drawing origin", () => {
  expect(
    topologyText(
      { width: 2, height: 0.75, lines: [{ text: line, o: style.textO, h: 0.5, offset: 0.25 }] },
      { x: 1, y: 3 },
    ),
  ).toEqual([{ text: line, area: { x: 1, y: 3.25, w: 2, h: 0.5 }, o: style.textO }]);
});

it("keeps each role together behind its own bullet", () => {
  expect(topologyRoles(day, ["Product lead", "Search"])).toEqual({
    runs: [
      { text: "•\u00a0", options: { color: day.c.muted, bold: true } },
      { text: "Product\u00a0lead", options: { color: day.c.tealDark, bold: true } },
      { text: "   •\u00a0", options: { color: day.c.muted, bold: true } },
      { text: "Search", options: { color: day.c.tealDark, bold: true } },
    ],
    balance: true,
  });
});

it("keeps the label colour through inline Markdown", () => {
  expect(topologyLabel(day, "**Team**", day.c.purple)).toEqual({
    runs: [{ text: "Team", options: { bold: true, color: day.c.purple } }],
  });
});

it("reserves the minimum enabling width and separates expert lines", () => {
  const cols = enablingColumns(fixedLook(), [{ name: "A", experts: ["B"] }], style);
  expect(
    cols.map(({ width, height, stack }) => ({
      width: round(width),
      height: round(height),
      stack: {
        width: round(stack.width),
        height: round(stack.height),
        lines: stack.lines.map((line) => ({ ...line, offset: round(line.offset) })),
      },
    })),
  ).toEqual([
    {
      width: 2.074,
      height: 1.3009,
      stack: {
        width: 1.7361,
        height: 1.037,
        lines: [
          {
            text: { runs: [{ text: "A", options: { color: day.c.purple } }] },
            o: style.titleO,
            h: 0.5,
            offset: 0,
          },
          {
            text: { runs: [{ text: "B", options: { color: day.c.ink } }] },
            o: { ...style.textO, line: 1.25 },
            h: 0.5,
            offset: 0.537,
          },
        ],
      },
    },
  ]);
});

it("places roles below a stream name when the pair is too wide", () => {
  const rows = streamRows(fixedLook(), [{ name: "A", roles: ["A role with multiple words"] }], {
    area: { ...area, w: 2 },
    style,
  });
  expect(
    rows.map(({ frame, boxes }) => ({
      frame: { ...frame, area: rect(frame.area) },
      boxes: boxes.map(({ area, o }) => ({ area: rect(area), o })),
    })),
  ).toEqual([
    {
      frame: { kind: "stream", area: { x: 1, y: 2, w: 2, h: 1.338 } },
      boxes: [
        { area: { x: 1.206, y: 2.1319, w: 1.588, h: 0.5 }, o: style.titleO },
        { area: { x: 1.206, y: 2.706, w: 1.588, h: 0.5 }, o: style.textO },
      ],
    },
  ]);
});

it("sets both subsystem octagons to the taller stack", () => {
  const row = subsystemRow(fixedLook(), [{ name: "A", description: "A note" }, { name: "B" }], {
    area,
    style,
  });
  expect({
    height: round(row.height),
    rects: row.blocks.map(({ frame }) => frameGeometry(frame).area),
    starts: row.blocks.map(({ boxes }) => round(boxes[0].area.y)),
  }).toEqual({
    height: 1.2824,
    rects: [
      { x: 1, y: 2, w: 3.9259, h: 1.2824 },
      { x: 5.0741, y: 2, w: 3.9259, h: 1.2824 },
    ],
    starts: [2.1319, 2.3912],
  });
});

it("starts the stream after the enabling column and its gap", () => {
  const main = topologyMain(
    fixedLook(),
    {
      ...empty,
      enabling: [{ name: "Help", experts: [] }],
      streamAligned: [{ name: "A", roles: [] }],
    },
    { area, style },
  );
  expect({
    height: round(main.height),
    frames: main.bands.map(({ frame }) => frameGeometry(frame)),
  }).toEqual({
    height: 0.7639,
    frames: [
      { kind: "enabling", area: { x: 1, y: 2, w: 2.074, h: 0.7639 } },
      { kind: "stream", area: { x: 3.2222, y: 2, w: 5.7778, h: 0.7639 } },
    ],
  });
});

it("uses one platform frame and positions both names at equal pitch", () => {
  const band = platformRow(fixedLook(), [{ name: "A" }, { name: "B" }], { area, style });
  expect({
    height: round(band.height),
    frames: band.bands.map(({ frame }) => frameGeometry(frame)),
    names: band.bands.flatMap(({ boxes }) =>
      boxes.map(({ text, area }) => ({ text, area: rect(area) })),
    ),
  }).toEqual({
    height: 0.838,
    frames: [{ kind: "platform", area: { x: 1, y: 2, w: 8, h: 0.838 } }],
    names: [
      {
        text: { runs: [{ text: "A", options: { color: day.c.tealDark } }] },
        area: { x: 1.206, y: 2.169, w: 3.6458, h: 0.5 },
      },
      {
        text: { runs: [{ text: "B", options: { color: day.c.tealDark } }] },
        area: { x: 5.1481, y: 2.169, w: 3.6458, h: 0.5 },
      },
    ],
  });
});

it("starts a fresh legend row when its next item cannot fit", () => {
  const result = topologyLegend(
    day,
    { ...empty, enabling: [{ name: "Help", experts: [] }], platform: [{ name: "A" }] },
    { area: { ...area, w: 2 }, style },
  );
  expect({
    height: round(result.height),
    labels: result.bands.flatMap(({ boxes }) =>
      boxes.map(({ text, area }) => [text, round(area.x), round(area.y)]),
    ),
  }).toEqual({
    height: 0.9398,
    labels: [
      ["Enabling team", 1.6296, 2.1481],
      ["Platform team", 1.6296, 2.5995],
    ],
  });
});

it("keeps the original negative trailing gap of an entirely empty topology", () => {
  const result = topologyLayout(day, { ...empty, legend: false }, { area, k: 1 });
  expect({ ...result, height: round(result.height) }).toEqual({ height: -0.1481, bands: [] });
});
