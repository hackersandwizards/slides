import type { ReactNode } from "react";
import { createHighlighterCoreSync, type ThemeRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import markdown from "shiki/langs/markdown.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";
import codeTheme from "@hackersandwizards/brand/code-theme.json";

// Synchronous, with the JavaScript regex engine, so a slide renders its code in the same pass on the
// server, in the browser and in the print route; each token takes its role's brand class
// (hw-code-<role>), never an inline colour, so the --code-* tokens a container sets colour it.
const theme = codeTheme as ThemeRegistration;
const highlighter = createHighlighterCoreSync({
  themes: [theme],
  langs: [bash, json, markdown, typescript, yaml],
  engine: createJavaScriptRegexEngine(),
});
const LANGS = new Set(highlighter.getLoadedLanguages());

// The text colour takes no class: the code panel sets it.
const colourOf = (scope: string) =>
  theme.tokenColors?.find((t) => [t.scope].flat().includes(scope))?.settings.foreground;
const ROLES = new Map<string | undefined, string>([
  [colourOf("comment"), "hw-code-comment"],
  [colourOf("keyword"), "hw-code-keyword"],
  [colourOf("string"), "hw-code-string"],
  [colourOf("markup.inserted"), "hw-code-inserted"],
  [colourOf("markup.deleted"), "hw-code-deleted"],
  [theme.colors?.["editor.foreground"], ""],
]);
// Shiki's FontStyle flags.
const STYLES = [
  [1, "hw-code-italic"],
  [2, "hw-code-bold"],
  [4, "hw-code-underline"],
] as const;

/** Each line's tokens, in their role classes: one entry per line of `code`. */
export function highlightLines(code: string, language?: string): ReactNode[] {
  const lang = language && LANGS.has(language) ? language : "text";
  return highlighter.codeToTokensBase(code, { lang, theme: codeTheme.name }).map((line) =>
    // A non-breaking space keeps a blank line's height.
    line.every((token) => token.content === "")
      ? " "
      : line.map((token, j) => {
          const className = [
            ROLES.get(token.color?.toLowerCase()),
            ...STYLES.filter(([flag]) => (token.fontStyle ?? 0) & flag).map(([, c]) => c),
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <span key={j} className={className || undefined}>
              {token.content}
            </span>
          );
        }),
  );
}
