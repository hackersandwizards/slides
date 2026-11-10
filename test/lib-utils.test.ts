import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentSlide, Presentation } from "../types/slide";
import { cornerMark, resolveSlideLogo } from "../lib/logo";
import { getSectionStyle, DEFAULT_SECTION_STYLE } from "../lib/section-styles";
import { deprecated } from "../lib/slide-components";
import {
  arrivedBackwards,
  bulletsAsStatement,
  centeredAsStatement,
  closingClaim,
  deckLang,
  opensRevealed,
  deepDiveAsTransition,
  gridAsContent,
  ignoredKey,
  replacedBy,
  slideTitle,
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

  // An explicit null shows the default h&w logo, where an absent index takes the deck's.
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

  // A slide entered backwards opens fully revealed, so nobody re-steps through its reveals.
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

describe("deckLang", () => {
  it("is the first title slide's lang that is set, else English", () => {
    const deck = (slides: unknown[]) => ({ name: "D", slides }) as Presentation;
    const untitled = { type: "title", title: "T" };
    expect(deckLang(deck([untitled, { ...untitled, lang: "de" }]))).toBe("de");
    expect(deckLang(deck([{ type: "statement" }]))).toBe("en");
  });

  it("is the deck's own lang first, for a deck with no title slide", () => {
    const de = { name: "D", lang: "de", slides: [{ type: "statement" }] } as Presentation;
    expect(deckLang(de)).toBe("de");
    expect(deckLang({ ...de, slides: [{ type: "title", title: "T", lang: "en" }] })).toBe("de");
  });

  it("warns once outside a browser for a deck that names no language", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("document", undefined);
    try {
      const unnamed = { name: "Unnamed", slides: [{ type: "title", title: "T" }] } as Presentation;
      deckLang(unnamed);
      deckLang(unnamed);
      deckLang({ name: "Named", slides: [{ type: "title", title: "T", lang: "de" }] });
      deckLang({ name: "Own", lang: "en", slides: [{ type: "statement" }] } as Presentation);
      expect(warn.mock.calls).toEqual([[expect.stringContaining('"Unnamed"')]]);
    } finally {
      vi.unstubAllGlobals();
      warn.mockRestore();
    }
  });
});

describe("slideTitle", () => {
  it("is the deck's name and the slide's number", () => {
    expect(slideTitle({ name: "D", slides: [] }, 0)).toBe("D - 1");
  });
});

describe("closingClaim", () => {
  it("is the deck's language on a contact closing, a set language winning, none when off", () => {
    const contact = { type: "closing", variant: "contact" } as const;
    expect(closingClaim(contact, "de")).toBe("de");
    expect(closingClaim({ type: "closing" }, "en")).toBe("en");
    expect(closingClaim({ ...contact, claim: "en" }, "de")).toBe("en");
    expect(closingClaim({ ...contact, claim: false }, "de")).toBeUndefined();
    expect(closingClaim({ type: "closing", variant: "discussion" }, "de")).toBeUndefined();
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

  it("holds back a key pressed under an open dialog, while another window's replay still counts", () => {
    expect(ignoredKey(key(true))).toBe(false);
    const dialog = document.body.appendChild(document.createElement("dialog"));
    dialog.setAttribute("open", "");
    expect(ignoredKey(key(true))).toBe(true);
    expect(ignoredKey(key(false))).toBe(false);
    dialog.remove();
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

  it("names the block a media slide renders as", () => {
    const one = { src: "/a.png", alt: "A" };
    expect(replacedBy({ type: "media", sources: [one] })).toEqual({
      to: "image",
      form: "media, one image",
    });
    expect(replacedBy({ type: "media", sources: [{ src: "/a.mp4", alt: "A" }] })?.to).toBe("video");
    expect(replacedBy({ type: "media", sources: [one, one] })).toEqual({ to: "gallery" });
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

// A statement prints its lines as typed, so markdown keeps a slide as content; a lone bracket or
// asterisk is no markdown.
describe("markdown in a headline", () => {
  const centred = (headline: string): ContentSlide => ({
    type: "content",
    layout: "centered",
    headline,
    content: [{ type: "paragraph", text: "P" }],
  });
  const bullets = (headline: string): ContentSlide => ({
    type: "content",
    headline,
    content: [{ type: "bullets", items: ["One short point"] }],
  });
  const split = (headline: string): ContentSlide => ({
    type: "content",
    headline,
    content: [
      {
        type: "two-column",
        left: { title: "L", items: ["a"] },
        right: { title: "R", items: ["b"] },
      },
    ],
  });

  it.each([
    ["centred", centred, centeredAsStatement],
    ["bullets", bullets, bulletsAsStatement],
    ["split", split, twoColumnAsSplit],
  ] as const)("%s: redraws past a lone bracket, keeps a link", (_, make, redraw) => {
    expect(redraw(make("Cost [EUR] * 2"))).toBeDefined();
    expect(redraw(make("Read [the plan](https://example.com)"))).toBeUndefined();
  });
});

describe("deprecated", () => {
  it("names exactly the props and types types/slide.ts marks @deprecated", () => {
    const source = readFileSync(join(import.meta.dirname, "..", "types", "slide.ts"), "utf8");
    // The declaration after each @deprecated comment: a prop, a block's `type` or a slide interface.
    const tagged = [...source.matchAll(/@deprecated[\s\S]*?\*\/\s*(.+)/g)].map(([, line]) => line);
    const typeOf = (line: string) =>
      line.startsWith("export interface")
        ? source.slice(source.indexOf(line)).match(/type: "([\w-]+)"/)![1]
        : line.match(/^type: "([\w-]+)"/)?.[1];
    const types = tagged.flatMap((line) => typeOf(line) ?? []);
    const props = tagged.filter((line) => !typeOf(line)).map((line) => line.match(/^(\w+)\?:/)![1]);
    // Controls: a match that returns nothing proves nothing.
    expect(types).toContain("transform");
    expect(props).toContain("dotColor");
    expect([...deprecated.props].sort()).toEqual(props.sort());
    expect([...deprecated.values.type].sort()).toEqual(types.sort());
    // The values deprecated in prose: each a literal its prop takes.
    for (const prop of ["variant", "claim"] as const)
      for (const value of deprecated.values[prop])
        expect(source).toMatch(new RegExp(`${prop}\\??: [^;]*"${value}"`));
  });
});
