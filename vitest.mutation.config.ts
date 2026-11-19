import config from "./vitest.config";

export default {
  ...config,
  test: {
    ...config.test,
    include: ["test/use-{carousel,progressive-reveal,slide-keyboard}.test.tsx"],
  },
};
