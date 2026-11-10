import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";
import { wholeText } from "./fixtures/whole-text";
import { teamTopologySlide } from "./fixtures/team-topology";
import { DeckLang } from "../components/slides/SlideShell";
import { TEAM_TYPES } from "../lib/slide-utils";

describe("TeamTopologySlide", () => {
  it("renders every team of all four types with its chips from the registry", () => {
    const SlideComponent = slideComponents["team-topology"];
    const { getAllByText } = render(<SlideComponent slide={teamTopologySlide as Slide} />);
    const { streamAligned, platform, enabling, complicatedSubsystem = [] } = teamTopologySlide;
    expect(complicatedSubsystem.length).toBeGreaterThan(0);
    for (const label of [
      ...[...streamAligned, ...platform, ...enabling, ...complicatedSubsystem].map((t) => t.name),
      ...streamAligned.flatMap((t) => t.roles),
      ...platform.flatMap((t) => [...(t.roles ?? []), t.description ?? ""]),
      ...enabling.flatMap((t) => t.experts),
      ...complicatedSubsystem.map((t) => t.description ?? ""),
    ]) {
      expect(getAllByText(wholeText(label)).length).toBeGreaterThan(0);
    }
  });
});

// As chips a stream team's last role dropped alone onto a second row at laptop width, and the chips
// sat a step below the decision slide's text: the roles are one balanced line of the body step,
// each whole behind its bullet.
const NBSP = String.fromCharCode(0xa0);
it("sets a team's roles as one balanced line, each role whole", () => {
  const SlideComponent = slideComponents["team-topology"];
  const { container } = render(<SlideComponent slide={teamTopologySlide as Slide} />);
  const line = [...container.querySelectorAll("p")].find((p) =>
    p.textContent?.includes(teamTopologySlide.streamAligned[0].roles[0]),
  )!;
  expect(line.className).toContain("text-balance");
  expect(line.className).toContain("text-xl");
  expect(container.querySelector(".rounded-full")).toBeNull();
  const roles = [...line.querySelectorAll(":scope > span")].map((s) => s.textContent);
  expect(roles).toEqual(teamTopologySlide.streamAligned[0].roles.map((r) => `•${NBSP}${r}`));
});

// Every blind reviewer of a client deck's team picture asked what the box colours meant: an
// optional legend names each type drawn, in the order drawn, with a swatch drawn like its boxes.
describe("TeamTopologySlide legend", () => {
  const SlideComponent = slideComponents["team-topology"];
  const legendOf = (container: HTMLElement) => container.querySelector("ul");

  it("draws none unless the slide asks for it", () => {
    const { container } = render(<SlideComponent slide={teamTopologySlide as Slide} />);
    expect(legendOf(container)).toBeNull();
  });

  it("names each type drawn, in the deck's language, its swatch shaped like its boxes", () => {
    const slide = { ...teamTopologySlide, complicatedSubsystem: [], legend: true };
    const { container } = render(
      <DeckLang.Provider value="de">
        <SlideComponent slide={slide as Slide} />
      </DeckLang.Provider>,
    );
    const items = [...legendOf(container)!.querySelectorAll("li")];
    expect(items.map((li) => li.textContent)).toEqual([
      TEAM_TYPES.de.enabling,
      TEAM_TYPES.de.stream,
      TEAM_TYPES.de.platform,
    ]);
    const box = [...container.querySelectorAll(".card-title")].find(
      (e) => e.textContent === teamTopologySlide.streamAligned[0].name,
    )!.parentElement!;
    const swatch = items[1].querySelector("span")!;
    const shape = (e: Element) => [...e.classList].filter((k) => /^(border|bg)-/.test(k));
    expect(shape(swatch)).toEqual(shape(box));
  });
});
