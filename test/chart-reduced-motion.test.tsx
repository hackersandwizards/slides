import { act } from "@testing-library/react";
import { hasReducedMotionListener, prefersReducedMotion } from "motion/react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

it("hydrates a chart under reduced motion without a mismatch, its plot whole", async () => {
  const cycle = { type: "chart", variant: "cycle", segments: [{ label: "A", percentage: 50 }] };
  const Chart = slideComponents.chart;
  const host = document.createElement("div");
  // A server has no media query, so motion's reduced-motion setting is null there.
  hasReducedMotionListener.current = true;
  prefersReducedMotion.current = null;
  host.innerHTML = renderToString(<Chart slide={cycle as Slide} />);
  prefersReducedMotion.current = true;
  const errors: unknown[] = [];
  await act(async () => {
    hydrateRoot(host, <Chart slide={cycle as Slide} />, {
      onRecoverableError: (error) => errors.push(error),
    });
  });
  expect(errors).toEqual([]);
  // The cycle's drawing is 900 wide, so its clip ends 1800 wide.
  expect(parseFloat(host.querySelector("clipPath rect")?.getAttribute("width") ?? "0")).toBe(1800);
});

it("shows a chart mounted under reduced motion whole at once", () => {
  prefersReducedMotion.current = true;
  const host = document.createElement("div");
  const cycle = { type: "chart", variant: "cycle", segments: [{ label: "A", percentage: 50 }] };
  const Chart = slideComponents.chart;
  act(() => createRoot(host).render(<Chart slide={cycle as Slide} />));
  expect(parseFloat(host.querySelector("clipPath rect")?.getAttribute("width") ?? "0")).toBe(1800);
});
