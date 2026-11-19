import base from "@hackersandwizards/scaffolding/stryker";

export default {
  ...base,
  mutate: [
    "lib/{reveal-state,use-carousel,use-progressive-reveal,use-slide-keyboard}.ts",
    "lib/print-context.tsx",
  ],
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { ...base.vitest, configFile: "vitest.mutation.config.ts", pool: "threads" },
};
