import { createElement as h, type ReactNode } from "react";
import * as primitives from "../components/slides/primitives";
import { AxisTick, TICK_GAP, tickLayout } from "../components/slides/ChartPlots";
import * as chrome from "../components/slides/SlideChrome";
import { highlightLines } from "../lib/code-highlight";
import { qrAlt } from "../lib/slide-utils";
import { specimenImages } from "../specimen/slide-catalog";

const {
  CodePanel,
  DashedFrame,
  DisplayHeading,
  LinkCaption,
  PictureLink,
  NumberTile,
  Portrait,
  SlideCaption,
  SlideCard,
  SlideFooter,
  SlideSubtitle,
  SlideTitle,
  VideoPlayer,
} = primitives;
const { FrameTitle, PulseDot } = chrome;
export const label = (text: string) =>
  h("p", { className: "hw-label mb-3", "data-tone": "muted" }, text);
export const inRow = (...children: ReactNode[]) =>
  h("div", { className: "flex flex-wrap items-start gap-8" }, ...children);
const cell = (name: string, child: ReactNode) => h("div", null, label(name), child);
export const tones = ["neutral", "primary", "secondary", "accent", "success", "error"] as const;
export const looks = ["tint", "soft", "outline", "line"] as const;

/** A part missing here fails the build (print.ts). */
export const PARTS: Record<string, () => ReactNode> = {
  DisplayHeading: () =>
    h(
      "div",
      { className: "space-y-10" },
      ...(["xl", "lg", "md", "sm"] as const).map((size) =>
        cell(`size ${size}`, h(DisplayHeading, { size, as: "div", children: "Ship the loop" })),
      ),
    ),
  SlideCard: () =>
    h(
      "div",
      { className: "grid grid-cols-4 gap-6" },
      h(SlideCard, { className: "card-pad-4/6 text-lg" }, "neutral"),
      h(SlideCard, { tone: "quiet", className: "col-span-3 w-1/3 card-pad-4/6 text-lg" }, "quiet"),
      ...tones
        .filter((tone) => tone !== "neutral")
        .flatMap((tone) =>
          looks.map((look) =>
            h(
              SlideCard,
              { tone, look, key: `${tone}-${look}`, className: "card-pad-4/6 text-lg" },
              `${tone} · ${look}`,
            ),
          ),
        ),
    ),
  NumberTile: () =>
    h(
      "div",
      { className: "space-y-8" },
      ...(["solid", "soft", "badge", "ink"] as const).map((tone) =>
        cell(
          `tone ${tone}`,
          inRow(
            ...(["sm", "md", "lg", "xl"] as const).map((size) =>
              h(NumberTile, { size, tone, key: size, children: size === "xl" ? "10x" : "3" }),
            ),
          ),
        ),
      ),
    ),
  DashedFrame: () =>
    inRow(
      cell("neutral", h(DashedFrame, { className: "w-96 p-6 text-lg" }, "A group")),
      ...(["primary", "secondary"] as const).flatMap((tone) =>
        [false, true].map((active) =>
          cell(
            `${tone}${active ? ", active" : ""}`,
            h(
              DashedFrame,
              { tone, active, key: `${tone}${active}`, className: "w-96 p-6 text-lg" },
              "A group",
            ),
          ),
        ),
      ),
    ),
  VideoPlayer: () =>
    h(
      "div",
      { className: "w-1/2 pb-10" },
      h(VideoPlayer, {
        src: specimenImages["agent-session.mp4"],
        poster: specimenImages["agent-session-poster.png"],
        alt: "An agent session",
      }),
    ),
  SlideTitle: () => h(SlideTitle, null, "A slide's headline on one line"),
  LinkCaption: () =>
    inRow(
      h(LinkCaption, { href: "https://example.com/harness" }),
      h(LinkCaption, { href: "https://www.linkedin.com/in/example", variant: "linkedin" }),
    ),
  PictureLink: () =>
    h(PictureLink, {
      href: "https://example.com/harness",
      children: h("img", {
        src: specimenImages["qr-example.png"],
        alt: qrAlt("https://example.com/harness"),
        className: "size-48 rounded-brand",
      }),
    }),
  Portrait: () =>
    inRow(
      ...(["neutral", "primary", "secondary"] as const).map((tone) =>
        cell(
          tone,
          h(Portrait, {
            tone,
            src: specimenImages["portrait-a.png"],
            alt: "",
            className: "[--hw-avatar-size:--spacing(36)]",
          }),
        ),
      ),
      cell("no picture", h(Portrait, { alt: "", className: "[--hw-avatar-size:--spacing(36)]" })),
      cell(
        "in a card",
        h(
          SlideCard,
          { className: "card-pad-4/6" },
          h(Portrait, {
            src: specimenImages["portrait-b.png"],
            alt: "",
            className: "[--hw-avatar-size:--spacing(32)]",
          }),
        ),
      ),
    ),
  SlideSubtitle: () => h(SlideSubtitle, null, "The line under a headline, in muted ink."),
  SlideCaption: () => h(SlideCaption, null, "The caption under a diagram, its last step."),
  SlideFooter: () => h(SlideFooter, null, "The one line under a slide's body, such as its source."),
  CodePanel: () =>
    h(
      CodePanel,
      { as: "pre", className: "p-8 font-code text-xl" },
      highlightLines('claude --print "fix the failing test" # one run', "bash"),
    ),
  TitledContent: () =>
    label("The column of a titled slide: headline, then the body under the fit guard."),
  // Measured at 10 px a character, "Spec review" wraps in an 80 px band and angles in a 40 px one,
  // where "review" alone is too wide.
  AxisTick: () =>
    inRow(
      ...([80, 40] as const).map((band) => {
        const layout = tickLayout(["Spec review"], band, (text) => text.length * 10);
        return cell(
          layout.angled ? "angled" : "wrapped",
          h(
            "svg",
            { width: 480, height: 240 },
            h("line", { x1: 40, x2: 440, y1: 80, y2: 80, stroke: "var(--color-border-strong)" }),
            // Below the axis by recharts' 6 px tick and the gap, as on a chart.
            h(AxisTick, { x: 240, y: 80 + 6 + TICK_GAP, index: 0, layout }),
          ),
        );
      }),
    ),
  ChartFrame: () => label("A chart's plot area: a SlideCard of fixed height the chart fills."),
  FrameTitle: () => h(FrameTitle, null, "The Factory"),
  PulseDot: () =>
    h(
      "span",
      { className: "relative inline-block rounded-brand bg-primary/7 px-6 py-3 text-xl" },
      "New stage",
      h(PulseDot, { category: "primary" }),
    ),
};
