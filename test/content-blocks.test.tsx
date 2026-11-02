import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { renderMarkdown } from "../lib/markdown";
import type { Slide } from "../types/slide";

const content = (blocks: unknown[]) =>
  render(
    <slideComponents.content
      slide={{ type: "content", headline: "H", content: blocks } as Slide}
    />,
  ).container;

describe("content blocks", () => {
  // Beside bars a callout leaves the value column free, but only where that column exists:
  // on a phone the value drops under the track and the callout takes the full width.
  it("narrows a callout beside bars from the md breakpoint only", () => {
    const c = content([
      { type: "bars", bars: [{ label: "a", value: 50, display: "50%" }] },
      { type: "callout", text: "Note" },
    ]);
    const box = c.querySelector("p.text-xl")?.parentElement;
    expect(box?.className).toContain("md:w-[calc(100%-var(--slide-callout-beside-bars))]");
    expect(box?.className.split(" ")).not.toContain(
      "w-[calc(100%-var(--slide-callout-beside-bars))]",
    );
  });

  // An empty labels object adds no label column.
  it("gives a timeline with empty labels no extra column", () => {
    const c = content([
      {
        type: "timeline",
        labels: {},
        events: [
          { when: "1", title: "a" },
          { when: "2", title: "b" },
        ],
      },
    ]);
    const grid = [...c.querySelectorAll<HTMLElement>("div")].find((d) =>
      d.style.gridTemplateColumns.includes("repeat("),
    );
    expect(grid?.style.gridTemplateColumns.startsWith("auto")).toBe(false);
  });

  // Annotated code takes the code panel's faint frame, as every code block does; its own ink
  // frame turned near-white on the night ground, the loudest element on the slide.
  it("frames annotated code as the code panel", () => {
    const c = content([{ type: "annotated-code", code: "a", notes: [] }]);
    expect(c.querySelector("pre")?.className.split(" ")).toEqual(
      expect.arrayContaining(["hw-code", "bg-code-bg"]),
    );
    expect(c.querySelector("pre")?.dataset.variant).toBe("panel");
    expect(c.querySelector("pre")?.className).not.toMatch(/border-(text|4)\b/);
  });

  // A video carries the engine's play button and no browser controls: their grey bar, spinner and
  // timestamp read as a broken embed on a projected slide. Its poster stands before it plays.
  it("plays a video from its own button, without browser controls", () => {
    const c = content([{ type: "video", src: "/a.mp4", alt: "Demo", poster: "/a.png" }]);
    const video = c.querySelector("video");
    expect(video?.hasAttribute("controls")).toBe(false);
    expect(video?.getAttribute("poster")).toBe("/a.png");
    expect(c.querySelector('button[aria-label="Play Demo"]')).not.toBeNull();
  });

  // Playing, the button stays as the pause control: a keyboard user who started the clip with it
  // can stop it again, and focus stays where it was.
  it("keeps the button as a pause control while the video plays", () => {
    const c = content([{ type: "video", src: "/a.mp4", alt: "Demo" }]);
    fireEvent.play(c.querySelector("video")!);
    expect(c.querySelector('button[aria-label="Pause Demo"]')).not.toBeNull();
  });

  // A step naming an icon the engine lacks keeps its number, never an empty tile.
  it("numbers a flow step whose icon is unknown", () => {
    const c = content([
      { type: "flow", steps: [{ title: "a", icon: "no-such-icon" }, { title: "b" }] },
    ]);
    const tiles = [...c.querySelectorAll("span.min-w-24")].map((t) => t.textContent);
    expect(tiles).toEqual(["1", "2"]);
  });

  // The play button holds only an icon: round and teal, as on the website and in the apps.
  it("rounds the play button", () => {
    const c = content([{ type: "video", src: "/a.mp4", alt: "Demo" }]);
    const button = c.querySelector('button[aria-label="Play Demo"]');
    expect(button?.classList.contains("hw-icon-button")).toBe(true);
    expect(button?.getAttribute("data-on")).toBe("picture");
  });

  // The link of a linked image is spelled out under it: projected or printed, the link is invisible.
  it("spells out a linked image's link under it", () => {
    const c = content([
      { type: "linked-image", src: "/a.png", href: "https://www.example.com/pull/7/" },
    ]);
    expect(c.querySelector("figure > a")?.textContent).toBe("example.com/pull/7");
  });

  // Image, video and linked image stand centred in the body's free height (slides.css).
  it("sets every picture block in the media frame", () => {
    for (const block of [
      { type: "image", src: "/a.png" },
      { type: "video", src: "/a.mp4" },
      { type: "linked-image", src: "/a.png" },
    ])
      expect(
        content([block]).querySelector(".slide-media .slide-media-item"),
        block.type,
      ).not.toBeNull();
  });
});

describe("inline code", () => {
  // A phone may break long inline code; only from md does a chip stay on one line.
  it("keeps inline code wrappable below md", () => {
    const { container } = render(<p>{renderMarkdown("run `a b c`")}</p>);
    const cls = container.querySelector("code")?.className.split(" ") ?? [];
    expect(cls).not.toContain("whitespace-nowrap");
  });

  const chip = (text: string) =>
    render(<p>{renderMarkdown(`\`${text}\``)}</p>).container.querySelector("code")?.className ?? "";

  it("keeps a short name on one line and lets a path break", () => {
    expect(chip("pr-diff-summarizer")).toContain("md:whitespace-nowrap");
    for (const path of ["settings.json", ".claude/settings.json", ".vscode/mcp.json"])
      expect(chip(path), path).toContain("[overflow-wrap:anywhere]");
  });
});

