import { defined } from "@hackersandwizards/scaffolding/defined";
import { render } from "@testing-library/react";
import { assert, describe, expect, it } from "vitest";
import { slideComponents } from "@hackersandwizards/slides/lib/slide-components";
import type { Slide } from "../types/slide";
import { wholeText } from "./fixtures/whole-text";
import { teamTopologySlide } from "./fixtures/team-topology";
import { DeckLang } from "../components/slides/SlideShell";
import { WORDS } from "../lib/slide-words";

describe("TeamTopologySlide", () => {
  it("renders every team of all four types with its chips from the registry", () => {
    const SlideComponent = slideComponents["team-topology"];
    const { getAllByText } = render(<SlideComponent slide={teamTopologySlide as Slide} />);
    const { streamAligned, platform, enabling, complicatedSubsystem } = teamTopologySlide;
    assert(complicatedSubsystem, "fixture has complicated subsystems");
    expect(complicatedSubsystem).toHaveLength(3);
    const labels = [
      ...[...streamAligned, ...platform, ...enabling, ...complicatedSubsystem].map((t) => t.name),
      ...streamAligned.flatMap((t) => t.roles),
      ...platform.flatMap((team) => {
        assert(team.roles, "platform fixture has roles");
        assert(team.description, "platform fixture has a description");
        return [...team.roles, team.description];
      }),
      ...enabling.flatMap((t) => t.experts),
      ...complicatedSubsystem.map((team) => {
        assert(team.description, "subsystem fixture has a description");
        return team.description;
      }),
    ];
    expect(labels).toHaveLength(38);
    for (const label of labels) {
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
  const line = defined(
    [...container.querySelectorAll("p")].find((p) =>
      p.textContent?.includes(teamTopologySlide.streamAligned[0].roles[0]),
    ),
    "paragraph with the first stream-aligned role",
  );
  expect(line.className).toContain("text-balance");
  expect(line.className).toContain("text-xl");
  expect(container.querySelector(".rounded-full")).toBeNull();
  const roles = [...line.querySelectorAll(":scope > span")].map((s) => s.textContent);
  expect(roles).toEqual(teamTopologySlide.streamAligned[0].roles.map((r) => `•${NBSP}${r}`));
});

// Every blind reviewer of a client deck's team picture asked what the box colours meant, and readers
// new to Team Topologies named no type without one: a legend names each type drawn, in the order
// drawn, with a swatch drawn like its boxes, unless the slide turns it off.
describe("TeamTopologySlide legend", () => {
  const SlideComponent = slideComponents["team-topology"];
  const legendOf = (container: HTMLElement) => container.querySelector("ul");

  it("draws none where the slide turns it off", () => {
    const off = { ...teamTopologySlide, legend: false };
    const { container } = render(<SlideComponent slide={off as Slide} />);
    expect(legendOf(container)).toBeNull();
  });

  it("names each type drawn, in the deck's language, its swatch shaped like its boxes", () => {
    const slide = { ...teamTopologySlide, complicatedSubsystem: [] };
    const { container } = render(
      <DeckLang.Provider value="de">
        <SlideComponent slide={slide as Slide} />
      </DeckLang.Provider>,
    );
    const items = [...defined(legendOf(container), "team topology legend").querySelectorAll("li")];
    expect(items.map((li) => li.textContent)).toEqual([
      WORDS.de.teams.enabling,
      WORDS.de.teams.stream,
      WORDS.de.teams.platform,
    ]);
    const box = defined(
      defined(
        [...container.querySelectorAll(".card-title")].find(
          (e) => e.textContent === teamTopologySlide.streamAligned[0].name,
        ),
        "stream-aligned card title",
      ).parentElement,
      "stream-aligned card containing the title",
    );
    const swatch = defined(items[1].querySelector("span"), "second legend item's swatch");
    const shape = (e: Element) => [...e.classList].filter((k) => /^(border|bg)-/.test(k));
    expect(shape(swatch)).toEqual(shape(box));
  });
});
