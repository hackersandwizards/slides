import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import type { ComparisonSlide, Slide } from "../types/slide";

const slide = (left: string[], right: string[]): ComparisonSlide => ({
  type: "comparison",
  headline: "Chat or agent",
  variant: "vs",
  left: { label: "Chat", items: left },
  right: { label: "Agent", items: right },
});

function rules(s: ComparisonSlide): number {
  const SlideComponent = slideComponents.comparison;
  const { container } = render(<SlideComponent slide={s as Slide} />);
  return container.querySelectorAll(".border-t").length;
}

describe("ComparisonSlide", () => {
  // The rule separates "- " items from plus items, so a side of minus items alone has none.
  it("draws no rule on a side that holds only minus items", () => {
    expect(rules(slide(["- Copy and paste", "- No repository context"], ["Edits files"]))).toBe(0);
  });

  it("draws the rule between plus and minus items on one side", () => {
    expect(rules(slide(["Fast", "- No repository context"], ["Edits files"]))).toBe(1);
  });

  it("opens at the last step when the slide is entered backwards", () => {
    sessionStorage.setItem("slide-direction", "back");
    const SlideComponent = slideComponents.comparison;
    const { getByText } = render(
      <SlideComponent slide={slide(["Fast"], ["Edits files"]) as Slide} />,
    );
    sessionStorage.removeItem("slide-direction");
    const card = getByText("Agent").parentElement;
    expect(card?.classList.contains("hw-card")).toBe(true);
    expect(card?.getAttribute("data-variant")).toBe("tint");
  });

  // The flag is consumed, so a reload of the same slide opens at step 0.
  it("clears the backward-arrival flag after mount", () => {
    sessionStorage.setItem("slide-direction", "back");
    const SlideComponent = slideComponents.comparison;
    render(<SlideComponent slide={slide(["Fast"], ["Edits files"]) as Slide} />);
    expect(sessionStorage.getItem("slide-direction")).toBeNull();
  });
});

describe("comparison variants (merge-comparison)", () => {
  const draw = (s: object) =>
    render(
      <PrintProvider>
        <slideComponents.comparison slide={{ type: "comparison", ...s } as Slide} />
      </PrintProvider>,
    ).container;
  const sides = { left: { label: "Stays", items: ["a"] }, right: { label: "New", items: ["b"] } };

  it("leaves the before side unstruck with strike off", () => {
    const struck = draw({ variant: "before-after", ...sides });
    const kept = draw({ variant: "before-after", strike: false, ...sides });
    expect(struck.querySelector(".line-through")).not.toBeNull();
    expect(struck.querySelector(".lucide-circle-x")).not.toBeNull();
    expect(kept.querySelector(".line-through")).toBeNull();
    expect(kept.querySelector(".lucide-circle-x")).toBeNull();
  });

  const live = (s: object) =>
    render(<slideComponents.comparison slide={{ type: "comparison", ...s } as Slide} />);
  const punchline = "Same team";

  it("brings in a struck before-after's after side and punchline on the next press", () => {
    const { container, getByText, unmount } = live({
      variant: "before-after",
      punchline,
      ...sides,
    });
    expect(getByText("New").closest("[inert]")).not.toBeNull();
    expect(getByText(punchline).closest("[inert]")).not.toBeNull();
    expect(container.querySelector(".line-through")).toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true }));
    });
    expect(container.querySelector("[inert]")).toBeNull();
    expect(container.querySelector(".line-through")).not.toBeNull();
    expect(container.querySelector(".bg-text-subtle\\/7")).not.toBeNull();
    unmount();
  });

  it("shows a before-after without strike whole, its kept side on a white card", () => {
    const { container, getByText } = live({
      variant: "before-after",
      strike: false,
      punchline,
      ...sides,
    });
    expect(container.querySelector("[inert]")).toBeNull();
    expect(getByText("Stays").closest(".bg-white")).not.toBeNull();
  });

  it("prints a struck before-after whole", () => {
    const c = draw({ variant: "before-after", punchline, ...sides });
    expect(c.querySelector("[inert]")).toBeNull();
    expect(c.querySelector(".line-through")).not.toBeNull();
  });

  it("draws a transform block as before-after without strike", () => {
    const c = render(
      <slideComponents.content
        slide={
          {
            type: "content",
            headline: "H",
            content: [
              {
                type: "transform",
                before: { label: "Old", items: ["x"] },
                after: { label: "New", items: ["y"] },
              },
            ],
          } as Slide
        }
      />,
    ).container;
    expect(c.querySelector(".lucide-circle-check-big")).not.toBeNull();
    expect(c.querySelector(".line-through")).toBeNull();
  });

  it("renders a guidance slide through the comparison", () => {
    const examples = [{ title: "T", bad: "b", good: "g" }];
    const old = render(
      <PrintProvider>
        <slideComponents.guidance slide={{ type: "guidance", headline: "H", examples } as Slide} />
      </PrintProvider>,
    ).container.innerHTML;
    expect(draw({ variant: "guidance", headline: "H", examples }).innerHTML).toBe(old);
    expect(old).toContain("Bad");
  });

  // An engine label on the resolution read in English on German decks, so only `middle` labels it.
  it("draws the positions variant with its resolution", () => {
    const side = { name: "A", stance: "S", quote: "q" };
    const c = draw({
      variant: "positions",
      left: side,
      right: side,
      middle: "Both",
      resolution: "R",
    });
    expect(c.textContent).not.toContain("The verdict");
    expect(c.textContent).toContain("“q”");
    expect([...c.querySelectorAll("h2")].map((h) => h.textContent)).toContain("R");
    expect(c.textContent).toContain("Both");
  });

  it.each(["vs", "before-after", "split"] as const)("renders both highlights on %s", (variant) => {
    const SlideComponent = slideComponents.comparison;
    const s: ComparisonSlide = {
      ...slide(["Fast"], ["Edits files"]),
      variant,
      left: { label: "Chat", items: ["Fast"], highlight: "Stops" },
      right: { label: "Agent", items: ["Edits files"], highlight: "Keeps going" },
    };
    const { getByText } = render(
      <PrintProvider>
        <SlideComponent slide={s as Slide} />
      </PrintProvider>,
    );
    expect(getByText("Stops")).toBeTruthy();
    expect(getByText("Keeps going")).toBeTruthy();
  });
});
