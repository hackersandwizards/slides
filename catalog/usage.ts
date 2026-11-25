import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The counts `slides-usage` writes, summed over every file `SLIDES_USAGE` names. */
export interface Usage {
  files: string[];
  decks: number;
  slides: number;
  entries: Record<string, number>;
}

function isUsageEntryCounts(value: unknown): value is Usage["entries"] {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((count: unknown) => typeof count === "number")
  );
}

function readUsageFile(file: string): Omit<Usage, "files"> {
  const read: unknown = JSON.parse(readFileSync(resolve(file), "utf8"));
  if (
    typeof read === "object" &&
    read !== null &&
    "decks" in read &&
    "slides" in read &&
    "entries" in read &&
    typeof read.decks === "number" &&
    typeof read.slides === "number" &&
    isUsageEntryCounts(read.entries)
  ) {
    return { decks: read.decks, slides: read.slides, entries: read.entries };
  }
  throw new Error(`SLIDES_USAGE: ${file} holds no slides-usage output`);
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
    const { decks, slides, entries } = readUsageFile(file);
    totalDecks += decks;
    totalSlides += slides;
    for (const [id, n] of Object.entries(entries)) {
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
