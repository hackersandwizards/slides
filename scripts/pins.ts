#!/usr/bin/env bun
// The brand peer is optional, so bun installs a consumer that pins no brand without a word; that
// the install matches a pin is scaffolding's frozen-lockfile install and coupling step.

import { readFileSync } from "node:fs";

// The README names the same version; test/pins.test.ts holds them together.
const MINIMUM = "2.14.0";
const BRAND = "@hackersandwizards/brand";

function fail(message: string): never {
  console.error(`slides-pins: ${BRAND}: ${message}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const pin: string | undefined = { ...pkg.dependencies, ...pkg.devDependencies }[BRAND];
if (!pin) fail("package.json pins no version; pin it as the slides README shows");

const version = /(?:#v?|^(?:[\^~]|>=)?)(\d+\.\d+\.\d+)$/.exec(pin)?.[1];
if (!version) fail(`${pin} names no version; pin a tag as the slides README shows`);
if (version.localeCompare(MINIMUM, "en", { numeric: true }) < 0)
  fail(`${pin} is below the minimum this engine needs, v${MINIMUM}: raise the pin`);
