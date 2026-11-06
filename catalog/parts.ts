import { createElement as h, type ReactNode } from "react";
import * as primitives from "../components/slides/primitives";
import * as chrome from "../components/slides/SlideChrome";
import { highlightLines } from "../lib/code-highlight";

const {
  CodePanel,
  DashedFrame,
  DisplayHeading,
  LinkCaption,
  PictureLink,
  NumberTile,
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
        src: "/slide-catalogue/agent-session.mp4",
        poster: "/slide-catalogue/agent-session-poster.png",
        alt: "An agent session",
      }),
    ),
  SlideTitle: () => h(SlideTitle, null, "A slide's headline on one line"),
  LinkCaption: () => h(LinkCaption, { href: "https://example.com/harness" }),
  PictureLink: () =>
    h(PictureLink, {
      href: "https://example.com/harness",
      children: h("img", {
        src: "/slide-catalogue/qr-example.png",
        alt: "",
        className: "size-48 rounded-brand",
      }),
    }),
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
