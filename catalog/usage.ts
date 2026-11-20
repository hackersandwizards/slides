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
  let totalDecks = 0;
  let totalSlides = 0;
  const totals = new Map<string, number>();
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
      !entries ||
      Array.isArray(entries)
    )
      throw invalid();
    totalDecks += decks;
    totalSlides += slides;
    const counts: [string, unknown][] = Object.entries(entries);
    for (const [id, n] of counts) {
      if (typeof n !== "number") throw invalid();
      totals.set(id, (totals.get(id) ?? 0) + n);
    }
  }
  return {
    files,
    decks: totalDecks,
    slides: totalSlides,
    entries: Object.fromEntries(totals),
  };
}
