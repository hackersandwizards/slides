import { afterEach, describe, expect, it } from "vitest";
import { resolveSlideLogo } from "../lib/logo";
import { getSectionStyle, DEFAULT_SECTION_STYLE } from "../lib/section-styles";
import { arrivedBackwards, ignoredKey } from "../lib/slide-utils";

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
    expect(getSectionStyle("primary").label).toBe("text-primary");
    expect(getSectionStyle("deepdive").label).toBe("text-secondary");
  });
});

describe("arrivedBackwards", () => {
  afterEach(() => sessionStorage.clear());

  // Navigating backward into a slide marks the direction so the slide opens
  // fully revealed — you don't re-step through every progressive item.
  it("is true when arriving via back-navigation", () => {
    sessionStorage.setItem("slide-direction", "back");
    expect(arrivedBackwards()).toBe(true);
  });

  it("is false on a normal forward arrival", () => {
    expect(arrivedBackwards()).toBe(false);
  });

  it("is false for any other direction value", () => {
    sessionStorage.setItem("slide-direction", "forward");
    expect(arrivedBackwards()).toBe(false);
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
