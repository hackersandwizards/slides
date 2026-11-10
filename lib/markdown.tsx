import React from "react";

/** Splits text into plain runs and its links, bold, *accent* and code, the latter at odd indices.
 *  Single-asterisk emphasis needs non-whitespace just inside the markers, so "2 * 3 * 4" stays
 *  plain. */
export const INLINE_MARKDOWN =
  /(\[[^\]]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*(?!\s)[^*]*[^\s*]\*|`[^`]+`)/g;

/** Whether `renderMarkdown` draws anything in the text but plain runs. */
export const hasMarkdown = (text: string) => text.split(INLINE_MARKDOWN).length > 1;

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

// A chip stays whole up to 24 characters, or up to 40 where a space, slash or dot leaves it a
// break for a box narrower than the chip.
const keepsWhole = (code: string) => code.length <= 24 || (/[ /.]/.test(code) && code.length <= 40);

export function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(INLINE_MARKDOWN);
  // The punctuation after a whole chip, which goes with it: a browser breaks a line after an
  // inline block even before a comma.
  const trailing = (i: number) =>
    i % 2 === 1 && parts[i].startsWith("`") && keepsWhole(parts[i].slice(1, -1))
      ? (/^[,.;:!?)\]]+/.exec(parts[i + 1] ?? "")?.[0] ?? "")
      : "";
  return parts.map((part, i) => {
    if (i % 2 === 0)
      return (
        <React.Fragment key={i}>{keepCompounds(part.slice(trailing(i - 1).length))}</React.Fragment>
      );
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
    const path = /[/.]/.test(text) && !text.includes(" ");
    const whole = keepsWhole(text);
    // In teal's text colour: base teal on the chip's tint over a striped table row falls under
    // 4.5:1. A whole chip moves to the next line whole and is at least its own width, one `ch`
    // per character of the mono face and one for the padding, up to --slide-chip-hold: a table
    // column or a phone's flow step grows to hold it, a fixed box narrower than that lets it
    // stand past its edge (a percentage in the hold undoes both), and a chip wider than the hold
    // wraps inside its box. A long chip runs with the line and may break anywhere.
    const chip = `hw-inline-code text-teal-dark ${
      whole ? "inline-block max-w-full whitespace-normal" : path ? "" : "[overflow-wrap:anywhere]"
    }`;
    const hold = whole
      ? { minWidth: `min(${text.length + 1}ch, var(--slide-chip-hold))` }
      : undefined;
    // A path or file name breaks only after a slash or before a dot, so a table of paths never
    // splits `my-skill` at its hyphen or `settings.json` mid-word.
    const code = path ? (
      <code className={chip} style={hold}>
        {text
          .replace(/\/|(?=\.)/g, "$&\0")
          .split("\0")
          .filter(Boolean)
          .map((piece, j) => (
            <React.Fragment key={j}>
              {j > 0 && <wbr />}
              <span className="inline-block max-w-full [overflow-wrap:anywhere]">{piece}</span>
            </React.Fragment>
          ))}
      </code>
    ) : (
      <code className={chip} style={hold}>
        {text}
      </code>
    );
    const after = trailing(i);
    return after ? (
      <span key={i} className="whitespace-nowrap">
        {code}
        {after}
      </span>
    ) : (
      <React.Fragment key={i}>{code}</React.Fragment>
    );
  });
}
