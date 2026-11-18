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
    const read: unknown = JSON.parse(readFileSync(resolve(file), "utf8"));
    const invalid = () => new Error(`SLIDES_USAGE: ${file} holds no slides-usage output`);
    if (
      typeof read !== "object" ||
      !read ||
      !("decks" in read && "slides" in read && "entries" in read)
    )
      throw invalid();
    const { decks, slides, entries } = read;
    if (
      typeof decks !== "number" ||
      typeof slides !== "number" ||
      typeof entries !== "object" ||
      !entries
    )
      throw invalid();
    usage.decks += decks;
    usage.slides += slides;
    const counts: [string, unknown][] = Object.entries(entries);
    for (const [id, n] of counts) {
      if (typeof n !== "number") throw invalid();
      usage.entries[id] = (usage.entries[id] ?? 0) + n;
    }
  }
  return usage;
}
