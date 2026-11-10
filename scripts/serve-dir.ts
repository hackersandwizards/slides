import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const TYPES: Record<string, string> = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain",
};

/** Serves a built site's folder on a free port of 127.0.0.1 under `base` (such as `/slides`): a
 *  path is its file, or its folder's `index.html`. For `slides-density --site` and the page tests. */
export async function serveDir(dir: string, base = "") {
  const root = resolve(dir);
  const isFile = (path: string) => statSync(path, { throwIfNoEntry: false })?.isFile();
  const server = createServer((request, response) => {
    const missing = () => {
      response.statusCode = 404;
      response.end();
    };
    let path: string;
    try {
      path = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname);
    } catch {
      return missing();
    }
    const file = join(root, normalize(path.slice(base.length)));
    const found =
      path.startsWith(`${base}/`) &&
      file.startsWith(root) &&
      [file, join(file, "index.html")].find(isFile);
    if (!found) return missing();
    response.setHeader("Content-Type", TYPES[extname(found)] ?? "text/html");
    createReadStream(found).on("error", missing).pipe(response);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as { port: number };
  return { origin: `http://127.0.0.1:${port}`, close: () => server.close() };
}
