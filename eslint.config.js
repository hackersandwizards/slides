import shared from "@hackersandwizards/scaffolding/eslint/astro";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: [".stryker-tmp/**"] },
  ...shared,
  {
    // The native React plugin has no equivalents for the compiler config and gating rules.
    files: ["components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/config": "error",
      "react-hooks/gating": "error",
    },
  },
];
