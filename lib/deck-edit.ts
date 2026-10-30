/** The dev-only edit mode's file logic, shared by every host's endpoint: find the string literal a
 *  clicked text came from, and replace exactly that literal. Pure functions, no I/O; each host's
 *  dev server reads and writes the file. Never imported by a page, so it never reaches a build. */

export interface Literal {
  start: number;
  end: number;
  quote: "'" | '"' | "`";
  value: string;
}

const ESCAPES: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  f: "\f",
  v: "\v",
  0: "\0",
};

/** Where a comment opening at `i` ends, or `i` where none opens. */
function afterComment(source: string, i: number): number {
  if (source.startsWith("//", i)) return source.indexOf("\n", i) >>> 0;
  if (source.startsWith("/*", i)) return (source.indexOf("*/", i + 2) >>> 0) + 2;
  return i;
}

/** The string or template literal whose quote is at `start`: where it ends, its value, and whether
 *  it is plain, which a template holding `${}` is not. */
function readLiteral(source: string, start: number) {
  const quote = source[start] as Literal["quote"];
  let i = start + 1;
  let value = "";
  let plain = true;
  while (i < source.length && source[i] !== quote) {
    if (source[i] === "\\") {
      const next = source[i + 1];
      const unicode = /^u\{([0-9a-fA-F]+)\}|^u([0-9a-fA-F]{4})|^x([0-9a-fA-F]{2})/.exec(
        source.slice(i + 1, i + 12),
      );
      if (unicode) {
        value += String.fromCodePoint(parseInt(unicode[1] ?? unicode[2] ?? unicode[3], 16));
        i += 1 + unicode[0].length;
      } else if (next === "\r" || next === "\n") {
        i += source.startsWith("\r\n", i + 1) ? 3 : 2;
      } else {
        value += ESCAPES[next] ?? next;
        i += 2;
      }
    } else if (quote === "`" && source.startsWith("${", i)) {
      plain = false;
      i = afterSubstitution(source, i + 2);
    } else value += source[i++];
  }
  return { quote, end: i + 1, value, plain };
}

/** Where the substitution whose body starts at `i` ends, past its closing brace. Strings, nested
 *  templates and comments inside it are skipped whole, so a brace or quote in them counts for
 *  nothing. */
function afterSubstitution(source: string, i: number): number {
  for (let depth = 1; i < source.length;) {
    const c = source[i];
    const skipped = afterComment(source, i);
    if (skipped !== i) i = skipped;
    else if (c === "'" || c === '"' || c === "`") i = readLiteral(source, i).end;
    else {
      i++;
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) break;
    }
  }
  return i;
}

/** Every plain string literal in a TypeScript source, comments skipped. A template literal holding
 *  `${}` is no plain string and is left out. Regex literals are not recognised: a deck file holds
 *  data, not regexes. */
export function literals(source: string): Literal[] {
  const found: Literal[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const skipped = afterComment(source, i);
    if (skipped !== i) i = skipped;
    else if (c === "'" || c === '"' || c === "`") {
      const { quote, end, value, plain } = readLiteral(source, i);
      if (plain) found.push({ start: i, end, quote, value });
      i = end;
    } else i++;
  }
  return found;
}

/** A string as `renderMarkdown` shows it: link targets, emphasis and code markers dropped. */
const markdownless = (s: string) =>
  s.replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1").replace(/\*\*|\*|`/g, "");
const squash = (s: string) => s.replace(/\s+/g, "");
/** Typographic quote marks a component draws around a quote, outside its string. */
const unquote = (s: string) => s.trim().replace(/^[“”„"«»]+|[“”„"«»]+$/g, "");

/** Does a rendered text show this literal? Whitespace is ignored, since components break lines. */
const shows = (text: string, value: string) =>
  [squash(text), squash(unquote(text))].some(
    (t) => t && (squash(value) === t || squash(markdownless(value)) === t),
  );

/** The finer test that settles a tie: a line break in the source renders as nothing, any other
 *  run of whitespace as one space. Tells a title with a line break from a deck name without. */
