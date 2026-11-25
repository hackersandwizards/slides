import { fireEvent, render } from "@testing-library/react";
import { assert, describe, expect, it, vi } from "vitest";
import {
  BeforeAfterSides,
  SlideCard,
  VideoPlayer,
  type CardTone,
} from "../components/slides/primitives";
import { PrintProvider } from "../lib/print-context";

type CardLook = "tint" | "soft" | "outline" | "line";

describe("SlideCard", () => {
  const cases: {
    tone: CardTone | "quiet";
    look: CardLook;
    classes: string[];
    variant?: string;
    dataTone?: string;
    exception?: string;
  }[] = [
    { tone: "neutral", look: "tint", classes: ["hw-card"] },
    { tone: "neutral", look: "soft", classes: ["hw-card"] },
    { tone: "neutral", look: "outline", classes: ["hw-card"] },
    { tone: "neutral", look: "line", classes: ["hw-card"] },
    { tone: "quiet", look: "tint", classes: ["rounded-brand", "bg-ink/7"], exception: "card-tone" },
    { tone: "quiet", look: "soft", classes: ["rounded-brand", "bg-ink/7"], exception: "card-tone" },
    {
      tone: "quiet",
      look: "outline",
      classes: ["rounded-brand", "bg-ink/7"],
      exception: "card-tone",
    },
    { tone: "quiet", look: "line", classes: ["rounded-brand", "bg-ink/7"], exception: "card-tone" },
    { tone: "primary", look: "tint", classes: ["hw-card"], variant: "tint" },
    { tone: "primary", look: "soft", classes: ["hw-status"], dataTone: "info" },
    {
      tone: "primary",
      look: "outline",
      classes: ["rounded-brand", "border-primary", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "primary",
      look: "line",
      classes: ["rounded-brand", "border-primary/25", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "secondary",
      look: "tint",
      classes: ["rounded-brand", "border-secondary", "bg-secondary/7"],
      exception: "card-tone",
    },
    {
      tone: "secondary",
      look: "soft",
      classes: ["rounded-brand", "border-secondary/25", "bg-secondary/7"],
      exception: "card-tone",
    },
    {
      tone: "secondary",
      look: "outline",
      classes: ["rounded-brand", "border-secondary", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "secondary",
      look: "line",
      classes: ["rounded-brand", "border-secondary/25", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "accent",
      look: "tint",
      classes: ["rounded-brand", "border-slide-accent", "bg-slide-accent/7"],
      exception: "card-tone",
    },
    { tone: "accent", look: "soft", classes: ["hw-status"], dataTone: "warning" },
    {
      tone: "accent",
      look: "outline",
      classes: ["rounded-brand", "border-slide-accent", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "accent",
      look: "line",
      classes: ["rounded-brand", "border-slide-accent/25", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "success",
      look: "tint",
      classes: ["rounded-brand", "border-green-dark", "bg-green-dark/7"],
      exception: "card-tone",
    },
    { tone: "success", look: "soft", classes: ["hw-status"], dataTone: "success" },
    {
      tone: "success",
      look: "outline",
      classes: ["rounded-brand", "border-green-dark", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "success",
      look: "line",
      classes: ["rounded-brand", "border-green-dark/25", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "error",
      look: "tint",
      classes: ["rounded-brand", "border-red", "bg-red/7"],
      exception: "card-tone",
    },
    { tone: "error", look: "soft", classes: ["hw-status"], dataTone: "error" },
    {
      tone: "error",
      look: "outline",
      classes: ["rounded-brand", "border-red", "bg-white"],
      exception: "card-tone",
    },
    {
      tone: "error",
      look: "line",
      classes: ["rounded-brand", "border-red/25", "bg-white"],
      exception: "card-tone",
    },
  ];

  it.each(cases)(
    "maps tone=$tone look=$look to its surface classes and data attributes",
    ({ tone, look, classes, variant, dataTone, exception }) => {
      const { container } = render(
        <SlideCard tone={tone} look={look} className="extra">
          Body
        </SlideCard>,
      );
      const el = container.firstElementChild;
      assert(el instanceof HTMLElement, "SlideCard renders a div element");
      expect(el.className.split(" ")).toEqual(expect.arrayContaining([...classes, "extra"]));
      expect(el.dataset.variant).toBe(variant);
      expect(el.dataset.tone).toBe(dataTone);
      expect(el.dataset.hwException).toBe(exception);
    },
  );
});

describe("VideoPlayer", () => {
  it("toggles play and pause when the button or video is clicked", () => {
    const { container } = render(<VideoPlayer src="/clip.mp4" alt="Clip" />);
    const video = container.querySelector("video");
    const button = container.querySelector("button");
    assert(video, "video element rendered");
    assert(button, "play button rendered");
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    let paused = true;
    Object.defineProperty(video, "paused", { get: () => paused, configurable: true });
    video.play = play;
    video.pause = pause;

    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(1);

    paused = false;
    fireEvent.click(video);
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it("switches the control label back to Play on pause and ended", () => {
    const { container } = render(<VideoPlayer src="/clip.mp4" alt="Clip" />);
    const video = container.querySelector("video");
    const button = container.querySelector("button");
    assert(video, "video element rendered");
    assert(button, "play button rendered");

    fireEvent.play(video);
    expect(button.getAttribute("aria-label")).toBe("Pause Clip");
    fireEvent.pause(video);
    expect(button.getAttribute("aria-label")).toBe("Play Clip");
    fireEvent.play(video);
    fireEvent.ended(video);
    expect(button.getAttribute("aria-label")).toBe("Play Clip");
  });

  it("draws the progress bar proportional to currentTime over duration", () => {
    const { container } = render(<VideoPlayer src="/clip.mp4" />);
    const video = container.querySelector("video");
    assert(video, "video element rendered");
    expect(container.querySelector(".bg-primary")).toBeNull();

    Object.defineProperty(video, "duration", { value: 20, configurable: true });
    Object.defineProperty(video, "currentTime", { value: 5, configurable: true });
    fireEvent.timeUpdate(video);

    const fill = container.querySelector<HTMLElement>(".bg-primary");
    assert(fill, "progress bar fill rendered");
    expect(fill.style.width).toBe("25%");
  });

  it("preloads metadata on screen and auto in print mode", () => {
    const screen = render(<VideoPlayer src="/clip.mp4" />).container.querySelector("video");
    const print = render(
      <PrintProvider>
        <VideoPlayer src="/clip.mp4" />
      </PrintProvider>,
    ).container.querySelector("video");
    expect(screen?.getAttribute("preload")).toBe("metadata");
    expect(print?.getAttribute("preload")).toBe("auto");
  });
});

describe("BeforeAfterSides", () => {
  it("draws a plus connector and omits the check icon when adds is true", () => {
    const { container } = render(
      <BeforeAfterSides
        left={{ label: "Stays", items: ["One"] }}
        right={{ label: "Added", items: ["Two"] }}
        after
        strike={false}
        adds
      />,
    );
    expect(container.textContent).toContain("+");
    expect(container.querySelector(".lucide-circle-check-big")).toBeNull();
    expect(container.querySelector(".lucide-circle-x")).toBeNull();
  });
});
