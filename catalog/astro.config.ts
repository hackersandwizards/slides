// The catalog (decision repo-uniformity-plan, hub-max): one Astro app in scaffolding's catalog shell,
// served at http://127.0.0.1:4335/slides/catalog/ by `bun run dev` and built to dist/ by
// `bun run build`, which the Pages workflow publishes at https://hackersandwizards.github.io/slides/.
// It carries the stories (catalog/stories) and the print pages (pages/catalog/print/), which
// brand-elements and the page tests read as files. The base is the Pages path, so the gate reads
// the build that ships. Astro is a dev dependency only: the package ships no Astro, and its
// consumers render the components in Next and in their own Astro.
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

// The files a page names that live outside the app: a slide names the brand logos (/hw-lockup.svg)
// and the specimen deck's images from the site root, as a consumer's public folder serves them; the
// print pages name brand's tokens, fonts, header CSS and logos in node_modules and the deck's images
// beside themselves, relative, so they also open from the disk: dist/brand/ holds brand's files.
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

// The build puts those files into dist/ where the pages name them, and points the stories' root
// paths at the base, since a Pages site lives under /slides/.
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
            createReadStream(file).pipe(response);
          });
        },
      },
    ],
  },
});
