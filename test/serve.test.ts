import { statSync, utimesSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { handle } from "../scripts/serve";

let server: Server;
let base: string;
beforeAll(async () => {
  server = createServer(handle);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((done) => server.close(() => done())));

it("answers a malformed escape with 400 and keeps serving", async () => {
  expect((await fetch(`${base}/%E0%A4%A`)).status).toBe(400);
  expect((await fetch(`${base}/specimen/`)).status).toBe(200);
});

// A NUL byte makes statSync throw even with throwIfNoEntry: false.
it("answers a NUL byte with 400 and keeps serving", async () => {
  expect((await fetch(`${base}/%00`)).status).toBe(400);
  expect((await fetch(`${base}/specimen/`)).status).toBe(200);
});

it("serves nothing outside the checkout", async () => {
  expect((await fetch(`${base}/${"..%2f".repeat(20)}etc%2fpasswd`)).status).toBe(404);
});

it("writes the specimen again only after a file in the checkout changed", async () => {
  const page = join(import.meta.dirname, "../specimen/index.html");
  await fetch(`${base}/specimen/`);
  const written = statSync(page).mtimeMs;
  await fetch(`${base}/specimen/`);
  expect(statSync(page).mtimeMs).toBe(written);
  const now = new Date();
  utimesSync(import.meta.filename, now, now);
  await new Promise((done) => setTimeout(done, 500));
  await fetch(`${base}/specimen/`);
  expect(statSync(page).mtimeMs).toBeGreaterThan(written);
});
