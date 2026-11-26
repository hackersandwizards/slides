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
  ["closed target", new TargetCloseError("Target closed"), false, true],
  ["closed connection", new ConnectionClosedError("Connection closed."), false, false],
  [
    "rejected close command",
    new ProtocolError("Protocol error (Target.closeTarget): No target with given id found"),
    true,
    true,
  ],
  [
    "timed-out close command",
    new ProtocolError("Target.closeTarget timed out. Increase the protocol timeout."),
    false,
    true,
  ],
  ["missing connection after tab close", new Error(missingConnection), true, true],
  ["missing connection after disconnect", new Error(missingConnection), false, false],
])("keeps the render report after a %s", async (_, error, closed, connected) => {
  const report = await checkWithCloseError(error, closed, connected);
  expect(report).toEqual(["FAIL deck did not render: render crashed"]);
});

it.each([
  ["an open tab", new TypeError("unexpected cleanup error"), false, true],
  ["a closed tab", new TypeError("unexpected cleanup error"), true, true],
  ["a disconnected browser", new TypeError("unexpected cleanup error"), false, false],
  [
    "an unrelated protocol failure",
    new ProtocolError("Protocol error (Page.navigate): Invalid URL"),
    false,
    true,
  ],
  ["a connection assertion with a live tab", new Error(missingConnection), false, true],
])("propagates the original unexpected close error for %s", async (_, error, closed, connected) => {
  const observed = await checkWithCloseError(error, closed, connected).catch(
    (caught: unknown) => caught,
  );
  expect(observed).toBe(error);
});
