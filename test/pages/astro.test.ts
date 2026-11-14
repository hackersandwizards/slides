import { spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { expect, it } from "vitest";
import { limit } from "./limit";

// Every test starting Astro on this root, one after another in this file: Astro processes started
// side by side race on the routes Astrobook writes into `catalog/.astro/integrations/`, and one
// fails its config setup ("has no place for its CSS import").
const root = join(import.meta.dirname, "..", "..");
// Run from a shell's PATH: under `bun --bun vitest` PATH starts with Bun's `node` shim, and Astro's
// preview under Bun fails on Astrobook's routes.
const PATH = process.env
  .PATH!.split(":")
  .filter((dir) => !dir.includes("/bun-node-"))
  .join(":");
// The counts name client decks, so only the dev server reads SLIDES_USAGE: these two files are
// invented, as every figure in this public repository must be. With Vitest's VITEST=true
// inherited, Astro's dev server never answered the page.
const SLIDES_USAGE = ["a", "b"].map((f) => `test/fixtures/usage-${f}.json`).join(",");
const usageEnv = { ...process.env, PATH, NODE: undefined, VITEST: undefined, SLIDES_USAGE };

const freePort = () =>
  new Promise<number>((resolve) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });

/** The page `path` as `bun run <script>` serves it on a free port, or undefined, with the
 *  server's output; the server is stopped either way. */
async function served(script: string, path: string, env: NodeJS.ProcessEnv) {
  const port = await freePort();
  const args = ["run", script, "--port", String(port)];
  const server = spawn("bun", script === "dev" ? [...args, "--ignore-lock"] : args, {
    cwd: root,
    detached: true,
    env,
  });
  let output = "";
  server.stdout.on("data", (chunk) => (output += chunk));
  server.stderr.on("data", (chunk) => (output += chunk));
  const running = () => server.exitCode === null && server.signalCode === null;
  try {
    let html: string | undefined;
    for (const deadline = Date.now() + limit(60_000); !html && running() && Date.now() < deadline;)
      html = await fetch(`http://127.0.0.1:${port}${path}`, {
        signal: AbortSignal.timeout(limit(30_000)),
      }).then(
        (response) => (response.ok ? response.text() : undefined),
        () => new Promise<undefined>((resolve) => setTimeout(resolve, 250)),
      );
    return { html, output };
  } finally {
    if (running()) process.kill(-server.pid!);
  }
}

/** The count an entry's caption shows, or undefined where it shows none. */
const countOf = (html: string, id: string) =>
  html.match(
    new RegExp(
      `<figure id="${id}" data-jobs[^>]*><figcaption><a [^>]*>[^<]*</a> <span class="hw-pill" data-[a-z]+="[a-z]+" data-usage>([^<]*)</span>`,
    ),
  )?.[1];

// CLAUDE.md: `bun run preview` serves the build.
it(
  "bun run preview serves the built catalog",
  async () => {
    const { html, output } = await served("preview", "/slides/catalog/print/", {
      ...process.env,
      PATH,
      NODE: undefined,
    });
    expect(html, output).toBeDefined();
  },
  limit(90_000),
);

it(
  "shows the counts of every file SLIDES_USAGE names, summed, on the dev server",
  async () => {
    const { html, output } = await served("dev", "/catalog/print/", usageEnv);
    expect(html, output).toBeDefined();
    const page = html!;
    expect(countOf(page, "content")).toBe("15 slides");
    expect(countOf(page, "title")).toBe("3 slides");
    expect(countOf(page, "block-cards")).toBe("4 slides");
    expect(countOf(page, "wheel")).toBe("0 slides");
    // A second tile of one entry, which slides-usage never counts.
    expect(countOf(page, "block-gallery-2")).toBeUndefined();
    expect(page).toMatch(/in 3 decks of 39 slides, from/);
    expect(page).toMatch(/<code>block-old-form<\/code> \(2 slides\)/);
  },
  limit(120_000),
);

it(
  "builds no count while SLIDES_USAGE is set",
  async () => {
    const out = join(root, "node_modules", ".cache", "slides-usage-build");
    try {
      const build = spawn("bun", ["run", "build", "--outDir", out], { cwd: root, env: usageEnv });
      let output = "";
      build.stdout.on("data", (chunk) => (output += chunk));
      build.stderr.on("data", (chunk) => (output += chunk));
      const code = await new Promise((resolve) => build.on("close", resolve));
      expect(code, output).toBe(0);
      const page = readFileSync(join(out, "catalog", "print", "index.html"), "utf8");
      // The control: the dev page above finds the count by this caption.
      expect(page).toMatch(/<figure id="content" data-jobs[^>]*><figcaption><a /);
      expect(countOf(page, "content")).toBeUndefined();
      expect(page).not.toContain("data-usage");
      expect(page).not.toContain("block-old-form");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  },
  limit(120_000),
);
