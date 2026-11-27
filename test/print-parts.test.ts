import { expect, it } from "vitest";
import { partFrames } from "../catalog/print-parts";

it("describes every part in the print catalogue", () => {
  const undescribed = partFrames
    .filter(({ purpose }) => purpose.trim() === "")
    .map(({ name }) => name);
  expect(undescribed).toEqual([]);
});

it("credits the titles TitledContent draws to the types passing heading and lead", () => {
  const expectedUsers = {
    SlideTitle: ["chart", "comparison", "decision", "grid", "process", "team-topology", "wheel"],
    SlideSubtitle: ["comparison", "decision", "team-topology", "wheel"],
  };
  const missing = Object.entries(expectedUsers).flatMap(([name, expected]) => {
    const users = partFrames.filter((part) => part.name === name).flatMap((part) => part.users);
    return expected.filter((type) => !users.includes(type)).map((type) => `${name}: ${type}`);
  });
  expect(missing).toEqual([]);
});
