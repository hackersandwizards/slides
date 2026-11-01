#!/usr/bin/env bun
// The install guard a consumer runs in its own gate: fails when node_modules holds a different
// version of an `@hackersandwizards/*` package than package.json pins with `#v<version>`. A stale
// install renders with the old engine or brand while every file reads the new pin: documents once
// had brand 0.21.6 installed against a v0.24.4 pin, and its list markers vanished.
//
//   slides-pins        (in the consumer's root; exit 1 on any mismatch, and on a pin without a tag)

import { readFileSync } from "node:fs";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const pkg = read("package.json");
const found: string[] = [];
for (const [name, spec] of Object.entries<string>({
  ...pkg.dependencies,
  ...pkg.devDependencies,
})) {
  if (!name.startsWith("@hackersandwizards/")) continue;
  const pinned = /#v([^#]+)$/.exec(spec)?.[1];
  let installed = "nothing";
  try {
    installed = read(`node_modules/${name}/package.json`).version;
  } catch {}
  if (!pinned) found.push(`${name}: "${spec}" pins no tag #v<version>`);
  else if (installed !== pinned)
    found.push(
      `${name}: package.json pins v${pinned}, node_modules holds ${installed}; run bun install`,
    );
}
for (const line of found) console.error(`slides-pins: ${line}`);
process.exit(found.length ? 1 : 0);
