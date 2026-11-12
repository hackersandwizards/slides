import type { Browser } from "puppeteer";

/** A fixed limit stretched by the gate's load factor, as scaffolding's docs/gate.md says. */
export const limit = (ms: number) =>
  (ms * (Number(process.env.SCAFFOLDING_TEST_TIMEOUT_MS) || 5000)) / 5000;

/** A tab whose waits and navigations default to puppeteer's 30 s, stretched the same way. */
export async function newPage(browser: Browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(limit(30_000));
  return page;
}
