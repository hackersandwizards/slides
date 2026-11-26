import { expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { activityFrame, activityPrompt, activitySteps } from "../scripts/pptx/slides/activity";
import type { ActivitySlide } from "../types/slide";

const day = new Look(palette(false), "en", false);
const activity: ActivitySlide = {
  type: "activity",
  kind: "exercise",
  headline: "Practise",
  items: ["First", "Second"],
};

it("insets the prompt and leaves a gap before activity steps", () => {
  const look = new Look(day.c, "en", false);
  vi.spyOn(look, "need").mockReturnValue(0.5);
  const result = activityPrompt(look, "Try it", 2);
  const round = ({ x, y, w, h }: typeof result.area) => ({
    x: +x.toFixed(4),
    y: +y.toFixed(4),
    w: +w.toFixed(4),
    h: +h.toFixed(4),
  });
  expect({
    ...result,
    card: round(result.card),
    area: round(result.area),
    next: +result.next.toFixed(4),
  }).toEqual({
    o: { size: 20, color: day.c.ink },
    card: { x: 0.6667, y: 2, w: 11.9997, h: 0.8 },
    area: { x: 0.9667, y: 2.15, w: 11.3997, h: 0.5 },
    next: 3.1,
  });
});

const numberO = { color: day.c.teal, bold: true, fontFace: "JetBrains Mono" };
it.each([
  {
    kind: "exercise",
    expected: [
      {
        runs: [
          { text: "1.  ", options: numberO },
          { text: "First", options: {} },
        ],
        bullet: false,
        after: 10,
      },
      {
        runs: [
          { text: "2.  ", options: numberO },
          { text: "Second", options: {} },
        ],
        bullet: false,
        after: 10,
      },
    ],
  },
  {
    kind: "demo",
    expected: [
      { runs: [{ text: "First", options: {} }], bullet: true, after: 10 },
      { runs: [{ text: "Second", options: {} }], bullet: true, after: 10 },
    ],
  },
] as const)("sets the steps for $kind", ({ kind, expected }) => {
  expect(activitySteps(day, { ...activity, kind })).toEqual(expected);
});

const details = [
  {
    runs: [{ text: "In pairs", options: { color: day.c.muted } }],
    mono: false,
    bold: false,
    rel: 1,
    after: 8,
  },
  {
    runs: [{ text: "One note", options: { color: day.c.muted } }],
    mono: false,
    bold: false,
    rel: 1,
    after: 8,
  },
];
function roundedFrame(frame: ReturnType<typeof activityFrame>) {
  if (!frame) return frame;
  const round = ({ x, y, w, h }: typeof frame.area) => ({
    x: +x.toFixed(4),
    y: +y.toFixed(4),
    w: +w.toFixed(4),
    h: +h.toFixed(4),
  });
  return { ...frame, card: round(frame.card), area: round(frame.area) };
}

const present = { mode: "In pairs", outcome: "One note" };
it.each([
  {
    name: "with duration",
    input: { ...present, duration: "20 min" },
    expected: {
      paras: [
        { runs: [{ text: "20 min", options: {} }], mono: true, bold: true, rel: 1.4, after: 8 },
        ...details,
      ],
      card: { x: 8.5864, y: 2, w: 4.0799, h: 2.15 },
      area: { x: 8.8864, y: 2.25, w: 3.4799, h: 1.65 },
    },
  },
  {
    name: "without duration",
    input: present,
    expected: {
      paras: details,
      card: { x: 8.5864, y: 2, w: 4.0799, h: 1.6 },
      area: { x: 8.8864, y: 2.25, w: 3.4799, h: 1.1 },
    },
  },
  { name: "without side details", input: {}, expected: undefined },
])("measures the frame $name", ({ input, expected }) => {
  const frame = activityFrame(day, { ...activity, ...input }, 2);
  expect(roundedFrame(frame)).toEqual(expected);
});
