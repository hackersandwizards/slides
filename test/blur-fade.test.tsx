import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlurFade } from "../components/ui/blur-fade";

// Benedikt 01.11.2026: „Erste ohne Animation“. The server's markup, which the first slide of a
// load hydrates from, is the fade's end state; a fade mounted later starts hidden.
describe("BlurFade", () => {
  it("renders the first slide of a load visible on the server", () => {
    const html = renderToString(<BlurFade>title</BlurFade>);
    expect(html).toContain("opacity:1");
    expect(html).not.toContain("blur(6px)");
  });

  it("starts a fade mounted after hydration hidden", () => {
    const { container } = render(<BlurFade>title</BlurFade>);
    expect((container.firstChild as HTMLElement).style.opacity).toBe("0");
  });
});
