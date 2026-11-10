import shared from "@hackersandwizards/scaffolding/eslint";
import reactHooks from "eslint-plugin-react-hooks";

// The shared config's rule for test files, kept whole: a second `no-restricted-syntax` replaces it.
const tests = shared.find((config) => config.rules?.["no-restricted-syntax"]);

export default [
  ...shared,
  {
    // The engine's hooks carry a keyboard-consumption protocol; a stale closure there shows up as
    // a deck that stops advancing mid-talk, so the full recommended set stays on.
    files: ["components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
  },
  {
    // bun 1.4.4's expect().rejects waits in a nested event loop that breaks puppeteer's DevTools
    // socket, so later tests on a shared browser fail with "Target closed" (shown in brand and
    // documents). The tests here run vitest's expect, refused too so the pattern never returns.
    files: tests.files,
    rules: {
      "no-restricted-syntax": [
        ...tests.rules["no-restricted-syntax"],
        {
          selector:
            "MemberExpression[property.name=/^(rejects|resolves)$/]:matches([object.callee.name='expect'], [object.object.callee.name='expect'])",
          message:
            "expect().rejects and .resolves may wait in a nested event loop under bun; await rejection() from test/rejection.ts, or await the promise, then expect what it settled to.",
        },
      ],
    },
  },
];
