import { inflateSync } from "node:zlib";
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

function pdfImages(pdf: Buffer) {
  return pdf
    .toString("latin1")
    .split(/^endobj\r?$/m)
    .map((object) => object.split(/^stream\r?$/m)[0])
    .filter((dictionary) => /\/Subtype\s*\/Image\b/.test(dictionary))
    .map((o) => ({
      width: Number(o.match(/\/Width\s+(\d+)/)?.[1]),
      height: Number(o.match(/\/Height\s+(\d+)/)?.[1]),
      hasAlpha: /\/SMask\b/.test(o),
      grayscale: /\/ColorSpace\s*\/DeviceGray\b/.test(o),
    }));
}

function pdfPageContent(pdf: Buffer): string {
  const source = pdf.toString("latin1");
  const id = source.match(/\/Contents (\d+) 0 R\b/)?.[1];
  const stream = source.match(new RegExp(`^${id} 0 obj\\r?\\n([\\s\\S]*?)\\r?\\nendobj`, "m"))?.[1];
  const length = Number(stream?.match(/\/Length (\d+)/)?.[1]);
  const data = stream?.match(/\bstream\r?\n([\s\S]*)/)?.[1]?.slice(0, length);
  return data ? inflateSync(Buffer.from(data, "latin1")).toString() : "";
}

it("downsamples oversized raster images while keeping SVGs and transparent PNGs", async () => {
  const { createServer } = await import("node:http");
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const html = `<!doctype html><body>
    <div class="print-slide"><div class="slide-shell"><div class="slide-content">
      <img id="opaque" style="width: 50px; height: 50px; object-fit: cover" />
      <img id="alpha" style="width: 50px; height: 50px; object-fit: contain" />
      <img id="svg" style="width: 50px; height: 50px" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='lime'/></svg>" />
    </div></div></div>
    <script>
      const make = (alpha) => {
        const c = document.createElement("canvas");
        c.width = 400;
        c.height = 400;
        const ctx = c.getContext("2d");
        const img = ctx.createImageData(400, 400);
        for (let i = 0; i < img.data.length; i += 4) {
          const p = i >> 2;
          img.data[i] = (p * 37) & 255;
          img.data[i + 1] = ((p >> 2) * 19) & 255;
          img.data[i + 2] = (p ^ (p >> 5)) & 255;
          img.data[i + 3] = alpha ? 128 : 255;
        }
        ctx.putImageData(img, 0, 0);
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
    const pdf = await readFile(out);
    const images = pdfImages(pdf);
    expect(images).toHaveLength(3);
    expect(images).toEqual(
      expect.arrayContaining([
        { width: 100, height: 100, hasAlpha: false, grayscale: false },
        { width: 100, height: 100, hasAlpha: true, grayscale: false },
        { width: 100, height: 100, hasAlpha: false, grayscale: true },
      ]),
    );
    expect(pdfPageContent(pdf)).toMatch(/\b0 1 0 rg\b[\s\S]*?\b0 0 400 400 re\s+f\b/);
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 120_000);
