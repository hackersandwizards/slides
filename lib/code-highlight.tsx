import type { ReactNode } from "react";
import { createHighlighterCoreSync, type ThemeRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import markdown from "shiki/langs/markdown.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";
import codeTheme from "@hackersandwizards/brand/code-theme.json";

// The brand's code: Shiki with the brand theme hw-code, as every h&w surface highlights code.
// Synchronous, with the JavaScript regex engine, so a slide renders its code in the same pass on the
// server, in the browser and in the print route. A language not loaded here renders as plain text.
// Each token takes the brand class of its colour's role (hw-code-<role>, elements/code.css), never
// an inline colour, so the colours come from the --code-* tokens a container may set.
const theme = codeTheme as ThemeRegistration;
const highlighter = createHighlighterCoreSync({
  themes: [theme],
  langs: [bash, json, markdown, typescript, yaml],
  engine: createJavaScriptRegexEngine(),
});
const LANGS = new Set(highlighter.getLoadedLanguages());

// Each role's colour, read from the theme by the scope that names the role. The text colour takes
// no class: the code panel sets it.
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
