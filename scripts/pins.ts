#!/usr/bin/env bun
// Fails a consumer whose package.json pins no brand: the brand peer is optional, so bun installs
// such a consumer without a word. That the install matches each pin is scaffolding's: the gate's
// `bun install --frozen-lockfile` and its coupling step.
//
//   slides-pins        (in the consumer's root; exit 1 on a missing brand pin)

import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (!{ ...pkg.dependencies, ...pkg.devDependencies }["@hackersandwizards/brand"]) {
  console.error(
    "slides-pins: @hackersandwizards/brand: package.json pins no version; pin it as the slides README shows",
  );
  process.exit(1);
}
