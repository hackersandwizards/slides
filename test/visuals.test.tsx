import { render } from "@testing-library/react";
import { assert, describe, expect, it } from "vitest";
import { FlowSteps, Framed, Visual } from "../components/slides/Visuals";
import type { VisualBlock } from "../types/slide";

const draw = (block: VisualBlock) => render(<Visual block={block} />).container;

describe("FlowSteps", () => {
  it("draws a labelled return loop with data-back from the first step title", () => {
    const { container } = render(
      <FlowSteps steps={[{ title: "**Plan**" }, { title: "Build" }]} loop="Repeat" revealed={2} />,
    );
    const loop = container.querySelector<HTMLElement>(".slide-flow-loop");
    assert(loop, "return loop should render");
    expect(loop.dataset.back).toBe("Plan");
    expect(loop.className).toContain("h-24");
    expect(loop.className).toContain("opacity-100");
    expect(loop.textContent).toBe("Repeat");
  });

  it("hides unrevealed steps and the return loop until all steps show", () => {
    const { container } = render(
      <FlowSteps
        steps={[{ title: "One" }, { title: "Two" }, { title: "Three" }]}
        loop=""
        revealed={1}
      />,
    );
    const steps = [...container.querySelectorAll<HTMLElement>(".slide-flow-step")];
    const loop = container.querySelector<HTMLElement>(".slide-flow-loop");
    assert(loop, "return loop should render");
    expect(steps.map((s) => s.hasAttribute("inert"))).toEqual([false, true, true]);
    expect(loop.className).toContain("opacity-0");
    expect(loop.className).toContain("h-16");
  });

  it("applies tone, dim, subtitle and numbered: false on flow steps", () => {
    const { container } = render(
      <FlowSteps
        steps={[
          { title: "Red", tone: "red", subtitle: "Fails" },
          { title: "Green", tone: "green" },
          { title: "Later", dim: true, numbered: false, text: "Muted", badge: "Next" },
        ]}
      />,
    );
    const headings = [...container.querySelectorAll("h2")];
    const tiles = [...container.querySelectorAll(".slide-flow-step > :first-child")];
    expect(headings.map((h) => h.className)).toEqual([
      expect.stringContaining("text-red"),
      expect.stringContaining("text-green-dark"),
      expect.stringContaining("text-text-muted"),
    ]);
    expect(tiles.map((t) => t.textContent)).toEqual(["1", "2", ""]);
    expect(container.textContent).toContain("Fails");
    expect(container.textContent).toContain("Next");
  });

  it("uses narrow padding and smaller headings for six or more steps", () => {
    const steps = Array.from({ length: 6 }, (_, i) => ({ title: `S${i + 1}` }));
    const { container } = render(<FlowSteps steps={steps} />);
    const step = container.querySelector(".slide-flow-step");
    const heading = container.querySelector("h2");
    assert(step, "step should render");
    assert(heading, "heading should render");
    expect(step.className).toContain("px-2");
    expect(heading.className).toContain("text-2xl");
  });
});

describe("Framed", () => {
  it("draws an active frame with label, logos, side notes and footer", () => {
    const { container } = render(
      <Framed
        frame={{
          label: "Pipeline",
          logos: [{ src: "/a.png", alt: "Alpha" }],
          notes: ["First note"],
          footer: "Footer text",
        }}
      >
        <span>Inside</span>
      </Framed>,
    );
    const frame = container.querySelector(".hw-frame");
    assert(frame, "frame should render");
    expect(frame.className).toContain("border-primary");
    expect(frame.querySelector(".hw-label")?.textContent).toBe("Pipeline");
    expect(frame.querySelector('img[alt="Alpha"]')).not.toBeNull();
    expect(frame.querySelector(".slide-framed-notes")?.textContent).toBe("First note");
    expect(frame.querySelector("p")?.textContent).toBe("Footer text");
  });

  it("draws an idle frame without header, notes or footer", () => {
    const { container } = render(
      <Framed frame={{}}>
        <span>Bare</span>
      </Framed>,
    );
    const frame = container.querySelector(".hw-frame");
    assert(frame, "frame should render");
    expect(frame.className).toContain("border-primary-border/70");
    expect(frame.querySelector(".hw-label")).toBeNull();
    expect(frame.querySelector(".slide-framed-rule")).toBeNull();
    expect(frame.querySelector("p")).toBeNull();
  });
});

