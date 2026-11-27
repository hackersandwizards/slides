import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterAll, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "deck-edit-race-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
let onCheck = () => {};
vi.mock("prettier", async (original) => {
  const prettier = await original<typeof import("prettier")>();
  return {
    ...prettier,
    check: async (...args: Parameters<typeof prettier.check>) => {
      onCheck();
      return prettier.check(...args);
    },
  };
});
const { deckEditHandler } = await import("../lib/deck-edit-server");

function sendEdit(target: string) {
  const req = Object.assign(
    Readable.from([Buffer.from(JSON.stringify({ deck: "/deck", from: "Agenda", to: "Plan" }))]),
    {
      method: "POST",
      headers: { host: "127.0.0.1:4324", "content-type": "application/json" },
      socket: { localPort: 4324, remoteAddress: "127.0.0.1" },
    },
  ) as unknown as IncomingMessage;
  return new Promise<{ status: number; payload: Record<string, unknown> }>((done) => {
    const res = {
      statusCode: 0,
      setHeader() {},
      end(text: string) {
        done({ status: res.statusCode, payload: JSON.parse(text) as Record<string, unknown> });
      },
    };
    deckEditHandler(() => target)(req, res as unknown as ServerResponse);
  });
}

// F32: the endpoint read, formatted and wrote with no look at the file in between.
it("refuses to write over a deck file that changed while it worked", async () => {
  const file = join(dir, "deck.ts");
  writeFileSync(file, 'export const deck = { title: "Agenda" };\n');
  onCheck = () => writeFileSync(file, 'export const deck = { title: "Saved in the editor" };\n');
  const { status } = await sendEdit(file);
  expect(status).toBe(409);
  expect(readFileSync(file, "utf8")).toContain("Saved in the editor");
});

it("answers 500 when the re-read before writing hits an unexpected fs error", async () => {
  const target = join(dir, "replaced.ts");
  writeFileSync(target, 'export const deck = { title: "Agenda" };\n');
  onCheck = () => {
    rmSync(target);
    mkdirSync(target);
  };
  const { status, payload } = await sendEdit(target);
  expect(status).toBe(500);
  expect(String(payload.error)).toMatch(/EISDIR/);
});
