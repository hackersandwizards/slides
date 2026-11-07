import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import { renderMarkdown } from "../lib/markdown";
import type { Slide } from "../types/slide";

const content = (blocks: unknown[]) =>
  render(
    <slideComponents.content
      slide={{ type: "content", headline: "H", content: blocks } as Slide}
    />,
  ).container;

describe("content blocks", () => {
  // A callout beside bars runs the full width, as on any other slide (code.talks panel 02.11.).
  it("gives a full-width callout beside bars the full width", () => {
    const c = content([
      { type: "bars", bars: [{ label: "a", value: 50, display: "50%" }] },
      { type: "callout", text: "Note", fullWidth: true },
    ]);
    const box = c.querySelector("p.text-xl")?.parentElement;
    expect(box?.className.split(" ")).toContain("w-full");
    expect(box?.className).not.toContain("beside-bars");
  });

  it("numbers a named scale and mutes the context bars", () => {
    const c = content([
      {
        type: "bars",
        max: 200,
        bars: [
          { label: "Kept", value: 150, highlight: true },
          { label: "Dropped", value: 50 },
        ],
      },
    ]);
    const ticks = [...c.querySelectorAll("[aria-hidden] > span")].map((s) => s.textContent);
    expect(ticks).toEqual(["0", "50", "100", "150", "200"]);
    expect(c.querySelector("span.text-text-muted")?.textContent).toBe("Dropped");
    expect(
      [...c.querySelectorAll("span")].find((s) => s.textContent === "Kept")?.className,
    ).toContain("text-primary");
  });

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

  // A segment's label stands on the line before its event, a figure under the event's text.
  it("sets a timeline's segment labels and an event's figure", () => {
    for (const extra of [0, 4]) {
      const events = [
        { title: "Plan" },
        { title: "Build", segment: "2 weeks" },
        { title: "Measure", segment: "3 weeks", text: "Time per text", figure: "-90%" },
        ...Array.from({ length: extra }, (_, i) => ({ title: `Later ${i}` })),
      ];
      const c = content([{ type: "timeline", events }]);
      expect(c.textContent).toContain("2 weeks");
      expect(c.textContent).toContain("3 weeks");
      const text = c.textContent ?? "";
      expect(text.indexOf("Time per text")).toBeLessThan(text.indexOf("−90%"));
    }
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

  it("keeps a short name on one line", () => {
    expect(chip("pr-diff-summarizer")).toContain("md:whitespace-nowrap");
  });

  // In a narrow flow step `my-skill` split at its hyphen and `settings.json` mid-word.
  it("breaks a path only after a slash or before a dot", () => {
    const code = render(
      <p>{renderMarkdown("`.claude/skills/my-skill/settings.json`")}</p>,
    ).container.querySelector("code")!;
    expect(code.className).not.toContain("overflow-wrap");
    expect(code.textContent).toBe(".claude/skills/my-skill/settings.json");
    expect([...code.querySelectorAll("span.whitespace-nowrap")].map((s) => s.textContent)).toEqual([
      ".claude/",
      "skills/",
      "my-skill/",
      "settings",
      ".json",
    ]);
    expect(code.querySelectorAll("wbr")).toHaveLength(4);
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

  it("drops the rule and quiets a leading word once figures wrap", () => {
    const items = [{ value: "up to 7", label: "a" }, ...Array(4).fill({ value: "1", label: "b" })];
    const c = content([{ type: "numbers", items }]);
    expect(c.querySelector(".border-t-4")).toBeNull();
    expect(c.querySelector("span.font-sans")?.textContent).toBe("up to");
    const row = content([{ type: "numbers", items: items.slice(0, 3) }]);
    expect(row.querySelector(".border-t-4")).not.toBeNull();
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

  // Pillars keep their density as dense cards (v0.27.2): drawn as plain cards, two four-pillar
  // slides fell from above 0.9 to 0.82 and 0.86 in trainer-hub's guard.
  it("draws grid pillars as dense cards", () => {
    const c = grid({ allActive: true, cards: [{ title: "A", description: "a" }] });
    expect(c.querySelector(".hw-card")?.className).toContain("card-pad-6");
    expect(c.querySelector(".hw-card h2")?.className).toContain("text-xl");
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
    expect(c.querySelector(".bg-slide-accent\\/7")).toBeNull();
  });

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

  // The replacements keep the density of the blocks they replace (v0.27.1): drawn at the plain
  // cards' sizes, a four-column slide of lists fell from 0.84 to 0.75 and a seven-item
  // labeled grid from 0.81 to 0.74 in talks' density guard. Dense cards carry no mark above the
  // title, the old blocks' title size and padding, and the body in the muted card text.
  it("draws labeled grid and four-column blocks as dense cards", () => {
    const c = content([
      { type: "labeled-grid", items: [{ title: "Low", subtitle: "a" }] },
      { type: "four-column", columns: [1, 2, 3, 4].map((n) => ({ title: `T${n}`, items: ["x"] })) },
    ]);
    const [grid, four] = c.querySelectorAll(".hw-card");
    expect(c.querySelector(".hw-card .h-1\\.5")).toBeNull();
    expect(grid.className).toContain("card-pad-6");
    expect(grid.querySelector("h2")?.className).toContain("text-xl");
    expect(grid.querySelector("p")?.className).toContain("card-text-lg");
    expect(four.className).toContain("card-pad-5");
    expect(four.querySelector("h2")?.className).toContain("text-lg");
    expect(four.querySelector("li")?.className).toContain("card-text-base");
  });

  it("keeps plain cards at their own sizes", () => {
    const c = content([{ type: "cards", items: [{ title: "A", text: "a" }] }]);
    expect(c.querySelector(".hw-card .h-1\\.5")).not.toBeNull();
    expect(c.querySelector(".hw-card")?.className).toContain("card-pad-8/9");
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
    expect(c.querySelector("h2.text-primary")?.textContent).toBe("Build");
    expect(c.querySelector(".hw-frame")?.textContent).toContain("Harness");
    expect(c.querySelector('.hw-frame img[alt="Logo"]')).not.toBeNull();
    expect(c.textContent).toContain("Note");
    expect(c.textContent).toContain("Foot");
  });

  // A pipeline's flow keeps the pipeline's height (v0.27.2): drawn with the plain flow's tiles
  // and titles, a slide of two pipelines fell from above 0.9 to 0.79 in trainer-hub's guard.
  it("draws a pipeline as a dense flow", () => {
    const c = content([{ type: "pipeline", stages }]);
    const tile = c.querySelector("h2")?.previousElementSibling;
    expect(tile?.className).toContain("size-10");
    expect(c.querySelector("h2")?.className).toContain("text-xl");
  });

  it("keeps a plain flow's large tiles", () => {
    const c = content([{ type: "flow", steps: [{ title: "A" }, { title: "B" }] }]);
    expect(c.querySelector("h2")?.previousElementSibling?.className).toContain("h-24");
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

describe("statement and content merges (merge-statement, merge-content)", () => {
  const one = (slide: object) =>
    render(
      <PrintProvider>
        {(() => {
          const C = slideComponents[(slide as Slide).type];
          return <C slide={slide as Slide} />;
        })()}
      </PrintProvider>,
    ).container;

  // A centered content slide whose blocks fit renders as a statement: its label the kicker, a
  // callout the closing, a linked image under the lines with its link spelled out.
  it("renders a centered content slide as a statement", () => {
    const c = one({
      type: "content",
      layout: "centered",
      sectionLabel: "Live demo",
      headline: "It merged itself",
      content: [
        { type: "linked-image", src: "/pr.png", href: "https://example.com/pr/1" },
        { type: "callout", text: "Closing line" },
      ],
    });
    expect(c.querySelector(".hw-label")?.textContent).toBe("Live demo");
    expect(c.querySelector("figure.w-11\\/24 img")).not.toBeNull();
    expect(c.textContent).toContain("example.com/pr/1");
    expect(c.textContent).toContain("Closing line");
    expect(c.querySelector(".hw-card")).toBeNull();
  });

  // A block a statement cannot hold keeps the centered content slide.
  it("keeps a centered slide with a terminal as content", () => {
    const c = one({
      type: "content",
      layout: "centered",
      headline: "H",
      content: [{ type: "terminal", commands: [{ prefix: "$", text: "ls" }] }],
    });
    expect(c.textContent).toContain("terminal");
  });

  // Regular: two titled sections are a two-column block, three cards, a last untitled section the
  // callout; the cards layout is an agenda; a profile keeps the regular slide.
  it("renders regular slides through content blocks", () => {
    const two = one({
      type: "regular",
      headline: "H",
      sections: [{ title: "A", items: ["a"] }, { title: "B", items: ["b"] }, { text: "Closing" }],
    });
    expect(two.querySelectorAll(".grid-cols-2 > *")).toHaveLength(2);
    expect(two.querySelector(".hw-callout")?.textContent).toBe("Closing");
    const three = one({
      type: "regular",
      headline: "H",
      sections: ["A", "B", "C"].map((title) => ({ title, items: ["x"] })),
    });
    expect(three.querySelectorAll(".hw-card")).toHaveLength(3);
    const agenda = one({
      type: "regular",
      headline: "H",
      layout: "cards",
      sections: [{ title: "One", text: "**t**", link: { url: "https://example.com", label: "L" } }],
    });
    expect(agenda.textContent).toContain("One");
    expect(agenda.querySelector("ol, ul")).not.toBeNull();
    expect(agenda.textContent).not.toContain("**");
    expect(agenda.querySelector('a[href="https://example.com"]')?.textContent).toBe("L");
    const linkOnly = one({
      type: "regular",
      headline: "H",
      sections: [{ title: "Repo", link: { url: "https://example.com", label: "L" } }],
    });
    expect(linkOnly.querySelector('a[href="https://example.com"]')?.textContent).toBe("L");
    const profile = one({
      type: "regular",
      headline: "H",
      profile: { name: "N", title: "T" },
      sections: [{ title: "A", items: ["a"] }],
    });
    expect(profile.textContent).toContain("N");
    expect(profile.querySelector(".text-teal")).not.toBeNull();
  });
});
