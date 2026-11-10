import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { expect, it, vi } from "vitest";

const file = join(mkdtempSync(join(tmpdir(), "deck-edit-race-")), "deck.ts");
// An editor saves the deck while the endpoint formats its edit.
vi.mock("prettier", async (original) => {
  const prettier = await original<typeof import("prettier")>();
  return {
    ...prettier,
    check: async (...args: Parameters<typeof prettier.check>) => {
      writeFileSync(file, 'export const deck = { title: "Saved in the editor" };\n');
      return prettier.check(...args);
    },
  };
});
const { deckEditHandler } = await import("../lib/deck-edit-server");

// F32: the endpoint read, formatted and wrote with no look at the file in between.
it("refuses to write over a deck file that changed while it worked", async () => {
  writeFileSync(file, 'export const deck = { title: "Agenda" };\n');
  const req = Object.assign(
    Readable.from([Buffer.from(JSON.stringify({ deck: "/deck", from: "Agenda", to: "Plan" }))]),
    {
      method: "POST",
      headers: { host: "127.0.0.1:4324", "content-type": "application/json" },
      socket: { localPort: 4324, remoteAddress: "127.0.0.1" },
    },
  ) as unknown as IncomingMessage;
  const status = await new Promise<number>((done) => {
    const res = { statusCode: 0, setHeader() {}, end: () => done(res.statusCode) };
    deckEditHandler(() => file)(req, res as unknown as ServerResponse);
  });
  expect(status).toBe(409);
  expect(readFileSync(file, "utf8")).toContain("Saved in the editor");
});
