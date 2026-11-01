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
      expect.arrayContaining(["border-white/7", "bg-code-bg"]),
    );
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
    const classes = c.querySelector('button[aria-label="Play Demo"]')?.classList;
    expect(classes?.contains("rounded-full")).toBe(true);
    expect(classes?.contains("bg-primary")).toBe(true);
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
});
