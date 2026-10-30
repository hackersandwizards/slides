import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    // jsdom: the slide components render through @testing-library/react, and the canvas and
    // observer stubs they need are jsdom's.
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
  },
});
