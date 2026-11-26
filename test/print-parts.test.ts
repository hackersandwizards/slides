import { expect, it } from "vitest";
import { partFrames } from "../catalog/print-parts";

it("describes every part in the print catalogue", () => {
  const undescribed = partFrames
    .filter(({ purpose }) => purpose.trim() === "")
    .map(({ name }) => name);
  expect(undescribed).toEqual([]);
});
