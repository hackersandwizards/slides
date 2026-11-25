import { describe, expect, it } from "vitest";
import { clampPresenterSplit, presenterSplitKeyTarget } from "../lib/use-presenter-split";

describe("clampPresenterSplit", () => {
  it.each([
    [0, 0.1],
    [0.6, 0.6],
    [1, 0.9],
  ])("clamps %s to %s", (value, expected) => {
    expect(clampPresenterSplit(value)).toBe(expected);
  });
});

describe("presenterSplitKeyTarget", () => {
  it.each([
    ["ArrowUp", 0.55],
    ["ArrowDown", 0.65],
    ["Home", 0.1],
    ["End", 0.9],
  ] as const)("maps %s to a target of %s from 0.6", (key, expected) => {
    expect(presenterSplitKeyTarget(0.6, key)).toBeCloseTo(expected, 12);
  });

  it.each(["ArrowLeft", "constructor"])("ignores %s", (key) => {
    expect(presenterSplitKeyTarget(0.6, key)).toBeNull();
  });
});
