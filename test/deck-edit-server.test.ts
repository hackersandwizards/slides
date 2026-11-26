import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { deckEditHandler } from "../lib/deck-edit-server";

const dir = mkdtempSync(join(tmpdir(), "deck-edit-server-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const files: Record<string, string> = {
  "/deck": "deck.ts",
  "/missing": "missing.ts",
  "/dir": "subdir",
};
const deckFile = (deck: unknown) =>
  typeof deck === "string" && deck in files ? join(dir, files[deck]) : null;
const handle = deckEditHandler(deckFile);

type MockRequest = Readable & {
  method: string;
  headers: Record<string, string>;
  socket: { localPort: number; remoteAddress: string };
};

function localRequest(body: Readable | string, headers: Record<string, string> = {}): MockRequest {
  return Object.assign(typeof body === "string" ? Readable.from([Buffer.from(body)]) : body, {
    method: "POST",
    headers: { host: "127.0.0.1:4324", "content-type": "application/json", ...headers },
    socket: { localPort: 4324, remoteAddress: "127.0.0.1" },
  });
}

/** One request through the handler; resolves with the status and parsed body once it answers. */
function send(req: MockRequest): Promise<{ status: number; payload: Record<string, unknown> }> {
  return new Promise((done) => {
    const res = {
      statusCode: 0,
      setHeader() {},
      end(text: string) {
        done({ status: res.statusCode, payload: JSON.parse(text) as Record<string, unknown> });
      },
    };
    handle(req as unknown as IncomingMessage, res as unknown as ServerResponse);
  });
}

const post = (body: Readable | string, headers?: Record<string, string>) =>
  send(localRequest(body, headers));

const deck = (source: string) => writeFileSync(join(dir, "deck.ts"), source);

describe("deckEditHandler", () => {
  it("refuses a page under another name, as a DNS rebinding page arrives", async () => {
    expect((await post("{}", { host: "evil.example:4324" })).status).toBe(403);
    expect((await post("{}", { origin: "http://evil.example" })).status).toBe(403);
  });

  // Headers are the sender's to choose: a client on the network that sends a loopback Host, or
  // comes through a local proxy, is still another machine (F04).
  it("refuses a sender on another machine, directly or through a local proxy", async () => {
    deck('export const deck = { title: "Agenda" };\n');
    const edit = JSON.stringify({ deck: "/deck", texts: ["Agenda"] });
    expect((await post(edit)).status).toBe(200);
    const remote = localRequest(edit);
    remote.socket.remoteAddress = "192.168.1.20";
    expect((await send(remote)).status).toBe(403);
    expect((await post(edit, { "x-forwarded-for": "192.168.1.20" })).status).toBe(403);
    const mapped = localRequest(edit);
    mapped.socket.remoteAddress = "::ffff:127.0.0.1";
    expect((await send(mapped)).status).toBe(200);
  });

  it("takes POST JSON only", async () => {
    const get = localRequest("{}");
    get.method = "GET";
    expect((await send(get)).status).toBe(405);
    expect((await post("{}", { "content-type": "text/plain" })).status).toBe(405);
  });

  it("answers 400, never 500, to a body that is no JSON object", async () => {
    for (const body of ["not json", "null", "42", '"deck"'])
      expect(await post(body)).toEqual({ status: 400, payload: { error: "Bad JSON." } });
  });

  it("answers 400 to a body read that fails, leaving no unhandled rejection", async () => {
    const failing = new Readable({
      read() {
        this.destroy(new Error("aborted"));
      },
    });
    expect(await post(failing)).toEqual({ status: 400, payload: { error: "Bad JSON." } });
  });

  it("refuses a deck the host does not own, a missing deck file and a bad edit", async () => {
    expect((await post(JSON.stringify({ deck: "/../etc", texts: [] }))).status).toBe(400);
    expect((await post(JSON.stringify({ deck: "/missing", texts: [] }))).status).toBe(404);
    deck('export const deck = { title: "Agenda" };\n');
    expect((await post(JSON.stringify({ deck: "/deck", from: 1, to: 2 }))).status).toBe(400);
  });

  it("resolves a clicked text and writes the edit, formatted as before", async () => {
    deck('export const deck = { title: "Agenda" };\n');
    expect(await post(JSON.stringify({ deck: "/deck", texts: ["Agenda"] }))).toEqual({
      status: 200,
      payload: { value: "Agenda", index: 0 },
    });
    expect(await post(JSON.stringify({ deck: "/deck", from: "Agenda", to: "Plan" }))).toEqual({
      status: 200,
      payload: { ok: true },
    });
    expect(readFileSync(join(dir, "deck.ts"), "utf8")).toBe(
      'export const deck = { title: "Plan" };\n',
    );
    expect((await post(JSON.stringify({ deck: "/deck", from: "Agenda", to: "X" }))).status).toBe(
      409,
    );
  });

  it("answers 500 with the error when the file work fails", async () => {
    deck('export const deck = { title: "Agenda" ');
    const { status, payload } = await post(
      JSON.stringify({ deck: "/deck", from: "Agenda", to: "Plan" }),
    );
    expect(status).toBe(500);
    expect(String(payload.error)).toMatch(/error/i);
  });

  it("answers 409 when the clicked text cannot be resolved", async () => {
    deck('export const deck={title:"Agenda"};\n');
    expect((await post(JSON.stringify({ deck: "/deck", texts: ["Missing"] }))).status).toBe(409);
  });

  it("leaves an unformatted deck file unformatted after writing an edit", async () => {
    deck('export const deck={title:"Agenda"};\n');
    expect(await post(JSON.stringify({ deck: "/deck", from: "Agenda", to: "Plan" }))).toEqual({
      status: 200,
      payload: { ok: true },
    });
    expect(readFileSync(join(dir, "deck.ts"), "utf8")).toBe('export const deck={title:"Plan"};\n');
  });

  it("answers 500 when reading the deck path fails with an unexpected fs error", async () => {
    mkdirSync(join(dir, "subdir"), { recursive: true });
    const { status, payload } = await post(JSON.stringify({ deck: "/dir", texts: ["Agenda"] }));
    expect(status).toBe(500);
    expect(String(payload.error)).toMatch(/EISDIR/);
  });
});
