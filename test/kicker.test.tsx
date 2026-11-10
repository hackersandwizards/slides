import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

const draw = (slide: Slide) => {
  const Component = slideComponents[slide.type];
  return render(<Component slide={slide} />).container;
};

// os decisions br-slide-kicker-colour (always teal, which a night slide maps to teal-night),
// br-label-style (the website's mono caps) and br-gradient-behind-content (no tint behind text):
// the kicker is the brand's label (hw-label, mono caps in teal-dark) in its default tone.
describe("the kicker above a slide title", () => {
  const slides: Slide[] = [
    { type: "content", headline: "H", sectionLabel: "K", sectionTheme: "secondary", content: [] },
    { type: "content", headline: "H", sectionLabel: "K", sectionTheme: "deepdive", content: [] },
    { type: "grid", headline: "H", sectionLabel: "K", sectionTheme: "accent", cards: [] },
    { type: "deep-dive-divider", headline: "H", partLabel: "Part two", kicker: "K" },
    { type: "transition", headline: "H", preText: "Stepping Back" },
  ] as Slide[];

  it.each(slides.map((s) => [`${s.type} ${"sectionTheme" in s ? s.sectionTheme : ""}`, s]))(
    "%s is teal mono caps on an untinted ground",
    (_, slide) => {
      const container = draw(slide as Slide);
      const kicker = [...container.querySelectorAll(".hw-label")].find((el) =>
        /^(K|Part two · K|Stepping Back)$/.test(el.textContent ?? ""),
      );
      expect(kicker).toBeDefined();
      expect(kicker?.hasAttribute("data-tone")).toBe(false);
      expect(container.querySelector('[class*="from-primary/7"]')).toBeNull();
    },
  );
});

// Every titled slide type a talk shows between its section dividers carries the section label in
// the same kicker as a content slide, so a deck labels each slide of a stop alike.
describe("the section label on every titled slide type", () => {
  const branch = { label: "Y", title: "T", text: "x", team: "platform" } as const;
  const slides = [
    {
      type: "decision",
      headline: "H",
      need: "n",
      question: "q",
      yes: branch,
      no: { ...branch, team: "enabling" },
      outcome: "o",
    },
    { type: "team-topology", headline: "H", streamAligned: [], platform: [], enabling: [] },
    { type: "process", headline: "H", nodes: [{ title: "A" }, { title: "B" }] },
    { type: "process", headline: "H", loop: false, nodes: [{ title: "A" }, { title: "B" }] },
    { type: "wheel", headline: "H", center: "C", segments: [{ title: "A", text: "a" }] },
    { type: "profiles", headline: "H", profiles: [] },
    { type: "chart", headline: "H", variant: "cycle", segments: [] },
    { type: "grid", variant: "quotes", headline: "H", cards: [] },
  ];

  it.each(slides.map((s) => [s.type, { ...s, sectionLabel: "K" } as Slide]))(
    "%s draws its section label as the kicker",
    (_, slide) => {
      const kicker = [...draw(slide).querySelectorAll(".slide-kicker .hw-label")];
      expect(kicker.map((el) => el.textContent)).toEqual(["K"]);
    },
  );
});
