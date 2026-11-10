import { join } from "node:path";
import { serveDir } from "../../scripts/serve-dir";

/** Serves dist/ under the `/slides` base, for the pages that hydrate. */
export const serveDist = () => serveDir(join(import.meta.dirname, "..", "..", "dist"), "/slides");

export type Served = Awaited<ReturnType<typeof serveDist>>;
