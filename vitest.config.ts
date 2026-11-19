import base from "@hackersandwizards/scaffolding/vitest";
import react from "@vitejs/plugin-react";
import { mergeConfig, type ViteUserConfig } from "vitest/config";

export default mergeConfig(base, {
  plugins: [react()],
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    hookTimeout: 2 * base.test.hookTimeout,
  },
} satisfies ViteUserConfig) as ViteUserConfig;
