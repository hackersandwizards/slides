import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const dist = join(import.meta.dirname, "..", "..", "dist");
const TYPES: Record<string, string> = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};

/** Serves dist/ under the `/slides` base, for the pages that hydrate. */
export async function serveDist() {
  const server = createServer((request, response) => {
    const url = decodeURI(new URL(request.url ?? "/", "http://x").pathname);
    const path = url.slice("/slides".length);
    const file = join(dist, path.endsWith("/") ? `${path}index.html` : path);
    if (
      !url.startsWith("/slides/") ||
      path.includes("..") ||
      !statSync(file, { throwIfNoEntry: false })?.isFile()
    ) {
      response.statusCode = 404;
      return response.end();
    }
    response.setHeader("Content-Type", TYPES[extname(file)] ?? "text/html");
    createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return { origin: `http://127.0.0.1:${port}`, close: () => server.close() };
}
