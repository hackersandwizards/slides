import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../lib/markdown";

function renderMd(text: string): HTMLElement {
  return render(<div data-testid="md">{renderMarkdown(text)}</div>).getByTestId("md");
}

describe("renderMarkdown", () => {
  it.each(["https://haw.dev", "mailto:b@haw.dev", "/decks/x/0"])("keeps the link %s", (href) => {
    expect(renderMd(`[x](${href})`).querySelector("a")?.getAttribute("href")).toBe(href);
  });

  // A deck is code, but a link must still never become a script.
  it("renders a link with any other scheme as text", () => {
    const el = renderMd("[x](javascript:alert)");
    expect(el.querySelector("a")).toBeNull();
    expect(el.textContent).toBe("x");
  });

  it("renders **bold** as a <strong>", () => {
    expect(renderMd("a **bold** b").querySelector("strong")?.textContent).toBe("bold");
  });

  it("renders *emphasis* as an accent <span>", () => {
    expect(renderMd("a *word* b").querySelector("span.text-slide-accent")?.textContent).toBe(
      "word",
    );
  });

  it("renders `code` as a <code>", () => {
    expect(renderMd("run `cmd` now").querySelector("code")?.textContent).toBe("cmd");
  });

  it("does not treat spaced asterisks as emphasis", () => {
    const el = renderMd("math: 2 * 3 * 4");
    expect(el.querySelector("span.text-slide-accent")).toBeNull();
    expect(el.textContent).toBe("math: 2 * 3 * 4");
  });

  it("does not treat a single spaced asterisk as emphasis", () => {
    const el = renderMd("a * b");
    expect(el.querySelector("span.text-slide-accent")).toBeNull();
    expect(el.textContent).toBe("a * b");
  });

  it("handles multi-word emphasis", () => {
    expect(
      renderMd("say *hello world* now").querySelector("span.text-slide-accent")?.textContent,
    ).toBe("hello world");
  });

  it("keeps plain text between spaced asterisks as text", () => {
    const el = renderMd("* see note *");
    expect(el.querySelector("span.text-slide-accent")).toBeNull();
    expect(el.textContent).toBe("* see note *");
  });

  it("keeps a lone asterisk", () => {
    expect(renderMd("*").textContent).toBe("*");
  });
});

// A hyphenated compound never breaks at its hyphen into a lone fragment ("Self-" over
// "Service?"): a short one is an inline block, which moves whole and never overflows its box.
describe("hyphenated compounds", () => {
  const whole = (el: HTMLElement) =>
    [...el.querySelectorAll("span")]
      .filter((s) => s.className === "inline-block [baseline-source:first]")
      .map((s) => s.textContent);

  it.each([
    ["Can it be offered as Self-Service?", ["Self-Service"]],
    ["**On-call** for e-mail and pen-test prep", ["On-call", "e-mail", "pen-test"]],
    ["Zero-Trust-Plattform", ["Zero-Trust-Plattform"]],
  ])("keeps the compounds of %s whole", (text, compounds) => {
    const el = renderMd(text);
    expect(whole(el)).toEqual(compounds);
    expect(el.textContent).toBe(text.replace(/\*\*/g, ""));
  });

  it("lets a compound longer than a short line break", () => {
    expect(whole(renderMd("Kundenservice-Eskalationsmanagement-Prozess"))).toEqual([]);
  });
});
