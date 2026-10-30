import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "coverage/**", ".claude/**", ".githooks/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // The engine's hooks carry a keyboard-consumption protocol; a stale closure there shows up as
    // a deck that stops advancing mid-talk, so the full recommended set stays on.
    files: ["components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
  },
  {
    // An `it("...", () => {})` passes, so a gutted test reads as a covered one.
    files: ["test/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name=/^(it|test)$/] > :matches(ArrowFunctionExpression, FunctionExpression)[body.body.length=0]",
          message: "An empty test body passes. Write the assertion or delete the test.",
        },
      ],
    },
  },
  prettier,
);
