import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The counts `slides-usage` writes, summed over every file `SLIDES_USAGE` names. */
export interface Usage {
  files: string[];
  decks: number;
  slides: number;
  entries: Record<string, number>;
}

/** Reads and sums the counts files of a comma-separated list, each path read from the checkout:
 *  a file missing or not in slides-usage's shape stops the dev server, never shows as no count. */
export function readUsage(list: string): Usage {
  const files = list
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  const usage: Usage = { files, decks: 0, slides: 0, entries: {} };
  for (const file of files) {
    const read = JSON.parse(readFileSync(resolve(file), "utf8"));
    const { decks, slides, entries } = read ?? {};
    if (
      typeof decks !== "number" ||
      typeof slides !== "number" ||
      typeof entries !== "object" ||
      !entries ||
      !Object.values(entries).every((n) => typeof n === "number")
    )
      throw new Error(`SLIDES_USAGE: ${file} holds no slides-usage output`);
    usage.decks += decks;
    usage.slides += slides;
    for (const [id, n] of Object.entries(entries as Record<string, number>))
      usage.entries[id] = (usage.entries[id] ?? 0) + n;
  }
  return usage;
}
