import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";
import { expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const freePort = () =>
  new Promise<number>((resolve) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });

// CLAUDE.md: `bun run preview` serves the build. Run from a shell's PATH: under `bun --bun vitest`
// PATH starts with Bun's `node` shim, and Astro's preview under Bun fails on Astrobook's routes.
it("bun run preview serves the built catalog", async () => {
  const port = await freePort();
  const PATH = process.env
    .PATH!.split(":")
    .filter((dir) => !dir.includes("/bun-node-"))
    .join(":");
  const server = spawn("bun", ["run", "preview", "--port", String(port)], {
    cwd: root,
    detached: true,
    env: { ...process.env, PATH, NODE: undefined },
  });
  let output = "";
  server.stdout.on("data", (chunk) => (output += chunk));
  server.stderr.on("data", (chunk) => (output += chunk));
  const exited = new Promise<null>((resolve) => server.on("exit", () => resolve(null)));
  try {
    let status: number | null = null;
    for (let attempt = 0; attempt < 60 && status === null; attempt++) {
      status = await Promise.race([
        exited,
        fetch(`http://127.0.0.1:${port}/slides/catalog/print/`).then(
          (response) => response.status,
          () => new Promise<null>((resolve) => setTimeout(() => resolve(null), 250)),
        ),
      ]);
      if (server.exitCode !== null) break;
    }
    expect(status, output).toBe(200);
  } finally {
    if (server.exitCode === null) process.kill(-server.pid!);
  }
}, 30_000);
