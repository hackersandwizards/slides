import { afterEach, describe, expect, it, vi } from "vitest";
import { fitSlide } from "../components/slides/fit-slide";

function setSize(
  el: HTMLElement,
  dims: {
    clientHeight?: number;
    scrollHeight?: number;
    clientWidth?: number;
    scrollWidth?: number;
    offsetTop?: number;
    offsetHeight?: number;
  },
) {
  for (const [key, value] of Object.entries(dims)) {
    Object.defineProperty(el, key, { configurable: true, get: () => value });
  }
}

function makeTitledShell(bodyClientH: number, bodyScrollH: number) {
  const shell = document.createElement("div");
  const content = document.createElement("div");
  content.className = "slide-content slide-titled";
  const body = document.createElement("div");
  body.className = "slide-body";
  setSize(body, { clientHeight: bodyClientH, scrollHeight: bodyScrollH });
  content.append(body);
  shell.append(content);
  document.body.append(shell);
  return { shell, content, body };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("fitSlide", () => {
  it("shrinks headings whose widest word overflows their box and keeps equal sizes matched", () => {
    const { shell, content } = makeTitledShell(1000, 1000);
    const wide = document.createElement("h2");
    wide.style.fontSize = "40px";
    setSize(wide, { clientWidth: 160, scrollWidth: 200 });
    const sibling = document.createElement("h2");
    sibling.style.fontSize = "40px";
    setSize(sibling, { clientWidth: 200, scrollWidth: 180 });
    content.append(wide, sibling);

    fitSlide(shell);
    expect(Number(wide.dataset.wordScale)).toBeCloseTo(0.7, 2);
    expect(sibling.dataset.wordScale).toBe(wide.dataset.wordScale);
    expect(content.dataset.fitted).toBe("");
  });

  it("skips shrinking on a narrow viewport", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      const { shell, body } = makeTitledShell(1000, 1500);
      fitSlide(shell);
      expect(body.style.zoom).toBe("");
      expect(body.style.justifyContent).toBe("");
    } finally {
      window.matchMedia = original;
    }
  });

  it.each([
    { label: "keeps", boostedHeight: 1110, expectedOverride: "", expectedZoom: 1000 / 1110 },
    { label: "drops", boostedHeight: 1400, expectedOverride: "1", expectedZoom: 1000 / 1100 },
  ])(
    "$label the card text boost based on the zoom trade-off",
    ({ boostedHeight, expectedOverride, expectedZoom }) => {
      const { shell, body } = makeTitledShell(1000, 1000);
      const card = document.createElement("div");
      card.className = "card-text-lg";
      body.append(card);
      const heights: Record<string, number> = { "": boostedHeight, "1": 1100 };
      Object.defineProperty(body, "scrollHeight", {
        configurable: true,
        get: () => heights[body.style.getPropertyValue("--card-boost")],
      });

      fitSlide(shell);
      expect(body.style.getPropertyValue("--card-boost")).toBe(expectedOverride);
      expect(Number(body.style.zoom)).toBeCloseTo(expectedZoom, 4);
    },
  );

  it("neutralizes [data-entrance] transforms during measurement and restores them after", () => {
    const { shell, body } = makeTitledShell(1000, 1250);
    const entering = document.createElement("div");
    entering.setAttribute("data-entrance", "");
    entering.style.transform = "translateY(6px)";
    body.append(entering);

    fitSlide(shell);
    expect(entering.style.getPropertyValue("transform")).toBe("translateY(6px)");
    expect(body.style.zoom).toBe("0.8");
  });
});
