import config from "./vitest.config";

export default {
  ...config,
  test: {
    ...config.test,
    server: { deps: { inline: ["@hackersandwizards/scaffolding", "@fast-check/vitest"] } },
    include: [
      "test/use-{carousel,progressive-reveal,slide-keyboard}.test.tsx",
      "test/**/*.prop.test.ts",
      "test/{brand-urls,deck-edit,vite}.test.ts",
    ],
  },
};
