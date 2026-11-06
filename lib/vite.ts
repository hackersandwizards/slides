import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const engine = join(import.meta.dirname, "..");

/** Vite's `optimizeDeps` for a consumer that serves the engine as source, as an Astro app's
 *  `vite.optimizeDeps`:
 *  - The engine itself is excluded: pre-bundled, `lib/navigate.ts` splits from the `.tsx`
 *    components that import it by relative path, and the arrows move the URL but not the slide.
 *  - Every package its components and `lib/` import at run time (static, side-effect, re-exported
 *    or dynamic) is named, since Vite does not scan
 *    an excluded package: found on an island's first render instead, they re-run the optimizer
 *    and the island fails to hydrate with a 504. React's client and both JSX runtimes come with them.
 *  Read from the installed engine's source, so the list follows each release. Node built-ins,
 *  `next/*` (the Next adapter) and `prettier` (the edit mode's server) stay out. */
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
        for (const [, from, dynamic] of readFileSync(join(engine, dir, file), "utf8")
          .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")
          .matchAll(
            /^\s*(?:import|export)\s+(?!type\b)(?:[^;"]*?\sfrom\s+)?"([^".][^"]*)"|\bimport\(\s*"([^".][^"]*)"\s*\)/gm,
          )) {
          const spec = from ?? dynamic;
          if (!/^(node:|next\/|prettier$|@hackersandwizards\/slides)/.test(spec)) found.add(spec);
        }
  return { exclude: ["@hackersandwizards/slides"], include: [...found].sort() };
}
