import { createServer, type Server } from "node:http";
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
