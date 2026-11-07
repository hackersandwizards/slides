import {
  cpSync,
  createReadStream,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { catalog } from "@hackersandwizards/scaffolding/catalog";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";
import { brandNames, selfContained } from "./brand-urls";

const BASE = "/slides";
const root = fileURLToPath(new URL("..", import.meta.url));
const fromRoot = createRequire(join(root, "package.json"));
const brandFile = (name: string) => fromRoot.resolve(`@hackersandwizards/brand/${name}`);
const deckFiles = join(root, "specimen/slide-catalogue");

// A slide names the deck's images from the site root, as a consumer's public folder serves them.
const fileOf = (path: string) => {
  const asset = path.match(/^(?:\/slides)?(?:\/catalog\/print)?\/slide-catalogue\/([\w.-]+)$/);
  if (asset) return join(deckFiles, asset[1]);
  const name = path.match(/^(?:\/slides)?\/brand\/(.+)$/)?.[1];
  if (!name || name.includes("..")) return undefined;
  try {
    return brandFile(name);
  } catch {
    return undefined;
  }
};
const types: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

// The stories' root paths move under the base, since a Pages site lives under /slides/.
const files: AstroIntegration = {
  name: "slide-files",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const dist = fileURLToPath(dir);
      const pages = join(dist, "catalog/print");
      const linked = readdirSync(pages, { recursive: true, encoding: "utf8" })
        .filter((page) => /\.(html|css)$/.test(page))
        .flatMap((page) => brandNames(readFileSync(join(pages, page), "utf8")));
      for (const name of new Set(linked)) {
        const file = brandFile(name);
        if (name.endsWith(".css") && !selfContained(readFileSync(file, "utf8")))
          throw new Error(`${name} links further files, which the build does not copy`);
        cpSync(file, join(dist, "brand", name));
      }
      cpSync(deckFiles, join(dist, "catalog/print/slide-catalogue"), { recursive: true });
      cpSync(deckFiles, join(dist, "slide-catalogue"), { recursive: true });
      const stories = join(dist, "stories");
      for (const page of readdirSync(stories, { recursive: true, encoding: "utf8" })) {
        if (!page.endsWith(".html")) continue;
        const file = join(stories, page);
        const html = readFileSync(file, "utf8");
        // The island's props too, or hydration puts the unbased path back.
        const based = html.replace(
          /((?:src|href|poster)="|&quot;)\/slide-catalogue\//g,
          `$1${BASE}/slide-catalogue/`,
        );
        if (based !== html) writeFileSync(file, based);
      }
    },
  },
};

export default defineConfig({
  base: BASE,
  srcDir: ".",
  devToolbar: { enabled: false },
  server: { host: "127.0.0.1", port: 4335 },
  integrations: [
    react(),
    catalog({
      product: "Slides",
      lead: "Every slide type of the h&w slide engine, each state a slide of the specimen deck, and the parts the types are built from, each with its variants. All content is made up.",
      css: ["../styles/slides.css"],
      previewSize: [1440, 810],
      groupOrder: ["Types", "Parts"],
      head: "./Head.astro",
      home: "./Home.astro",
      admin: true,
    }),
    files,
  ],
  vite: {
    define: { __SLIDES_ROOT__: JSON.stringify(root) },
    plugins: [
      tailwindcss(),
      {
        name: "slide-files",
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const file = fileOf(new URL(request.url ?? "/", "http://localhost").pathname);
            if (!file || !statSync(file, { throwIfNoEntry: false })?.isFile()) return next();
            response.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
            // Each of the print page's 80 frames asks for the same faces and images: uncached,
            // every frame fetched them again (6 MB of faces per load, 03.11.2026).
            response.setHeader("Cache-Control", "max-age=3600");
            createReadStream(file).pipe(response);
          });
        },
      },
    ],
  },
});
