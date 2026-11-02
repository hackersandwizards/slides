// The design system (decision design-system-tool): Astrobook over design-system/stories, served at
// http://127.0.0.1:4335/design-system/ by `bun run design-system`. Astro is a dev dependency only,
// for this catalogue: the package ships no Astro, and its consumers render the components in Next
// and in their own Astro.
import { createReadStream, statSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import astrobook from "astrobook";

// The files a slide names from the site root, as a consumer's public folder serves them: the brand
// logos (/hw-lockup.svg) from the brand package and the specimen deck's images and videos.
const files = (path: string) => {
  const logo = path.match(/^\/hw-(wordmark|lockup)(-night)?\.svg$/);
  if (logo) return `../node_modules/@hackersandwizards/brand/logos/${logo[1]}${logo[2] ?? ""}.svg`;
  const asset = path.match(/^\/slide-catalogue\/([\w.-]+)$/);
  return asset ? `../specimen/slide-catalogue/${asset[1]}` : undefined;
};
const types: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

export default defineConfig({
  devToolbar: { enabled: false },
  server: { host: "127.0.0.1", port: 4335 },
  integrations: [
    react(),
    astrobook({
      directory: "stories",
      subpath: "/design-system",
      title: "Slides design system",
      css: ["../styles/slides.css"],
      head: "./Head.astro",
      home: "./Home.astro",
    }),
  ],
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: "slide-files",
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const relative = files(new URL(request.url ?? "/", "http://localhost").pathname);
            const file = relative && fileURLToPath(new URL(relative, import.meta.url));
            if (!file || !statSync(file, { throwIfNoEntry: false })?.isFile()) return next();
            response.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
            createReadStream(file).pipe(response);
          });
        },
      },
    ],
  },
});
