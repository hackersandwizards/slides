import {
  cpSync,
  createReadStream,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { catalog } from "@hackersandwizards/scaffolding/catalog";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";

const BASE = "/slides";
const root = fileURLToPath(new URL("..", import.meta.url));
const brand = join(root, "node_modules/@hackersandwizards/brand");
const deckFiles = join(root, "specimen/slide-catalogue");

// A slide names the brand logos and the deck's images from the site root, as a consumer's public
// folder serves them.
const fileOf = (path: string) => {
  const logo = path.match(/^\/hw-(wordmark|lockup)(-night)?\.svg$/);
  if (logo) return join(brand, "logos", `${logo[1]}${logo[2] ?? ""}.svg`);
  const asset = path.match(/^(?:\/slides)?(?:\/catalog\/print)?\/slide-catalogue\/([\w.-]+)$/);
  if (asset) return join(deckFiles, asset[1]);
  const own = path.match(/^(?:\/slides)?\/brand\/(.+)$/);
  return own && !own[1].includes("..") ? join(brand, own[1]) : undefined;
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
      const out = join(dist, "brand");
      mkdirSync(join(out, "logos"), { recursive: true });
      for (const d of ["tokens", "generated", "expert"])
        cpSync(join(brand, d), join(out, d), { recursive: true, dereference: true });
      for (const f of readdirSync(join(brand, "logos")))
        if (f.endsWith(".svg") || f === "favicon.ico")
          cpSync(join(brand, "logos", f), join(out, "logos", f));
      cpSync(deckFiles, join(dist, "catalog/print/slide-catalogue"), { recursive: true });
      cpSync(deckFiles, join(dist, "slide-catalogue"), { recursive: true });
      for (const f of ["wordmark", "wordmark-night", "lockup", "lockup-night"])
        cpSync(join(brand, "logos", `${f}.svg`), join(dist, `hw-${f}.svg`));
      const stories = join(dist, "catalog/stories");
      for (const page of readdirSync(stories, { recursive: true, encoding: "utf8" })) {
        if (!page.endsWith(".html")) continue;
        const file = join(stories, page);
        const html = readFileSync(file, "utf8");
        const based = html.replace(
          /(src|href|poster)="\/(hw-|slide-catalogue\/)/g,
          `$1="${BASE}/$2`,
        );
        if (based !== html) writeFileSync(file, based);
      }
    },
  },
};

export default defineConfig({
  base: BASE,
  srcDir: ".",
  compressHTML: false,
  devToolbar: { enabled: false },
  server: { host: "127.0.0.1", port: 4335 },
  integrations: [
    react(),
    catalog({
      product: "Slides",
      href: "/slides/catalog/",
      lead: "Every slide type of the h&w slide engine, each state a slide of the specimen deck, and the parts the types are built from, each with its variants. All content is made up.",
      css: ["../styles/slides.css"],
      previewSize: [1440, 810],
      groupOrder: ["Types", "Parts"],
      head: "./Head.astro",
      home: "./Home.astro",
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
