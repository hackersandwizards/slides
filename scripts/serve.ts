// `bun run dev`: serves this checkout on 127.0.0.1:4327 for http://slides.localhost, which Caddy
// proxies here as it proxies os.localhost to its dev server. Node's API, since this repo's
// typecheck has no Bun types.
import { createReadStream, statSync } from "node:fs";
import { createServer, type RequestListener } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const home = "/specimen/";
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

export const handle: RequestListener = (request, response) => {
  let path: string, file: string, found: boolean | undefined;
  try {
    path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    file = join(root, path.endsWith("/") ? `${path}index.html` : path);
    found = file.startsWith(root + sep) && statSync(file, { throwIfNoEntry: false })?.isFile();
  } catch {
    // A malformed escape (`%E0%A4%A`) or a NUL byte threw out of the handler and ended the server.
    return response.writeHead(400).end("Bad request");
  }
  if (path === "/") return response.writeHead(302, { Location: home }).end();
  if (!found) return response.writeHead(404).end("Not found");
  response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file)
    .on("error", () => response.destroy())
    .pipe(response);
};

if (import.meta.main) {
  createServer(handle).listen(4327, "127.0.0.1");
  console.log("Caddy: http://slides.localhost, direct: http://localhost:4327");
}
