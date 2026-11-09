import { expect, it } from "vitest";
import { renderPdf } from "../scripts/render-pdf";

// Each consumer's export script checked its host itself; the guard is the renderer's (2026-11-09).
it.each(["file:///etc/passwd", "data:text/html,x", "javascript:alert(1)"])(
  "refuses to print %s before it starts a browser",
  async (url) => {
    await expect(renderPdf(url, "/dev/null", "T", 1)).rejects.toThrow(/http\(s\) page/);
  },
);
