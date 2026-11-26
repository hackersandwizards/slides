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
    text: "Try it",
    o: { size: 20, color: day.c.ink },
    card: { x: 0.6667, y: 2, w: 11.9997, h: 0.8 },
    area: { x: 0.9667, y: 2.15, w: 11.3997, h: 0.5 },
    next: 3.1,
  });
});

it.each([
  {
    kind: "exercise",
    expected: [
      { text: ["1.  ", "First"], bullet: false, after: 10 },
      { text: ["2.  ", "Second"], bullet: false, after: 10 },
    ],
  },
  {
    kind: "demo",
    expected: [
      { text: ["First"], bullet: true, after: 10 },
      { text: ["Second"], bullet: true, after: 10 },
    ],
  },
] as const)("sets the steps for $kind", ({ kind, expected }) => {
  expect(
    activitySteps(day, { ...activity, kind }).map(({ runs, bullet, after }) => ({
      text: runs.map((r) => r.text),
      bullet,
      after,
    })),
  ).toEqual(expected);
});

it("keeps the first detail ordinary when the duration is absent", () => {
  const frame = activityFrame(day, { ...activity, mode: "In pairs", outcome: "One note" }, 2);
  expect({
    cardHeight: frame?.card.h,
    paragraphs: frame?.paras.map(({ runs, mono, bold, rel, after }) => ({
      text: runs.map((r) => [r.text, r.options?.color]),
      mono,
      bold,
      rel,
      after,
    })),
  }).toEqual({
    cardHeight: 1.6,
    paragraphs: [
      { text: [["In pairs", day.c.muted]], mono: false, bold: false, rel: 1, after: 8 },
      { text: [["One note", day.c.muted]], mono: false, bold: false, rel: 1, after: 8 },
    ],
  });
});
