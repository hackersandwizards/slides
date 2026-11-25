import { describe, expect, it } from "vitest";
import { barTone } from "../components/slides/BarsVisual";
import { cardLook } from "../components/slides/CardsVisual";
import { flowRowLook, stepInk, stepNumbers } from "../components/slides/FlowRowLook";
import { staggeredGeometry } from "../components/slides/StaggeredTimeline";
import { stageAxes } from "../components/slides/TimelineVisual";

describe("Flow row look", () => {
  const short = [{ title: "Draft", label: "Plan" }];
  const wide = Array.from({ length: 6 }, () => ({ title: "Review", label: "Recheck" }));

  it.each([
    {
      name: "regular",
      steps: short,
      dense: false,
      look: {
        inTile: true,
        size: "xl",
        icon: "h-12 w-12",
        linkMid: "top-12",
        heading: "mt-7 card-title text-4xl leading-tight text-balance",
        padding: "px-5",
      },
    },
    {
      name: "narrow",
      steps: wide,
      dense: false,
      look: {
        inTile: false,
        size: "xl",
        icon: "h-12 w-12",
        linkMid: "top-12",
        heading: "mt-7 card-title text-2xl leading-tight text-balance",
        padding: "px-2",
      },
    },
    {
      name: "dense and narrow",
      steps: wide,
      dense: true,
      look: {
        inTile: false,
        size: "sm",
        icon: "h-5 w-5",
        linkMid: "top-5",
        heading: "mt-2 card-title text-xl leading-tight text-balance",
        padding: "px-2",
      },
    },
  ])("resolves the $name row", ({ steps, dense, look }) => {
    expect(flowRowLook(steps, dense)).toEqual(look);
  });
});

describe("Flow step numbering", () => {
  it("skips an unnumbered step without advancing the count", () => {
    expect(
      stepNumbers([{ title: "Start" }, { title: "Pause", numbered: false }, { title: "Continue" }]),
    ).toEqual([1, undefined, 2]);
  });

  it("omits every tile number when a label already counts", () => {
    expect(stepNumbers([{ title: "Start", label: "Stage 1" }, { title: "Continue" }])).toEqual([
      undefined,
      undefined,
    ]);
  });
});

describe("Flow step ink", () => {
  it.each([
    [{}, "text-text"],
    [{ tone: "red" }, "text-red"],
    [{ tone: "green" }, "text-green-dark"],
    [{ dim: true, tone: "red" }, "text-text-muted"],
    [{ tone: "constructor" as "red" }, "text-text"],
  ] as const)("resolves step ink for %j", (step, ink) => {
    expect(stepInk(step)).toBe(ink);
  });
});

describe("Card look", () => {
  it.each([
    [
      false,
      false,
      { label: "card-title text-4xl leading-tight text-balance", pad: "card-pad-8/9", mark: true },
    ],
    [
      false,
      true,
      { label: "card-title text-3xl leading-tight text-balance", pad: "card-pad-6", mark: true },
    ],
    [true, false, { label: "card-title text-xl", pad: "card-pad-6", mark: false }],
    [true, true, { label: "card-title text-lg", pad: "card-pad-5", mark: false }],
  ] as const)("resolves dense=%s and wide=%s", (dense, wide, look) => {
    expect(cardLook(dense, wide)).toMatchObject(look);
  });
});

describe("Bar tone", () => {
  it.each([
    [
      true,
      true,
      {
        fill: "var(--color-primary)",
        label: "font-semibold text-primary",
        value: "font-bold text-primary",
      },
    ],
    [
      false,
      true,
      {
        fill: "var(--slide-context)",
        label: "font-normal text-text-muted",
        value: "font-normal text-text-muted",
      },
    ],
    [
      false,
      false,
      {
        fill: "var(--color-primary)",
        label: "font-semibold text-text",
        value: "font-bold text-text",
      },
    ],
  ] as const)(
    "resolves highlighted=%s among bars with highlight=%s",
    (highlight, anyHighlight, tone) => {
      expect(barTone({ label: "Visits", value: 4, highlight }, anyHighlight)).toEqual(tone);
    },
  );
});

describe("Inline timeline axes", () => {
  const events = [
    { when: "Q1", title: "Plan" },
    { when: "Q2", title: "Build" },
    { when: "Q3", title: "Release" },
  ];

  it("changes the link from solid to dashed at now", () => {
    expect(stageAxes({ type: "timeline", events, continues: "both" }, 1)).toEqual([
      { leads: [{ side: "in", dashed: false }], link: "solid", future: false },
      { leads: [], link: "dashed", future: false },
      { leads: [{ side: "out", dashed: true }], link: undefined, future: true },
    ]);
  });

  it("keeps both dashed leads on one stage when now precedes it", () => {
    expect(
      stageAxes({ type: "timeline", events: events.slice(0, 1), continues: "both" }, -1),
    ).toEqual([
      {
        leads: [
          { side: "in", dashed: true },
          { side: "out", dashed: true },
        ],
        link: undefined,
        future: true,
      },
    ]);
  });
});

describe("Staggered timeline geometry", () => {
  it("shifts the tracks for labels and extends the axis into the lead-in", () => {
    expect(
      staggeredGeometry(
        {
          type: "timeline",
          continues: "in",
          labels: { when: "Quarter" },
          events: Array.from({ length: 7 }, () => ({ when: "Q1", title: "Plan" })),
        },
        3,
      ),
    ).toEqual({
      tracks: 16,
      shift: 1,
      now: 3,
      nowAt: 50,
      start: "calc(-1 * (var(--slide-side) + 100%))",
      end: "12.5%",
    });
  });
});
