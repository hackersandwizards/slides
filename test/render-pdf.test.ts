import { expect, it } from "vitest";
import { renderPdf } from "../scripts/render-pdf";
import { rejection } from "@hackersandwizards/scaffolding/rejection";

it.each(["file:///etc/passwd", "data:text/html,x", "javascript:alert(1)"])(
  "refuses to print %s before it starts a browser",
  async (url) => {
    expect(await rejection(renderPdf(url, "/dev/null", "T", 1))).toMatch(/http\(s\) page/);
  },
);