describe("Timeline", () => {
  it.each([
    ["in", ["in"]],
    ["out", ["out"]],
    ["both", ["in", "out"]],
  ] as const)("draws %s continuation leads on a short timeline", (continues, sides) => {
    const c = draw({
      type: "timeline",
      continues,
      now: 0,
      events: [
        { when: "Q1", title: "Start" },
        { when: "Q2", title: "Next" },
      ],
    });
    const leads = [...c.querySelectorAll<HTMLElement>(".slide-timeline-lead")];
    expect(leads.map((l) => l.dataset.side)).toEqual(sides);
  });

  it("opens the row-label column when labels carry text on short and staggered timelines", () => {
    const short = draw({
      type: "timeline",
      labels: { when: "When", title: "What", text: "Result" },
      highlight: 1,
      events: [
        { when: "1", title: "A", text: "a" },
        { when: "2", title: "B", text: "b" },
      ],
    });
    const grid = short.querySelector<HTMLElement>(".slide-timeline-grid");
    assert(grid, "timeline grid should render");
    expect(grid.style.gridTemplateColumns).toBe("auto repeat(2, minmax(0px, 1fr))");
    expect(
      [...short.querySelectorAll(".slide-timeline-row-label")].map((l) => l.textContent),
    ).toEqual(["When", "What", "Result"]);
    expect(short.querySelectorAll("h2")[1]?.className).toContain("text-primary");
  });

  it("renders repeated row labels and continuation bleed on a staggered timeline", () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      when: `W${i}`,
      title: `E${i}`,
      text: `T${i}`,
    }));
    const c = draw({
      type: "timeline",
      continues: "both",
      now: 2,
      labels: { when: "When", title: "Stage" },
      events,
    });
    const staggered = c.querySelector<HTMLElement>(".max-md\\:hidden > div");
    assert(staggered, "staggered grid should render");
    expect(staggered.style.gridTemplateColumns).toBe("auto repeat(14, minmax(0px, 1fr))");
    expect(staggered.querySelectorAll(".slide-timeline-row-label")).toHaveLength(4);
    const runs = [...staggered.querySelectorAll<HTMLElement>("[aria-hidden] > div")];
    expect(runs[0]?.style.left).toContain("var(--slide-side)");
    expect(runs[1]?.style.right).toContain("var(--slide-side)");
  });
});

describe("Bars", () => {
  it("sorts bars largest first by default and renders the source caption", () => {
    const c = draw({
      type: "bars",
      source: "Survey 2026",
      bars: [
        { label: "Small", value: 20 },
        { label: "Big", value: 80 },
      ],
    });
    const labels = [...c.querySelectorAll("span.font-sans")].map((s) => s.textContent);
    expect(labels).toEqual(["Big", "Small"]);
    expect(c.querySelector("p.text-text-muted")?.textContent).toBe("Survey 2026");
  });

  it("renders range bars with default from-value display and rounded ends", () => {
    const c = draw({
      type: "bars",
      max: 100,
      order: "given",
      bars: [{ label: "Forecast", from: 20, value: 60 }],
    });
    const fill = c.querySelector<HTMLElement>(".rounded-sm");
    assert(fill, "range fill should render");
    expect(fill.style.marginLeft).toBe("20%");
    expect(fill.style.width).toBe("40%");
    expect(c.textContent).toContain("20–60");
  });
});

describe("Numbers", () => {
  it("renders a lone hero figure with its source and lone size variable", () => {
    const c = draw({
      type: "numbers",
      source: "Internal benchmark",
      items: [{ value: "42%", label: "Faster builds", text: "Median across repos" }],
    });
    const row = c.querySelector<HTMLElement>(".slide-figure-row");
    assert(row, "lone figure row should render");
    expect(row.style.getPropertyValue("--slide-figure-lone-size")).toContain("rem");
    expect(c.textContent).toContain("42%");
    expect(c.textContent).toContain("Faster builds");
    expect(c.querySelector("p.text-text-muted")?.textContent).toBe("Internal benchmark");
  });
});

