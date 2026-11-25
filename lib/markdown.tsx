import React from "react";

/** Splits text into plain runs and its links, bold, *accent* and code, the latter at odd indices.
 *  Single-asterisk emphasis needs non-whitespace just inside the markers, so "2 * 3 * 4" stays
 *  plain. */
export const INLINE_MARKDOWN =
  /(\[[^\]]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*(?!\s)[^*]*[^\s*]\*|`[^`]+`)/g;

/** Text as `renderMarkdown` shows it: link targets, emphasis and code markers dropped where it
 *  reads them as markdown, so a `*` inside a code span stays. */
export const markdownless = (text: string) =>
  text.replace(INLINE_MARKDOWN, (part) => {
    if (part.startsWith("[")) return part.slice(1, part.indexOf("]("));
    const marker = part.startsWith("**") ? 2 : 1;
    return part.slice(marker, -marker);
  });

/** Whether `renderMarkdown` draws anything in the text but plain runs. */
export const hasMarkdown = (text: string) => text.split(INLINE_MARKDOWN).length > 1;

// A browser breaks a line after any hyphen, so "Self-Service" in a narrow box ended one line on
// "Self-" with "Service?" alone below. A compound up to 24 characters is an inline block: it moves
// to the next line whole, and breaks inside itself only where it is wider than the line, so it
// never runs out of a fixed box. Broken so, it keeps its first line on the line's baseline, where an
// inline block would take its last, so a list marker stays beside the item's first line.
const COMPOUND = /([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+)/u;

export function keepCompounds(text: React.ReactNode): React.ReactNode {
  if (typeof text !== "string") return text;
  const pieces = text.split(COMPOUND);
  if (pieces.length === 1) return text;
  return pieces.map((piece, i) =>
    i % 2 && piece.length <= 24 ? (
      <span key={i} className="inline-block [baseline-source:first]">
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

// The punctuation after a whole chip, which goes with it: a browser breaks a line after an
// inline block even before a comma.
function chipPunctuation(part: string | undefined, following: string | undefined) {
  if (!part?.startsWith("`")) return "";
  if (!keepsWhole(part.slice(1, -1))) return "";
  return /^[,.;:!?)\]]+/.exec(following ?? "")?.[0] ?? "";
}

function renderInlineLink(part: string, index: number) {
  const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
  if (!link) return part;
  const [, label, href] = link;
  // Only web, mail and relative targets become links; any other scheme stays plain text.
  if (!/^(https?:|mailto:|[/#.]|[^:]*$)/i.test(href)) return label;
  return (
    <a key={index} href={href} target="_blank" rel="noreferrer" className="hw-link">
      {label}
    </a>
  );
}

function renderBoldRun(part: string, index: number) {
  return (
    <strong key={index} className="font-bold text-text">
      {keepCompounds(part.slice(2, -2))}
    </strong>
  );
}

function renderAccentRun(part: string, index: number) {
  return (
    <span key={index} className="font-semibold text-slide-accent">
      {keepCompounds(part.slice(1, -1))}
    </span>
  );
}

// A path or file name breaks only after a slash or before a dot, so a table of paths never
// splits `my-skill` at its hyphen or `settings.json` mid-word.
function renderCodePath(text: string) {
  return text
    .replace(/\/|(?=\.)/g, "$&\0")
    .split("\0")
    .filter(Boolean)
    .map((piece, index) => (
      <React.Fragment key={index}>
        {index > 0 && <wbr />}
        <span className="inline-block max-w-full [overflow-wrap:anywhere]">{piece}</span>
      </React.Fragment>
    ));
}

function renderCodeChip(part: string, index: number, after: string) {
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
  const code = (
    <code className={chip} style={hold}>
      {path ? renderCodePath(text) : text}
    </code>
  );
  return after ? (
    <span key={index} className="whitespace-nowrap">
      {code}
      {after}
    </span>
  ) : (
    <React.Fragment key={index}>{code}</React.Fragment>
  );
}

const inlineRenderers = new Map<
  string,
  (part: string, index: number, after: string) => React.ReactNode
>([
  ["[", renderInlineLink],
  ["**", renderBoldRun],
  ["*", renderAccentRun],
  ["`", renderCodeChip],
]);

export function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(INLINE_MARKDOWN);
  return parts.map((part, index) => {
    if (index % 2 === 0) {
      const consumed = chipPunctuation(parts[index - 1], part);
      return (
        <React.Fragment key={index}>{keepCompounds(part.slice(consumed.length))}</React.Fragment>
      );
    }
    const marker = part.startsWith("**") ? "**" : part[0];
    return inlineRenderers.get(marker)?.(part, index, chipPunctuation(part, parts[index + 1]));
  });
}
