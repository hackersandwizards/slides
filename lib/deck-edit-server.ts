import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { check, format, resolveConfig } from "prettier";
import { fromLocalPage, fromThisMachine, replace, resolve } from "./deck-edit";

type HttpAnswer = [status: number, payload: object];

function sendJson(res: ServerResponse, status: number, payload: object) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function requestRejection(req: IncomingMessage): HttpAnswer | null {
  const { host, origin } = req.headers;
  const forwarded = req.headers["x-forwarded-for"];
  if (
    !fromThisMachine(req.socket.remoteAddress, [forwarded].flat().join(",") || undefined) ||
    !fromLocalPage(host ?? null, origin ?? null, String(req.socket.localPort))
  )
    return [403, { error: "Local requests only." }];
  // JSON only: a cross-site form or beacon cannot set this type without a preflight.
  if (req.method !== "POST" || !req.headers["content-type"]?.startsWith("application/json"))
    return [405, { error: "POST JSON only." }];
  return null;
}

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

async function readExistingFile(file: string): Promise<string | null> {
  if (!existsSync(file)) return null;
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

async function writeFormattedEdit(
  file: string,
  source: string,
  nextSource: string,
): Promise<HttpAnswer> {
  // The gate runs `prettier --check`: a file that passed it before the edit passes it after.
  const options = { ...(await resolveConfig(file)), filepath: file };
  const formatted = await check(source, options);
  const out = formatted ? await format(nextSource, options) : nextSource;
  // An editor's save between the read and this write would be lost under it.
  if ((await readExistingFile(file)) !== source)
    return [409, { error: "The deck file changed meanwhile. Click the text again." }];
  await writeFile(file, out);
  return [200, { ok: true }];
}

async function applyDeckEdit(
  deckFile: (deck: unknown) => string | null,
  body: Record<string, unknown>,
): Promise<HttpAnswer> {
  const file = deckFile(body.deck);
  if (!file) return [400, { error: "Unknown deck." }];
  const source = await readExistingFile(file);
  if (source === null) return [404, { error: "Deck file not found." }];
  if (Array.isArray(body.texts)) {
    const result = resolve(
      source,
      body.texts.filter((t): t is string => typeof t === "string"),
    );
    return ["error" in result ? 409 : 200, result];
  }
  if (typeof body.from !== "string" || typeof body.to !== "string")
    return [400, { error: "Bad request." }];
  const result = replace(source, body.from, body.to);
  if ("error" in result) return [409, result];
  return writeFormattedEdit(file, source, result.source);
}

/** The slide edit mode's write endpoint (`lib/deck-edit-mode`) as a Node request handler, which a
 *  host mounts on its dev server only, at `/api/deck-edit` (Astro: `server.middlewares.use` in
 *  `astro:server:setup`, which never runs for a build). POST JSON: `{ deck, texts }` answers
 *  `{ value, index }`, `{ deck, from, to }` answers `{ ok }`, and every refusal is `{ error }`.
 *  `deck` is the deck's base path, never a file path: `deckFile` maps it to the file, or to null
 *  for anything outside the host's decks. */
export function deckEditHandler(
  deckFile: (deck: unknown) => string | null,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    const rejected = requestRejection(req);
    if (rejected) return sendJson(res, rejected[0], rejected[1]);
    // A failed body read and a body that is no JSON object both answer 400; only the file work
    // answers 500.
    void readBody(req)
      .then((raw) => JSON.parse(raw) as unknown)
      .then(
        (body) =>
          body && typeof body === "object"
            ? applyDeckEdit(deckFile, body as Record<string, unknown>).then(
                ([status, payload]) => sendJson(res, status, payload),
                (error: unknown) => sendJson(res, 500, { error: String(error) }),
              )
            : sendJson(res, 400, { error: "Bad JSON." }),
        () => sendJson(res, 400, { error: "Bad JSON." }),
      );
  };
}

/** Decoded once at the end: a chunk decoded on its own splits a multi-byte character at its edge
 *  into two U+FFFD, which the edit would write into the deck. */
async function readBody(req: AsyncIterable<Buffer>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