describe("Cards", () => {
  it("renders icon tiles with active solid tone and inactive soft tone", () => {
    const c = draw({
      type: "cards",
      highlight: 0,
      items: [
        { title: "One", icon: "code" },
        { title: "Two", icon: "bot" },
      ],
    });
    const cards = [...c.querySelectorAll(".hw-card")];
    expect(cards[0]?.querySelector("span.bg-primary")).not.toBeNull();
    expect(cards[1]?.querySelector("span.bg-primary\\/7")).not.toBeNull();
  });

  it("defaults four cards to two columns and scales plain four-column cards down", () => {
    const fourItems = [1, 2, 3, 4].map((n) => ({ title: `C${n}`, text: `T${n}` }));
    const autoGrid = draw({ type: "cards", items: fourItems }).firstElementChild as HTMLElement;
    const wide = draw({ type: "cards", columns: 4, items: fourItems });
    const wideCard = wide.querySelector(".hw-card");
    assert(wideCard, "wide card should render");
    expect(autoGrid.style.getPropertyValue("--slide-cols")).toBe("2");
    expect(wideCard.className).toContain("card-pad-6");
    expect(wideCard.querySelector("h2")?.className).toContain("text-3xl");
  });

  it("starts with all cards hidden when reveal is set", () => {
    const c = draw({
      type: "cards",
      reveal: true,
      items: [{ title: "First" }, { title: "Second" }],
    });
    const cards = [...c.querySelectorAll<HTMLElement>(".hw-card")];
    expect(cards.map((card) => card.hasAttribute("inert"))).toEqual([true, true]);
    expect(cards[0]?.className).toContain("opacity-0");
  });
});

describe("Layers", () => {
  it("renders ordered numbered layers and highlights the active layer", () => {
    const c = draw({
      type: "layers",
      ordered: true,
      highlight: 1,
      layers: [
        { title: "Base", text: "Foundation" },
        { title: "Core", text: "Active layer" },
      ],
    });
    const rows = [...c.querySelectorAll<HTMLElement>(":scope > div > div")];
    expect(rows[0]?.className).toContain("border-border");
    expect(rows[1]?.className).toContain("border-primary");
    expect([...c.querySelectorAll("h2")].map((h) => h.textContent)).toEqual(["Base", "Core"]);
    expect(c.textContent).toContain("1Base");
    expect(c.textContent).toContain("2Core");
  });
});

describe("Annotated and AnnotatedCode", () => {
  it("crops an annotated image and places highlight bands and gutter numbers", () => {
    const c = draw({
      type: "annotated",
      src: "/screen.png",
      alt: "Editor",
      size: [1000, 500],
      crop: { top: 0.2, bottom: 0.7, right: 0.8 },
      notes: [{ y: 0.45, h: 0.1, text: "**Key** line" }],
    });
    const img = c.querySelector<HTMLImageElement>('img[alt="Editor"]');
    const frame = img?.parentElement;
    assert(img, "annotated image should render");
    assert(frame, "crop frame should render");
    const band = frame.querySelector<HTMLElement>("div");
    const gutter = frame.parentElement?.querySelector<HTMLElement>(":scope > span");
    assert(band, "highlight band should render inside the crop frame");
    assert(gutter, "number tile should render in the gutter beside the crop frame");
    expect({ top: img.style.top, width: img.style.width }).toEqual({ top: "-40%", width: "125%" });
    expect(Number.parseFloat(band.style.top)).toBeCloseTo(50);
    expect(Number.parseFloat(band.style.height)).toBeCloseTo(20);
    expect(gutter.textContent).toBe("1");
    expect(c.querySelector("ol li")?.textContent).toBe("1Key line");
  });

  it("strips shared indentation and marks annotated code lines with number tiles", () => {
    const c = draw({
      type: "annotated-code",
      code: "    const a = 1;\n      const b = 2;",
      notes: [{ line: 2, text: "Second line" }],
    });
    const rows = [...c.querySelectorAll<HTMLElement>("pre code > div")];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.className).toContain("border-transparent");
    expect(rows[1]?.className).toContain("border-primary");
    expect(rows[1]?.textContent).toContain("1");
    expect(c.querySelector("ol li")?.textContent).toBe("1Second line");
  });
});

describe("Unknown diagram data", () => {
  it.each(["unknown", "constructor", "__proto__"])("renders nothing for block type %s", (type) => {
    expect(draw({ type } as VisualBlock)).toBeEmptyDOMElement();
  });

  it("uses normal ink for an unknown flow tone", () => {
    const c = draw({
      type: "flow",
      steps: [{ title: "Step", tone: "unknown" as "red" }],
    });
    expect(c.querySelector("h2")).toHaveClass("text-text");
  });
});
