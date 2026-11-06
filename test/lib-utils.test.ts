import { afterEach, describe, expect, it } from "vitest";
import type { ContentSlide, Presentation } from "../types/slide";
import { cornerMark, resolveSlideLogo } from "../lib/logo";
import { getSectionStyle, DEFAULT_SECTION_STYLE } from "../lib/section-styles";
import {
  arrivedBackwards,
  opensRevealed,
  deepDiveAsTransition,
  gridAsContent,
  ignoredKey,
  replacedBy,
  twoColumnAsSplit,
} from "../lib/slide-utils";

const LOGO = { src: "/a.svg", alt: "A" };

describe("resolveSlideLogo", () => {
  it("returns the deck logo when there is no per-slide override", () => {
    expect(resolveSlideLogo({ logo: LOGO }, 0)).toBe(LOGO);
  });

  it("returns the per-slide override when present", () => {
    const override = { src: "/b.svg", alt: "B" };
    expect(resolveSlideLogo({ logo: LOGO, slideLogos: { 2: override } }, 2)).toBe(override);
  });

  // An explicit null means "use the default h&w logo on this slide" — distinct
  // from an absent index, which falls back to the deck logo.
  it("returns null for an explicit null entry", () => {
    expect(resolveSlideLogo({ logo: LOGO, slideLogos: { 3: null } }, 3)).toBeNull();
  });

  it("falls back to the deck logo for an index not in slideLogos", () => {
    expect(resolveSlideLogo({ logo: LOGO, slideLogos: { 3: null } }, 5)).toBe(LOGO);
  });

  it("returns undefined when neither logo nor override is set", () => {
    expect(resolveSlideLogo({}, 0)).toBeUndefined();
  });
});

describe("getSectionStyle", () => {
  it("returns the default style for an undefined theme", () => {
    expect(getSectionStyle(undefined)).toBe(DEFAULT_SECTION_STYLE);
  });

  it("maps a known theme to its own style", () => {
    expect(getSectionStyle("primary").border).toBe("border-border");
    expect(getSectionStyle("success").border).toBe("border-green-dark/25");
  });
});

describe("opensRevealed", () => {
  afterEach(() => sessionStorage.clear());

  // Navigating backward into a slide marks the direction so the slide opens
  // fully revealed — you don't re-step through every progressive item.
  it("is true when arriving via back-navigation", () => {
    sessionStorage.setItem("slide-direction", "back");
    expect(opensRevealed()).toBe(true);
  });

  it("is false on a normal forward arrival", () => {
    expect(opensRevealed()).toBe(false);
  });

  it("is false for any other direction value", () => {
    sessionStorage.setItem("slide-direction", "forward");
    expect(opensRevealed()).toBe(false);
  });

  it("is true on a URL carrying ?revealed", () => {
    history.replaceState(null, "", "?revealed");
    expect(opensRevealed()).toBe(true);
    expect(arrivedBackwards()).toBe(false);
    history.replaceState(null, "", location.pathname);
    expect(opensRevealed()).toBe(false);
  });
});

describe("ignoredKey", () => {
  afterEach(() => {
    delete document.documentElement.dataset.deckEdit;
  });
  const key = (isTrusted: boolean, init: KeyboardEventInit = {}) =>
    ({ isTrusted, metaKey: false, ctrlKey: false, altKey: false, ...init }) as KeyboardEvent;

  it("holds back a key pressed on the page only while edit mode is on", () => {
    expect(ignoredKey(key(true))).toBe(false);
    document.documentElement.dataset.deckEdit = "";
    expect(ignoredKey(key(true))).toBe(true);
  });

  // Touch buttons and replays from the speaker window dispatch their own presses.
  it("lets presses the engine dispatches through", () => {
    document.documentElement.dataset.deckEdit = "";
    expect(ignoredKey(key(false))).toBe(false);
  });

  // Cmd+Left is the browser's Back on macOS, Alt+Left elsewhere; Shift+Space steps back.
  it("leaves a key held with Cmd, Ctrl or Alt to the browser, and takes one with Shift", () => {
    for (const modifier of ["metaKey", "ctrlKey", "altKey"])
      expect(ignoredKey(key(true, { [modifier]: true }))).toBe(true);
    expect(ignoredKey(key(true, { shiftKey: true }))).toBe(false);
  });
});

describe("cornerMark", () => {
  const slides = [
    { type: "title" },
    { type: "regular" },
    { type: "closing" },
  ] as Presentation["slides"];

  it("puts the lockup on the title and the closing slide and the wordmark elsewhere", () => {
    expect(slides.map((_, i) => cornerMark({ slides }, i))).toEqual([
      "lockup",
      "wordmark",
      "lockup",
    ]);
  });
});

describe("gridAsContent", () => {
  it("keeps a pillars grid's own column count", () => {
    const cards = ["A", "B", "C", "D"].map((title) => ({ title, description: "d" }));
    const block = (columns?: 2 | 3 | 4) =>
      gridAsContent({ type: "grid", variant: "pillars", headline: "H", cards, columns }).content[0];
    expect(block(2)).toMatchObject({ type: "cards", columns: 2 });
    expect(block()).toMatchObject({ type: "cards", columns: 4 });
  });
});

// Round of 06.11.2026: one neutral two-column on its own draws as the comparison's split, the
// deep-dive divider as the night transition, and the catalogue lists both as replaced.
describe("merges of 06.11.", () => {
  const twoLists: ContentSlide = {
    type: "content",
    headline: "H",
    content: [
      {
        type: "two-column",
        left: { title: "L", items: ["a"] },
        right: { title: "R", items: ["b"] },
      },
    ],
    footer: "F",
  };

  it("draws a lone neutral two-column of lists as a split, its footer the punchline", () => {
    expect(twoColumnAsSplit(twoLists)).toEqual({
      type: "comparison",
      variant: "split",
      headline: "H",
      left: { label: "L", items: ["a"] },
      right: { label: "R", items: ["b"] },
      punchline: "F",
    });
    expect(replacedBy(twoLists)?.to).toBe("comparison split");
  });

  it.each([
    ["a second block", { content: [...twoLists.content, { type: "paragraph", text: "p" }] }],
    ["a judged variant", { content: [{ ...twoLists.content[0], variant: "success-error" }] }],
    ["a section label", { sectionLabel: "S" }],
    ["a ground", { ground: "primary" }],
    ["markdown in the headline", { headline: "Why `bun` wins" }],
    ["markdown in the footer", { footer: "Source: **Survey**" }],
    [
      "a text column",
      {
        content: [
          {
            type: "two-column",
            left: { title: "L", text: "t" },
            right: { title: "R", items: ["b"] },
          },
        ],
      },
    ],
  ])("keeps the block with %s", (_, change) => {
    expect(twoColumnAsSplit({ ...twoLists, ...change } as ContentSlide)).toBeUndefined();
  });

  it("names the split as the entry of a regular slide of two titled lists", () => {
    expect(
      replacedBy({
        type: "regular",
        headline: "H",
        sections: [
          { title: "L", items: ["a"] },
          { title: "R", items: ["b"] },
        ],
      }),
    ).toEqual({ to: "comparison split" });
  });

  it("draws a deep-dive divider as a night transition", () => {
    expect(
      deepDiveAsTransition({
        type: "deep-dive-divider",
        partLabel: "Part two",
        kicker: "Deep dive",
        headline: "H",
      }),
    ).toEqual({ type: "transition", night: true, headline: "H", preText: "Part two · Deep dive" });
  });
});
