import { anchorSlug } from "../lib/catalog-classification";

export const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

export function createPrintAnchors() {
  const ids = new Set<string>();
  return (name: string, prefix = "") => {
    const base = prefix + anchorSlug(name);
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };
}
