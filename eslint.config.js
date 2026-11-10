import shared from "@hackersandwizards/scaffolding/eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...shared,
  {
    // The engine's hooks carry a keyboard-consumption protocol; a stale closure there shows up as
    // a deck that stops advancing mid-talk, so the full recommended set stays on.
    files: ["components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
  },
];
