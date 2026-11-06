import { describe, expect, it } from "vitest";
import { slidesOptimizeDeps } from "../lib/vite";

describe("slidesOptimizeDeps", () => {
  it("excludes the engine and names the packages its islands import", () => {
    const { exclude, include } = slidesOptimizeDeps();
    expect(exclude).toEqual(["@hackersandwizards/slides"]);
    expect(include).toEqual(
      expect.arrayContaining(["recharts", "motion/react", "shiki/core", "lucide-react/icons/mail"]),
    );
    expect(include.filter((s) => /^(node:|next\/|prettier$|\.)/.test(s))).toEqual([]);
  });
});
