import { expect, it } from "vitest";
import { renderPdf } from "../scripts/render-pdf";
import { rejection } from "./rejection";

it.each(["file:///etc/passwd", "data:text/html,x", "javascript:alert(1)"])(
  "refuses to print %s before it starts a browser",
  async (url) => {
    expect(await rejection(renderPdf(url, "/dev/null", "T", 1))).toMatch(/http\(s\) page/);
  },
);

// F28: a 500 from the print route read as "no .print-slide elements found", the density gate's
// wait being the only one that read the status.
it("names the status of a print route that fails", async () => {
  const { createServer } = await import("node:http");
  const server = createServer((_, res) => {
    res.statusCode = 500;
    res.end("<p>boom</p>");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  try {
    expect(
      await rejection(renderPdf(`http://127.0.0.1:${port}/d/print`, "/dev/null", "T", 1)),
    ).toMatch(/HTTP 500/);
  } finally {
    server.close();
  }
}, 60_000);
