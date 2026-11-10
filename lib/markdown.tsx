import React from "react";

/** Splits text into plain runs and its links, bold, *accent* and code, the latter at odd indices.
 *  Single-asterisk emphasis needs non-whitespace just inside the markers, so "2 * 3 * 4" stays
 *  plain. */
export const INLINE_MARKDOWN =
  /(\[[^\]]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*(?!\s)[^*]*[^\s*]\*|`[^`]+`)/g;

// A browser breaks a line after any hyphen, so "Self-Service" in a narrow box ended one line on
// "Self-" with "Service?" alone below. A compound up to 24 characters is an inline block: it moves
// to the next line whole, and breaks inside itself only where it is wider than the line, so it
// never runs out of a fixed box. Anything but a string passes through.
const COMPOUND = /([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+)/u;

export function keepCompounds(text: React.ReactNode): React.ReactNode {
  if (typeof text !== "string") return text;
  const pieces = text.split(COMPOUND);
  if (pieces.length === 1) return text;
  return pieces.map((piece, i) =>
    i % 2 && piece.length <= 24 ? (
      <span key={i} className="inline-block">
        {piece}
      </span>
    ) : (
      piece
    ),
  );
}

export function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(INLINE_MARKDOWN);
  return parts.map((part, i) => {
    if (i % 2 === 0) return <React.Fragment key={i}>{keepCompounds(part)}</React.Fragment>;
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
          {keepCompounds(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith("*") && !part.startsWith("**")) {
      return (
        <span key={i} className="font-semibold text-slide-accent">
          {keepCompounds(part.slice(1, -1))}
        </span>
      );
    }
    const text = part.slice(1, -1);
    // In teal's text colour: base teal on the chip's tint over a striped table row falls under
    // 4.5:1.
    const chip = "hw-inline-code text-teal-dark";
    // A chip as wide as its text: it moves to the next line whole, widens a table column to hold
    // it and stands past a phone's narrow flow step, centred under it, rather than break there.
    // Wider than a sized box such as a paragraph, it breaks inside itself.
    const whole = "inline-block w-max max-w-full";
    // Such a path or file name breaks only after a slash or before a dot, so a table of paths
    // never splits `my-skill` at its hyphen or `settings.json` mid-word.
    if (/[/.]/.test(text) && !text.includes(" ")) {
      const pieces = text
        .replace(/\/|(?=\.)/g, "$&\0")
        .split("\0")
        .filter(Boolean);
      return (
        <code key={i} className={`${chip} ${whole}`}>
          {pieces.map((piece, j) => (
            <React.Fragment key={j}>
              {j > 0 && <wbr />}
              <span className="inline-block max-w-full [overflow-wrap:anywhere]">{piece}</span>
            </React.Fragment>
          ))}
        </code>
      );
    }
    // A long chip runs with the line and may break inside itself.
    return (
      <code
        key={i}
        className={`${chip} ${text.length <= 24 || (text.includes(" ") && text.length <= 40) ? whole : "[overflow-wrap:anywhere]"}`}
      >
        {text}
      </code>
    );
  });
}
