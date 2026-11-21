import base from "@hackersandwizards/scaffolding/stryker";

export default {
  ...base,
  incremental: false,
  mutate: [
    "lib/{reveal-state,use-carousel,use-progressive-reveal,use-slide-keyboard}.ts",
    "lib/print-context.tsx",
    "catalog/brand-urls.ts",
    "catalog/usage.ts",
    "components/slides/ChartPlots.tsx",
    "lib/code-highlight.tsx",
    "lib/deck-edit.ts",
    "lib/logo.ts",
    "lib/markdown.tsx",
    "lib/presenter-sync.ts",
    "lib/section-styles.ts",
    "lib/slide-utils.ts",
    "lib/vite.ts",
    "scripts/pptx-text.ts",
    "scripts/usage.ts",
  ],
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { ...base.vitest, configFile: "vitest.mutation.config.ts", pool: "threads" },
};
