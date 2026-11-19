declare module "@hackersandwizards/scaffolding/vitest" {
  import type { ViteUserConfig } from "vitest/config";

  const base: ViteUserConfig & { test: { hookTimeout: number } };
  export default base;
}
