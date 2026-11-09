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
  const running = () => server.exitCode === null && server.signalCode === null;
  try {
    let status: number | undefined;
    for (const deadline = Date.now() + 20_000; !status && running() && Date.now() < deadline;)
      status = await fetch(`http://127.0.0.1:${port}/slides/catalog/print/`, {
        signal: AbortSignal.timeout(2_000),
      }).then(
        (response) => response.status,
        () => new Promise<undefined>((resolve) => setTimeout(resolve, 250)),
      );
    expect(status, output).toBe(200);
  } finally {
    if (running()) process.kill(-server.pid!);
  }
}, 30_000);
