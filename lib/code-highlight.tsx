import type { ReactNode } from "react";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubDark from "shiki/themes/github-dark.mjs";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import markdown from "shiki/langs/markdown.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";

// The website's code: Shiki's github-dark, Astro's default theme, with its comment grey lifted
// (3.05:1 on the theme's background) to the theme's own description grey (5.34:1), as the website's
// `comment-contrast` transformer does (website astro.config.mjs). Synchronous, with the JavaScript
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

// Both greys read from the theme, so its package owns them.
const COMMENT = githubDark.tokenColors
  ?.find((t) => [t.scope].flat().includes("comment"))
  ?.settings.foreground?.toUpperCase();
const COMMENT_LIFT = githubDark.colors?.descriptionForeground;

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
                color: (color === COMMENT ? COMMENT_LIFT : token.color) ?? FG,
                fontStyle: (token.fontStyle ?? 0) & 1 ? "italic" : undefined,
              }}
            >
              {token.content}
            </span>
          );
        }),
  );
}

/** A code block's lines, one element each. */
export function highlightCode(code: string, language?: string): ReactNode[] {
  return highlightLines(code, language).map((line, i) => <div key={i}>{line}</div>);
}
