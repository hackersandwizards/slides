import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const dist = join(import.meta.dirname, "..", "..", "dist");
const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};

/** Serves dist/ under the `/slides` base, for the pages that hydrate. */
export async function serveDist() {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url!, "http://x").pathname.replace(/^\/slides/, "");
    try {
      const file = join(dist, path.endsWith("/") ? `${path}index.html` : path);
      res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
      res.end(await readFile(file));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as { port: number };
  return { origin: `http://127.0.0.1:${port}`, close: () => server.close() };
}
