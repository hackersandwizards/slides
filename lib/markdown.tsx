import React from "react";

/** Splits text into plain runs and its links, bold, *accent* and code, the latter at odd indices.
 *  Single-asterisk emphasis needs non-whitespace just inside the markers, so "2 * 3 * 4" stays
 *  plain. */
export const INLINE_MARKDOWN =
  /(\[[^\]]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*(?!\s)[^*]*[^\s*]\*|`[^`]+`)/g;

export function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(INLINE_MARKDOWN);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    // Only web, mail and relative targets become links; any other scheme stays plain text.
    if (link && !/^(https?:|mailto:|[/#.]|[^:]*$)/i.test(link[2])) return link[1];
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="hw-link">
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && !part.startsWith("**")) {
      return (
        <span key={i} className="font-semibold text-slide-accent">
          {part.slice(1, -1)}
        </span>
      );
    }
    const text = part.slice(1, -1);
    // In teal's text colour: base teal on the chip's tint over a striped table row falls under
    // 4.5:1.
    const chip = "hw-inline-code text-teal-dark";
    // A path or file name breaks only after a slash or before a dot, so a table of paths never
    // splits `my-skill` at its hyphen or `settings.json` mid-word.
    if (/[/.]/.test(text) && !text.includes(" ")) {
      const pieces = text
        .replace(/\/|(?=\.)/g, "$&\0")
        .split("\0")
        .filter(Boolean);
      return (
        <code key={i} className={chip}>
          {pieces.map((piece, j) => (
            <React.Fragment key={j}>
              {j > 0 && <wbr />}
              <span className="inline-block max-w-full [overflow-wrap:anywhere]">{piece}</span>
            </React.Fragment>
          ))}
        </code>
      );
    }
    // A short chip stays on one line, so a name never splits at its hyphen; a long one may break
    // inside itself.
    return (
      <code
        key={i}
        className={`${chip} ${text.length <= 24 || (text.includes(" ") && text.length <= 40) ? "md:whitespace-nowrap" : "[overflow-wrap:anywhere]"}`}
      >
        {text}
      </code>
    );
  });
}
