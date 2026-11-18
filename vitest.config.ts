import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const timeout = Number(process.env.SCAFFOLDING_TEST_TIMEOUT_MS) || 5000;

export default defineConfig({
  plugins: [react()],
  // Keep dependency asset URLs under Stryker's sandbox root through its node_modules symlink.
  resolve: { preserveSymlinks: Boolean(process.env.STRYKER_MUTATOR_WORKER) },
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    // The gate stretches the per-test limit with the machine's load; 5 s when idle, hooks twice it.
    testTimeout: timeout,
    hookTimeout: 2 * timeout,
  },
});
