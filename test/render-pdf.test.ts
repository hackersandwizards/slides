import { expect, it } from "vitest";
import { renderPdf } from "../scripts/render-pdf";
import { rejection } from "@hackersandwizards/scaffolding/rejection";

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

// A print route whose island hydrates late (a cold dev server, a loaded machine) printed its slides
// unfitted, since the wait for the fit guard gave up after 10 s and the export went on. This page
// fits, and draws its second slide, only after 12 s.
it("prints a slow print route only once every slide is fitted", async () => {
  const { createServer } = await import("node:http");
  const { mkdtemp, rm, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const slide = (text: string) =>
    `<div class="print-slide"><div class="slide-shell"><div class="slide-content">${text}</div></div></div>`;
  const html = `<!doctype html><body>${slide("one")}<script>setTimeout(() => {
    document.body.insertAdjacentHTML("beforeend", ${JSON.stringify(slide("two"))});
    for (const c of document.querySelectorAll(".slide-content")) c.dataset.fitted = "";
  }, 12000)</script></body>`;
  const server = createServer((_, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  const dir = await mkdtemp(join(tmpdir(), "render-pdf-"));
  try {
    const out = join(dir, "deck.pdf");
    await renderPdf(`http://127.0.0.1:${port}/d/print`, out, "T", 2);
    expect((await stat(out)).size).toBeGreaterThan(0);
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 120_000);
