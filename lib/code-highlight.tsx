import type { ReactNode } from "react";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubDark from "shiki/themes/github-dark.mjs";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import markdown from "shiki/langs/markdown.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";

// The website's code: Shiki's github-dark, Astro's default theme, with its comment grey (3.05:1 on
// the theme's background) lifted to the brand's night-subtle (5.58:1), as trainer-hub's
// `comment-contrast` transformer does. Synchronous, with the JavaScript
// regex engine, so a slide renders its code in the same pass on the server, in the browser and in
// the print route. A language not loaded here renders as plain text.
const THEME = "github-dark";
const highlighter = createHighlighterCoreSync({
  themes: [githubDark],
  langs: [bash, json, markdown, typescript, yaml],
  engine: createJavaScriptRegexEngine(),
});
const LANGS = new Set(highlighter.getLoadedLanguages());
// Plain text carries no token colour: it takes the theme's foreground.
const FG = highlighter.getTheme(THEME).fg;

// The theme's grey read from the theme, the lift from the brand token, so each package owns its own.
// The lift is the token's CSS variable, which slides.css carries: a JavaScript import of the brand
// tokens here would be a client dependency Vite discovers only on first render in trainer-hub.
const COMMENT = githubDark.tokenColors
  ?.find((t) => [t.scope].flat().includes("comment"))
  ?.settings.foreground?.toUpperCase();

/** Each line's tokens, in their theme colours: one entry per line of `code`. */
export function highlightLines(code: string, language?: string): ReactNode[] {
  const lang = language && LANGS.has(language) ? language : "text";
  return highlighter.codeToTokensBase(code, { lang, theme: THEME }).map((line) =>
    // A non-breaking space keeps a blank line's height.
    line.every((token) => token.content === "")
      ? "\u00a0"
      : line.map((token, j) => {
          const color = token.color?.toUpperCase();
          return (
            <span
              key={j}
              style={{
                // A comment reads --slide-code-comment where a container sets it.
                color:
                  (color === COMMENT
                    ? "var(--slide-code-comment, var(--color-night-subtle))"
                    : token.color) ?? FG,
                fontStyle: (token.fontStyle ?? 0) & 1 ? "italic" : undefined,
              }}
            >
              {token.content}
            </span>
          );
        }),
  );
}
