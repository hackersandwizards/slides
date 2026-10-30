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

  // A deck is code, but a link must still never become a script: only web, mail and relative
  // targets keep their href, anything else renders as plain text.
  it("renders a link with any other scheme as text", () => {
    const el = renderMd("[x](javascript:alert)");
    expect(el.querySelector("a")).toBeNull();
    expect(el.textContent).toBe("x");
  });

  it("renders **bold** as a <strong>", () => {
    expect(renderMd("a **bold** b").querySelector("strong")?.textContent).toBe("bold");
  });

  it("renders *emphasis* as an accent <span>", () => {
    expect(renderMd("a *word* b").querySelector("span.text-accent")?.textContent).toBe("word");
  });

  it("renders `code` as a <code>", () => {
    expect(renderMd("run `cmd` now").querySelector("code")?.textContent).toBe("cmd");
  });

  // Regression guard for the regex tightened in lib/markdown.tsx: single
  // asterisks separated by whitespace are arithmetic, not emphasis.
  it("does not treat spaced asterisks as emphasis", () => {
    const el = renderMd("math: 2 * 3 * 4");
    expect(el.querySelector("span.text-accent")).toBeNull();
    expect(el.textContent).toBe("math: 2 * 3 * 4");
  });

  it("does not treat a single spaced asterisk as emphasis", () => {
    const el = renderMd("a * b");
    expect(el.querySelector("span.text-accent")).toBeNull();
    expect(el.textContent).toBe("a * b");
  });

  it("handles multi-word emphasis", () => {
    expect(renderMd("say *hello world* now").querySelector("span.text-accent")?.textContent).toBe(
      "hello world",
    );
  });

  // Only a part the split regex captured is formatting: plain text that happens to start and
  // end with an asterisk stays as written.
  it("keeps plain text between spaced asterisks as text", () => {
    const el = renderMd("* see note *");
    expect(el.querySelector("span.text-accent")).toBeNull();
    expect(el.textContent).toBe("* see note *");
  });

  it("keeps a lone asterisk", () => {
    expect(renderMd("*").textContent).toBe("*");
  });
});
