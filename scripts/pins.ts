#!/usr/bin/env bun
// The brand peer is optional, so bun installs a consumer that pins no brand without a word; that
// the install matches a pin is scaffolding's frozen-lockfile install and coupling step.

import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (!{ ...pkg.dependencies, ...pkg.devDependencies }["@hackersandwizards/brand"]) {
  console.error(
    "slides-pins: @hackersandwizards/brand: package.json pins no version; pin it as the slides README shows",
  );
  process.exit(1);
}
