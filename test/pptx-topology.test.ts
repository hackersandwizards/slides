import PptxGenJS from "pptxgenjs";
import { assert, expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { Sheet } from "../scripts/pptx/sheet";
import { drawTopology, teamShape } from "../scripts/pptx/slides/team-topology";
import { palette } from "../scripts/pptx/palette";
import type { Area } from "../scripts/pptx/stage";
import type { BoxOpts, Para } from "../scripts/pptx/text";
import {
  type TeamKind,
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
  topologyStyle,
  topologyText,
} from "../scripts/pptx/slides/topology-layout";
import type { TeamTopologySlide } from "../types/slide";

const day = new Look(palette(false), "en", false);
const style = {
  titleO: { size: 18, mono: true, bold: true, color: day.c.ink, line: 1.25, tracking: -0.015 },
  textO: { size: 18, color: day.c.ink, line: 1.375 },
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
const line = { runs: [{ text: "Line" }] };
const source = { runs: [{ text: "Source" }] };
function fixedLook() {
  const look = new Look(day.c, "en", false);
  vi.spyOn(look, "need").mockReturnValue(0.5);
  return look;
}

const stackOptions = { size: 18, color: day.c.ink };

it("keeps stack offsets after each leading gap", () => {
  expect(
    topologyStack(
      fixedLook(),
      [
        { text: line, o: stackOptions, gap: 0 },
        { text: source, o: stackOptions, gap: 0.125 },
      ],
      2,
    ),
  ).toEqual({
    width: 2,
    height: 1.125,
    lines: [
      { text: line, o: stackOptions, h: 0.5, offset: 0 },
      { text: source, o: stackOptions, h: 0.5, offset: 0.625 },
    ],
  });
});

it("places a measured stack from its drawing origin", () => {
  expect(
    topologyText(
      { width: 2, height: 0.75, lines: [{ text: line, o: stackOptions, h: 0.5, offset: 0.25 }] },
      { x: 1, y: 3 },
    ),
  ).toEqual([{ text: line, area: { x: 1, y: 3.25, w: 2, h: 0.5 }, o: stackOptions }]);
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

const near = (value: number): unknown => expect.closeTo(value, 4);
const at = ({ x, y, w, h }: Area) => ({
  x: near(x),
  y: near(y),
  w: near(w),
  h: near(h),
});
const box = (text: Para | string, area: ReturnType<typeof at>, o: BoxOpts) => ({ text, area, o });
const frame = (kind: TeamKind, area: ReturnType<typeof at>) => ({ kind, area });
const label = (text: string, color: string) => ({ runs: [{ text, options: { color } }] });
const role = (text: string) => ({
  runs: [
    { text: "•\u00a0", options: { color: day.c.muted, bold: true } },
    { text, options: { color: day.c.tealDark, bold: true } },
  ],
  balance: true,
});
const legendText = (size: number): BoxOpts => ({
  size,
  color: day.c.muted,
  line: 1.4,
  valign: "middle",
});
const smallerTitle = { ...style.titleO, size: 14.5 };
const smallerText = { ...style.textO, size: 14.5 };

it("keeps half-point typography and border width at the fitting scale", () => {
  expect(topologyStyle(day, 0.8)).toEqual({
    look: day,
    k: 0.8,
    bd: near(0.0167),
    titleO: smallerTitle,
    textO: smallerText,
  });
});

it("reserves the minimum enabling width and separates expert lines", () => {
  expect(enablingColumns(topologyStyle(fixedLook(), 1), [{ name: "A", experts: ["B"] }])).toEqual([
    {
      width: near(2.074),
      stack: {
        width: near(1.7361),
        height: near(1.037),
        lines: [
          { text: label("A", day.c.purple), o: style.titleO, h: near(0.5), offset: 0 },
          {
            text: label("B", day.c.ink),
            o: { ...style.textO, line: 1.25 },
            h: near(0.5),
            offset: near(0.537),
          },
        ],
      },
      height: near(1.3009),
    },
  ]);
});

it.each([
  {
    description: "below a name that does not fit beside them",
    roles: ["A role with multiple words"],
    width: 2,
    nameHeight: 0.5,
    expected: [
      {
        frame: frame("stream", at({ x: 1, y: 2, w: 2, h: 1.338 })),
        boxes: [
          box(label("A", day.c.ink), at({ x: 1.206, y: 2.1319, w: 1.588, h: 0.5 }), style.titleO),
          box(
            role("A\u00a0role\u00a0with\u00a0multiple\u00a0words"),
            at({ x: 1.206, y: 2.706, w: 1.588, h: 0.5 }),
            style.textO,
          ),
        ],
      },
    ],
  },
  {
    description: "beside a shorter name that fits",
    roles: ["Build"],
    width: 8,
    nameHeight: 0.3,
    expected: [
      {
        frame: frame("stream", at({ x: 1, y: 2, w: 8, h: 0.7639 })),
        boxes: [
          box(label("A", day.c.ink), at({ x: 1.206, y: 2.2319, w: 0.1677, h: 0.3 }), style.titleO),
          box(role("Build"), at({ x: 1.5959, y: 2.1319, w: 0.8198, h: 0.5 }), style.textO),
        ],
      },
    ],
  },
  {
    description: "with no roles",
    roles: [],
    width: 8,
    nameHeight: 0.5,
    expected: [
      {
        frame: frame("stream", at({ x: 1, y: 2, w: 8, h: 0.7639 })),
        boxes: [
          box(label("A", day.c.ink), at({ x: 1.206, y: 2.1319, w: 7.588, h: 0.5 }), style.titleO),
        ],
      },
    ],
  },
])("lays out a stream $description", ({ roles, width, nameHeight, expected }) => {
  const look = fixedLook();
  vi.mocked(look.need).mockReturnValueOnce(nameHeight);
  expect(streamRows(topologyStyle(look, 1), [{ name: "A", roles }], { ...area, w: width })).toEqual(
    expected,
  );
});

it.each([
  {
    description: "with a description in the taller stack",
    teams: [{ name: "A", description: "A note" }, { name: "B" }],
    expected: {
      blocks: [
        {
          frame: frame("subsystem", at({ x: 1, y: 2, w: 3.9259, h: 1.2824 })),
          boxes: [
            box(
              label("A", day.c.ink),
              at({ x: 1.2801, y: 2.1319, w: 3.3658, h: 0.5 }),
              style.titleO,
            ),
            box(
              label("A note", day.c.muted),
              at({ x: 1.2801, y: 2.6505, w: 3.3658, h: 0.5 }),
              style.textO,
            ),
          ],
        },
        {
          frame: frame("subsystem", at({ x: 5.0741, y: 2, w: 3.9259, h: 1.2824 })),
          boxes: [
            box(
              label("B", day.c.ink),
              at({ x: 5.3542, y: 2.3912, w: 3.3658, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
      ],
      height: near(1.2824),
    },
  },
  { description: "with no teams", teams: [], expected: { blocks: [], height: 0 } },
])("lays out subsystems $description", ({ teams, expected }) => {
  expect(subsystemRow(topologyStyle(fixedLook(), 1), teams, area)).toEqual(expected);
});

const enablingAndStream = {
  ...empty,
  enabling: [{ name: "Help", experts: [] }],
  streamAligned: [{ name: "A", roles: [] }],
};
const atLeastOneSubsystem = [{ name: "S" }];

it.each([
  {
    description: "with enabling and stream teams",
    slide: enablingAndStream,
    expected: {
      bands: [
        {
          frame: frame("enabling", at({ x: 1, y: 2, w: 2.074, h: 0.7639 })),
          boxes: [
            box(
              label("Help", day.c.purple),
              at({ x: 1.169, y: 2.1319, w: 1.7361, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
        {
          frame: frame("stream", at({ x: 3.2222, y: 2, w: 5.7778, h: 0.7639 })),
          boxes: [
            box(
              label("A", day.c.ink),
              at({ x: 3.4282, y: 2.1319, w: 5.3658, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
      ],
      height: near(0.7639),
    },
  },
  {
    description: "with a subsystem after the stream",
    slide: { ...enablingAndStream, complicatedSubsystem: atLeastOneSubsystem },
    expected: {
      bands: [
        {
          frame: frame("enabling", at({ x: 1, y: 2, w: 2.074, h: 1.6389 })),
          boxes: [
            box(
              label("Help", day.c.purple),
              at({ x: 1.169, y: 2.5694, w: 1.7361, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
        {
          frame: frame("stream", at({ x: 3.2222, y: 2, w: 5.7778, h: 0.7639 })),
          boxes: [
            box(
              label("A", day.c.ink),
              at({ x: 3.4282, y: 2.1319, w: 5.3658, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
        {
          frame: frame("subsystem", at({ x: 3.2222, y: 2.875, w: 5.7778, h: 0.7639 })),
          boxes: [
            box(
              label("S", day.c.ink),
              at({ x: 3.5023, y: 3.0069, w: 5.2176, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
      ],
      height: near(1.6389),
    },
  },
  {
    description: "with a subsystem and no stream",
    slide: { ...empty, complicatedSubsystem: atLeastOneSubsystem },
    expected: {
      bands: [
        {
          frame: frame("subsystem", at({ x: 1, y: 2, w: 8, h: 0.7639 })),
          boxes: [
            box(
              label("S", day.c.ink),
              at({ x: 1.2801, y: 2.1319, w: 7.4398, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
      ],
      height: near(0.7639),
    },
  },
])("lays out the main band $description", ({ slide, expected }) => {
  expect(topologyMain(topologyStyle(fixedLook(), 1), slide, area)).toEqual(expected);
});

it.each([
  {
    description: "with both names at equal pitch",
    teams: [{ name: "A" }, { name: "B" }],
    expected: {
      height: near(0.838),
      bands: [
        {
          frame: frame("platform", at({ x: 1, y: 2, w: 8, h: 0.838 })),
          boxes: [
            box(
              label("A", day.c.tealDark),
              at({ x: 1.206, y: 2.169, w: 3.6458, h: 0.5 }),
              style.titleO,
            ),
            box(
              label("B", day.c.tealDark),
              at({ x: 5.1481, y: 2.169, w: 3.6458, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
      ],
    },
  },
  {
    description: "with description and roles",
    teams: [{ name: "A", description: "Paved path", roles: ["Ops"] }, { name: "B" }],
    expected: {
      height: near(1.9491),
      bands: [
        {
          frame: frame("platform", at({ x: 1, y: 2, w: 8, h: 1.9491 })),
          boxes: [
            box(
              label("A", day.c.tealDark),
              at({ x: 1.206, y: 2.169, w: 3.6458, h: 0.5 }),
              style.titleO,
            ),
            box(
              label("Paved path", day.c.muted),
              at({ x: 1.206, y: 2.7245, w: 3.6458, h: 0.5 }),
              style.textO,
            ),
            box(role("Ops"), at({ x: 1.206, y: 3.2801, w: 3.6458, h: 0.5 }), style.textO),
            box(
              label("B", day.c.tealDark),
              at({ x: 5.1481, y: 2.169, w: 3.6458, h: 0.5 }),
              style.titleO,
            ),
          ],
        },
      ],
    },
  },
  { description: "with no teams", teams: [], expected: { height: 0, bands: [] } },
])("lays out the platform band $description", ({ teams, expected }) => {
  expect(platformRow(topologyStyle(fixedLook(), 1), teams, area)).toEqual(expected);
});

const legendTeams = {
  ...empty,
  enabling: [{ name: "Help", experts: [] }],
  platform: [{ name: "A" }],
};

it.each([
  {
    description: "with a wrap when the next item cannot fit",
    slide: legendTeams,
    expected: {
      height: near(0.9398),
      bands: [
        {
          frame: {
            kind: "enabling",
            radius: near(0.0694),
            area: at({ x: 1, y: 2.1701, w: 0.5185, h: 0.2963 }),
          },
          boxes: [
            box(
              "Enabling team",
              at({ x: 1.6296, y: 2.1481, w: 1.6606, h: 0.3403 }),
              legendText(17.5),
            ),
          ],
        },
        {
          frame: {
            kind: "platform",
            radius: near(0.0694),
            area: at({ x: 1, y: 2.6215, w: 0.5185, h: 0.2963 }),
          },
          boxes: [
            box(
              "Platform team",
              at({ x: 1.6296, y: 2.5995, w: 1.6453, h: 0.3403 }),
              legendText(17.5),
            ),
          ],
        },
      ],
    },
  },
  {
    description: "with the legend hidden",
    slide: { ...legendTeams, legend: false },
    expected: { height: 0, bands: [] },
  },
])("lays out the legend $description", ({ slide, expected }) => {
  expect(topologyLegend(topologyStyle(day, 1), slide, { ...area, w: 2 })).toEqual(expected);
});

const allBands = {
  ...empty,
  enabling: [{ name: "Support", experts: [] }],
  streamAligned: [{ name: "Delivery", roles: ["Lead"] }],
  complicatedSubsystem: [{ name: "Parts" }],
  platform: [{ name: "Tools" }],
  caption: "Caption",
};

it("stacks the main band, platform, legend and caption at the fitting scale", () => {
  const { k, height, bands } = topologyLayout(topologyStyle(fixedLook(), 0.8), allBands, {
    x: 1.5,
    y: 2.5,
    w: 10,
    h: 4,
  });
  const caption = bands.pop();
  assert(caption, "The topology ends with its caption");
  expect({
    k,
    height,
    stack: bands.map(({ frame }) => {
      assert(frame, "The band before the caption has a frame");
      return { kind: frame.kind, y: frame.area.y };
    }),
    caption,
  }).toEqual({
    k: 0.8,
    height: near(3.9481),
    stack: [
      { kind: "enabling", y: near(2.5) },
      { kind: "stream", y: near(2.5) },
      { kind: "subsystem", y: near(3.3) },
      { kind: "platform", y: near(4.1296) },
      { kind: "enabling", y: near(5.1546) },
      { kind: "stream", y: near(5.1546) },
      { kind: "subsystem", y: near(5.1546) },
      { kind: "platform", y: near(5.5157) },
    ],
    caption: {
      boxes: [
        box("Caption", at({ x: 1.5, y: 5.9481, w: 10, h: 0.5 }), {
          size: 14.5,
          color: day.c.muted,
          line: 1.4,
        }),
      ],
    },
  });
});

it("keeps the negative trailing gap for an empty topology", () => {
  expect(topologyLayout(topologyStyle(fixedLook(), 1), { ...empty, legend: false }, area)).toEqual({
    k: 1,
    height: near(-0.1481),
    bands: [],
  });
});

function topologySheet() {
  const pptx = new PptxGenJS();
  return new Sheet(day, pptx.addSlide(), { pptx, assets: "", warnings: [], charts: new Map() });
}

it.each([
  {
    name: "enabling frame",
    kind: "enabling",
    radius: undefined,
    preset: "round2DiagRect",
    r: 0.1,
    fill: { color: "F0EBF9" },
    line: { color: "9333EA", width: 1.5 },
  },
  {
    name: "stream swatch",
    kind: "stream",
    radius: 0.07,
    preset: "roundRect",
    r: 0.07,
    fill: { color: "E8F0F2" },
    line: { color: "1A7285", width: 1.5 },
  },
  {
    name: "subsystem",
    kind: "subsystem",
    radius: undefined,
    preset: "octagon",
    r: 0.1333,
    fill: { color: "EEF1F3" },
    line: { color: "7C849C", width: 1.5 },
  },
  {
    name: "platform",
    kind: "platform",
    radius: undefined,
    preset: "round2DiagRect",
    r: 0.1,
    fill: { type: "none" },
    line: { color: "1A7285", width: 1.5, dashType: "sysDot" },
  },
] as const)("draws a $name with its shape style", ({ kind, radius, preset, r, fill, line }) => {
  const sheet = topologySheet();
  const shape = vi.spyOn(sheet.slide, "addShape").mockReturnValue(sheet.slide);
  teamShape(sheet, { kind, radius, area: { x: 1, y: 2, w: 0.2, h: 0.3 } }, 1);
  expect(
    shape.mock.calls.map(([type, options]) => {
      assert(options, "The team shape has a frame");
      return [type, { ...options, rectRadius: round(Number(options.rectRadius)) }];
    }),
  ).toEqual([[preset, { x: 1, y: 2, w: 0.2, h: 0.3, rectRadius: r, fill, line }]]);
});

it("caps a shallow team's corner radius at half its height", () => {
  const sheet = topologySheet();
  const shape = vi.spyOn(sheet.slide, "addShape").mockReturnValue(sheet.slide);
  teamShape(sheet, { kind: "enabling", area: { x: 1, y: 2, w: 0.2, h: 0.12 } }, 1);
  expect(shape.mock.calls).toEqual([
    [
      "round2DiagRect",
      {
        x: 1,
        y: 2,
        w: 0.2,
        h: 0.12,
        rectRadius: 0.06,
        fill: { color: "F0EBF9" },
        line: { color: "9333EA", width: 1.5 },
      },
    ],
  ]);
});

it("draws each topology frame before its text and leaves the caption last", () => {
  const sheet = topologySheet();
  const events: unknown[] = [];
  vi.spyOn(sheet.slide, "addShape").mockImplementation((type) => {
    events.push(type);
    return sheet.slide;
  });
  vi.spyOn(sheet, "box").mockImplementation((text, area) => {
    events.push({ text, area });
  });
  drawTopology(sheet, {
    k: 1,
    height: 4,
    bands: [
      {
        frame: { kind: "subsystem", area },
        boxes: [{ text: "Subsystem", area, o: style.titleO }],
      },
      { frame: { kind: "platform", area }, boxes: [{ text: "Platform", area, o: style.titleO }] },
      { boxes: [{ text: "Caption", area, o: style.textO }] },
    ],
  });
  expect(events).toEqual([
    "octagon",
    { text: "Subsystem", area },
    "round2DiagRect",
    { text: "Platform", area },
    { text: "Caption", area },
  ]);
});
