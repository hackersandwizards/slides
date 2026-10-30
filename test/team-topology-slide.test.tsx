import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";
import { teamTopologySlide } from "./fixtures/team-topology";

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
      expect(getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});