describe("numbers block", () => {
  // Every leading word of a figure is set small, and the size of the row counts those words at
  // half a digit's width, so "up to +70%" stays inside its column (blind review 02.11.).
  it("sets every leading word small and sizes the figure with it", () => {
    const c = content([
      {
        type: "numbers",
        items: [
          { value: "up to +70%", label: "a" },
          { value: "3x", label: "b" },
          { value: "12", label: "c" },
        ],
      },
    ]);
    const figure = c.querySelector<HTMLElement>("span[style*='font-size']")!;
    expect(figure.querySelector("span")?.textContent).toBe("up to");
    // A column is 1650/3 - 60 px wide at 1920, a mono digit 0.6em, a rem 21.333px.
    const width = parseFloat(figure.style.fontSize) * 21.333 * 0.6 * ("+70%".length + 0.5 * 5);
    expect(width).toBeLessThanOrEqual(1650 / 3 - 60);
  });
});

describe("merged card and number shapes", () => {
  const grid = (slide: object) =>
    render(<slideComponents.grid slide={{ type: "grid", headline: "H", ...slide } as Slide} />)
      .container;

  // Five figures and more wrap into three columns, and a figure's description stands under it.
  it("wraps numbers after four figures and sets a description line", () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      value: `${i}`,
      label: "l",
      text: `d${i}`,
    }));
    const c = content([{ type: "numbers", items }]);
    const row = [...c.querySelectorAll<HTMLElement>("div")].find((d) =>
      d.style.gridTemplateColumns.includes("repeat("),
    );
    expect(row?.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(c.textContent).toContain("d5");
  });

  // Grid stats render as the numbers block, the description as its line (merge-numbers).
  it("draws grid stats as numbers", () => {
    const c = grid({
      variant: "stats",
      cards: [{ title: "Teams", value: "12", description: "Across sites" }],
    });
    expect(c.querySelector(".text-\\(length\\:--slide-figure-hero\\)")?.textContent).toBe("12");
    expect(c.textContent).toContain("Across sites");
  });

  // Pillars render as cards: numbered from `numberFrom` where no card names an icon, with no card
  // colour of its own (merge-cards).
  it("draws grid pillars as cards", () => {
    const c = grid({
      allActive: true,
      numberFrom: 4,
      cards: [
        { title: "A", tone: "accent" },
        { title: "B", highlight: true },
      ],
    });
    expect([...c.querySelectorAll(".hw-card")].map((card) => card.textContent)).toEqual([
      "4A",
      "5B",
    ]);
    expect(c.querySelectorAll('.hw-card[data-variant="tint"]')).toHaveLength(1);
    expect(c.querySelector(".bg-accent\\/7")).toBeNull();
  });

  // A labeled grid's highlighted item is the cards block's highlight; a four-column block's
  // columns are cards with a list each.
  it("draws labeled grid and four-column blocks as cards", () => {
    const c = content([
      {
        type: "labeled-grid",
        items: [
          { title: "Low", subtitle: "a" },
          { title: "High", subtitle: "b", highlighted: true },
        ],
      },
      { type: "four-column", columns: [{ title: "T", subtitle: "s", items: ["x", "y"] }] },
    ]);
    expect(c.querySelector('.hw-card[data-variant="tint"]')?.textContent).toBe("Highb");
    expect([...c.querySelectorAll(".hw-card li")].map((li) => li.textContent)).toEqual(["x", "y"]);
  });
});

describe("pipeline into flow (merge-flow)", () => {
  const stages = [{ title: "Plan" }, { title: "Build", state: "new" }, { title: "Ship" }];

  // A pipeline flow can draw renders as the flow: the first new stage lit, the container its
  // frame with label, logos, notes and footer.
  it("draws a pipeline as a framed flow", () => {
    const c = content([
      {
        type: "pipeline",
        stages,
        containerLabel: "Harness",
        containerLogos: [{ src: "/l.png", alt: "Logo" }],
        containerSideNotes: ["Note"],
        containerFooter: "Foot",
      },
    ]);
    expect(c.querySelector(".pipeline-row")).toBeNull();
    expect(c.querySelector("h3.text-primary")?.textContent).toBe("Build");
    expect(c.querySelector(".hw-frame")?.textContent).toContain("Harness");
    expect(c.querySelector('.hw-frame img[alt="Logo"]')).not.toBeNull();
    expect(c.textContent).toContain("Note");
    expect(c.textContent).toContain("Foot");
  });

  // Inner loops and stage logos are what flow cannot draw: those keep the pipeline.
  it("keeps the pipeline for inner loops and stage logos", () => {
    for (const block of [
      { type: "pipeline", stages, showLoops: true },
      { type: "pipeline", stages: [{ title: "A", logo: "/a.png" }] },
    ])
      expect(content([block]).querySelector(".pipeline-row")).not.toBeNull();
  });

  it("sets a flow step's badge under it", () => {
    const c = content([{ type: "flow", steps: [{ title: "A", badge: "You are here" }] }]);
    expect(c.textContent).toContain("You are here");
  });
});
