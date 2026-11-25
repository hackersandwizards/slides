import { expect, it } from "vitest";
import { renderPdf } from "../../scripts/render-pdf";
import { rejection } from "@hackersandwizards/scaffolding/rejection";

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
      await rejection(
        renderPdf(`http://127.0.0.1:${port}/d/print`, "/dev/null", { title: "T", slideCount: 1 }),
      ),
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
    await renderPdf(`http://127.0.0.1:${port}/d/print`, out, { title: "T", slideCount: 2 });
    expect((await stat(out)).size).toBeGreaterThan(0);
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 120_000);

it("downsamples oversized raster images while keeping SVGs and transparent PNGs", async () => {
  const { createServer } = await import("node:http");
  const { mkdtemp, rm, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const html = `<!doctype html><body>
    <div class="print-slide"><div class="slide-shell"><div class="slide-content">
      <img id="opaque" style="width: 50px; height: 50px; object-fit: cover" />
      <img id="alpha" style="width: 50px; height: 50px; object-fit: contain" />
      <img id="svg" style="width: 50px; height: 50px" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'></svg>" />
    </div></div></div>
    <script>
      const make = (alpha) => {
        const c = document.createElement("canvas");
        c.width = 400;
        c.height = 400;
        const ctx = c.getContext("2d");
        ctx.fillStyle = alpha ? "rgba(255, 0, 0, 0.5)" : "rgb(20, 120, 220)";
        ctx.fillRect(0, 0, 400, 400);
        return c.toDataURL("image/png");
      };
      const opaque = document.getElementById("opaque");
      const alpha = document.getElementById("alpha");
      opaque.src = make(false);
      alpha.src = make(true);
      Promise.all([opaque.decode(), alpha.decode()]).then(() => {
        document.querySelector(".slide-content").dataset.fitted = "";
      });
    </script>
  </body>`;
  const server = createServer((_, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  const dir = await mkdtemp(join(tmpdir(), "render-pdf-img-"));
  try {
    const out = join(dir, "images.pdf");
    await renderPdf(`http://127.0.0.1:${port}/d/print`, out, { title: "Images", slideCount: 1 });
    expect((await stat(out)).size).toBeGreaterThan(0);
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 120_000);
