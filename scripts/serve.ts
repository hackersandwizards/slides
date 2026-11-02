// `bun run dev`: serves this checkout on 127.0.0.1:4327 for http://slides.localhost, which Caddy
// proxies here as it proxies os.localhost to its dev server. The specimen is not committed: a
// request for one of its pages writes it afresh with scripts/specimen.ts (about 0.25 s) when a file
// in the checkout changed since the last write, so a reload shows the working tree. Node's API,
// since this repo's typecheck has no Bun types.
import { spawnSync } from "node:child_process";
import { createReadStream, statSync, watch, type FSWatcher } from "node:fs";
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

// The specimen's own output, which a write changes, and what git ignores or keeps for itself:
// tools write there all the time (vitest's results, eslint's cache), and a pin raise changes bun.lock.
const OWN =
  /^(\.git|node_modules|coverage|\.eslintcache|\.astro|design-system[/\\]dist|specimen[/\\](build|index\.html|frames\.html))([/\\]|$)/;
let stale = true;
let watcher: FSWatcher | undefined;

export const handle: RequestListener = (request, response) => {
  let path: string, file: string, found: boolean | undefined;
  try {
    path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    file = join(root, path.endsWith("/") ? `${path}index.html` : path);
    if (file.startsWith(join(root, "specimen") + sep) && file.endsWith(".html") && stale) {
      watcher ??= watch(root, { recursive: true }, (_, name) => {
        if (!name || !OWN.test(name)) stale = true;
      }).unref();
      // Cleared before the write, so an edit saved during it marks the specimen stale again.
      stale = false;
      const build = spawnSync("bun", ["scripts/specimen.ts"], { cwd: root, encoding: "utf8" });
      if (build.status) {
        stale = true;
        return response.writeHead(500).end(build.stderr);
      }
    }
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
