import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ConnectionClosedError, ProtocolError, type Page } from "puppeteer";
import { expect, it } from "vitest";
import { checkDeckDensity } from "../scripts/density";

const url = "https://example.com/deck/print";
const missingConnection = "Connection closed. Most likely the page has been closed.";

class TargetCloseError extends ProtocolError {}

function checkWithCloseError(error: Error, closed: boolean, connected: boolean) {
  const page: Pick<Page, "setViewport" | "close" | "isClosed"> = {
    setViewport: () => Promise.reject(new Error("render crashed")),
    close: () => Promise.reject(error),
    isClosed: () => closed,
  };
  return checkDeckDensity({ connected, newPage: () => Promise.resolve(page as Page) }, url);
}

it.each([
  {
    name: "closed target",
    error: new TargetCloseError("Target closed"),
    closed: false,
    connected: true,
  },
  {
    name: "closed connection",
    error: new ConnectionClosedError("Connection closed."),
    closed: false,
    connected: false,
  },
  {
    name: "rejected close command",
    error: new ProtocolError("Protocol error (Target.closeTarget): No target with given id found"),
    closed: true,
    connected: true,
  },
  {
    name: "timed-out close command",
    error: new ProtocolError("Target.closeTarget timed out. Increase the protocol timeout."),
    closed: false,
    connected: true,
  },
  {
    name: "missing connection after tab close",
    error: new Error(missingConnection),
    closed: true,
    connected: true,
  },
  {
    name: "missing connection after disconnect",
    error: new Error(missingConnection),
    closed: false,
    connected: false,
  },
])("keeps the render report after a $name", async ({ error, closed, connected }) => {
  const report = await checkWithCloseError(error, closed, connected);
  expect(report).toEqual(["FAIL deck did not render: render crashed"]);
});

it.each([
  {
    name: "an open tab",
    error: new TypeError("unexpected cleanup error"),
    closed: false,
    connected: true,
  },
  {
    name: "a closed tab",
    error: new TypeError("unexpected cleanup error"),
    closed: true,
    connected: true,
  },
  {
    name: "a disconnected browser",
    error: new TypeError("unexpected cleanup error"),
    closed: false,
    connected: false,
  },
  {
    name: "an unrelated protocol failure",
    error: new ProtocolError("Protocol error (Page.navigate): Invalid URL"),
    closed: false,
    connected: true,
  },
  {
    name: "a connection assertion with a live tab",
    error: new Error(missingConnection),
    closed: false,
    connected: true,
  },
])(
  "propagates the original unexpected close error for $name",
  async ({ error, closed, connected }) => {
    const observed = await checkWithCloseError(error, closed, connected).catch(
      (caught: unknown) => caught,
    );
    expect(observed).toBe(error);
  },
);

it.each([
  { args: [] },
  { args: ["--site", "dist", "--serve", "preview", "/deck/print"] },
  { args: ["--site", "dist", url] },
])("explains which print route and server arguments the check needs (%j)", ({ args }) => {
  const run = spawnSync("bun", [join(__dirname, "../scripts/density.ts"), ...args], {
    encoding: "utf8",
  });
  expect(run.status).toBe(2);
  expect(run.stderr.split("\n")[0]).toBe(
    'slides-density: The check needs at least one print route and must know which server to measure. Pass absolute print URLs, or use one of --site <dir> and --serve "<command>" with print paths.',
  );
});
