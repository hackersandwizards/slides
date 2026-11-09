import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const engine = join(import.meta.dirname, "..");
/** A string literal, kept, or a comment, dropped: a comment marker inside a string stays text. */
export const STRINGS_OR_COMMENTS =
  /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

/** Vite's `optimizeDeps` for a consumer that serves the engine as source, as an Astro app's
 *  `vite.optimizeDeps`:
 *  - The engine itself is excluded: pre-bundled, `lib/navigate.ts` splits from the `.tsx`
 *    components that import it by relative path, and the arrows move the URL but not the slide.
 *  - Every package its components and `lib/` import at run time (static, side-effect, re-exported
 *    or dynamic) is named, since Vite does not scan an excluded package. Unnamed, they are found
 *    on an island's first render and re-run the optimizer (a 504 before Vite 8) or, on Vite 8,
 *    load unbundled file by file (578 requests for a deck's first slide in talks, 146 with this
 *    list). React's client and both JSX runtimes come with them.
 *  Read from the installed engine's source, so the list follows each release; `importsOf` names
 *  what stays out. */
export function slidesOptimizeDeps(): { exclude: string[]; include: string[] } {
  const found = new Set([
    "react-dom",
    "react-dom/client",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
  ]);
  for (const dir of ["components", "lib"])
    for (const file of readdirSync(join(engine, dir), { recursive: true, encoding: "utf8" }))
      if (/\.tsx?$/.test(file))
        for (const spec of importsOf(readFileSync(join(engine, dir, file), "utf8")))
          found.add(spec);
  return { exclude: ["@hackersandwizards/slides"], include: [...found].sort() };
}

/** The packages a source imports at run time, static, side-effect, re-exported or dynamic. Left
 *  out: Node built-ins, `next/*` (the Next adapter), `prettier` (the edit mode's server), the engine
 *  itself, and JSON, CSS or `?url` files, which Vite cannot pre-bundle and warns about on every start. */
export function importsOf(source: string): string[] {
  return [
    ...source
      .replace(STRINGS_OR_COMMENTS, (_, string?: string) => string ?? "")
      .matchAll(
        /^\s*(?:import|export)\s+(?!type\b)(?:[^;"]*?\sfrom\s+)?"([^".][^"]*)"|\bimport\(\s*"([^".][^"]*)"\s*\)/gm,
      ),
  ]
    .map(([, from, dynamic]) => from ?? dynamic)
    .filter(
      (spec) =>
        !/^(node:|next\/|prettier$|@hackersandwizards\/slides)|\.(json|css)$|\?url/.test(spec),
    );
}
