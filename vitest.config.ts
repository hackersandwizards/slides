import assert from "node:assert/strict";
import base from "@hackersandwizards/scaffolding/vitest";
import react from "@vitejs/plugin-react";
import { mergeConfig, type ViteUserConfig } from "vitest/config";

const hookTimeout = base.test?.hookTimeout;
assert(typeof hookTimeout === "number", "The shared Vitest config must set hookTimeout");

export default mergeConfig(base, {
  plugins: [react()],
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    hookTimeout: 2 * hookTimeout,
  },
} satisfies ViteUserConfig) as ViteUserConfig;