const lines = (s: string) =>
  s
    .replace(/\s*\n\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
const showsExactly = (text: string, value: string) =>
  [lines(text), lines(unquote(text))].some(
    (t) => lines(value) === t || lines(markdownless(value)) === t,
  );

/** The source string behind a click. `texts` runs from the clicked element out through its
 *  ancestors; the outermost one that shows a literal wins, so a click on a bold word edits the
 *  whole bullet. `index` names the text that matched. Refused when the text matches no literal,
 *  or more than one in the file. */
export function resolve(
  source: string,
  texts: string[],
): { value: string; index: number } | { error: string } {
  const all = literals(source);
  for (let index = texts.length - 1; index >= 0; index--) {
    const hits = all.filter((l) => shows(texts[index], l.value));
    const exact =
      new Set(hits.map((l) => l.value)).size > 1
        ? hits.filter((l) => showsExactly(texts[index], l.value))
        : hits;
    if (exact.length === 1) return { value: exact[0].value, index };
    if (hits.length > 1)
      return { error: `This text is in the deck file ${hits.length} times. Edit it there.` };
  }
  return { error: "No single string in the deck file shows this text." };
}

/** The named escapes `encode` writes; `\0` is left out, since a digit after it is no NUL. */
const NAMED = Object.fromEntries(
  Object.entries(ESCAPES)
    .filter(([name]) => name !== "0")
    .map(([name, char]) => [char, name]),
);
const hexEscape = (code: number) =>
  code > 0xffff ? `\\u{${code.toString(16)}}` : `\\u${code.toString(16).padStart(4, "0")}`;

/** The literal re-written in its own quote style, so the file keeps its quoting. A control or
 *  invisible character goes back as an escape, by name where it has one, so the file shows it:
 *  a template keeps its line breaks, but a raw carriage return there would read as a line feed. */
export function encode(value: string, quote: Literal["quote"]): string {
  let body = value.replace(/\\/g, "\\\\");
  if (quote === "`") body = body.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  else body = body.split(quote).join(`\\${quote}`);
  body = body.replace(/(?! )[\p{Cc}\p{Cf}\p{Z}]/gu, (char) =>
    char === "\n" && quote === "`"
      ? char
      : char in NAMED
        ? `\\${NAMED[char]}`
        : hexEscape(char.codePointAt(0) ?? 0),
  );
  return quote + body + quote;
}

/** The source with the one literal whose value is `from` replaced by `to`. Refused unless exactly
 *  one literal holds `from`: a write never lands on a guessed location. */
export function replace(
  source: string,
  from: string,
  to: string,
): { source: string } | { error: string } {
  if (!to.trim())
    return { error: "An empty text leaves a gap on the slide. Delete it in the file." };
  const hits = literals(source).filter((l) => l.value === from);
  if (hits.length !== 1)
    return {
      error: hits.length
        ? `This text is in the deck file ${hits.length} times. Edit it there.`
        : "The text is no longer in the deck file. Reload and try again.",
    };
  const [hit] = hits;
  return { source: source.slice(0, hit.start) + encode(to, hit.quote) + source.slice(hit.end) };
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Whether a request to a dev write endpoint comes from a page this machine serves itself. A DNS
 *  rebinding page reaches the dev server under its own name, so the Host must be loopback on the
 *  dev server's `port`, and an Origin, where sent, the same. A `*.localhost` name without a port is
 *  the local Caddy proxy: browsers resolve every `.localhost` name to loopback. */
export function fromLocalPage(host: string | null, origin: string | null, port: string): boolean {
  const local = (url: string) => {
    try {
      const { hostname, port: at, pathname, username } = new URL(url);
      if (pathname !== "/" || username) return false;
      return (LOOPBACK.has(hostname) && at === port) || (hostname.endsWith(".localhost") && !at);
    } catch {
      return false;
    }
  };
  return host !== null && local(`http://${host}`) && (origin === null || local(origin));
}
