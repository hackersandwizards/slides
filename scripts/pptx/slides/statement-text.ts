import type { StatementSlide } from "../../../types/slide";
import { MONO } from "../faces";
import type { Look } from "../look";
import type { Palette } from "../palette";
import { PT } from "../stage";
import { caps, md, type BoxOpts, type Para, type Run } from "../text";

/** Splits a statement line around its optional `highlighted` and `crossedOut` substrings, styling
 *  highlighted spans in teal and crossed-out spans with a muted strikethrough. */
export function lineRuns(
  line: string,
  d: Pick<StatementSlide, "highlighted" | "crossedOut">,
  look: Look,
): Run[] {
  const { c } = look;
  const out: Run[] = [];
  const marks = [d.highlighted, d.crossedOut].filter((m): m is string => Boolean(m));
  let rest = line;
  while (rest) {
    const hits = marks
      .map((m) => [rest.indexOf(m), m] as const)
      .filter(([i]) => i >= 0)
      .sort((p, q) => p[0] - q[0]);
    if (!hits.length) {
      out.push(...md(rest, c));
      break;
    }
    const [i, m] = hits[0];
    if (i) out.push(...md(rest.slice(0, i), c));
    out.push({
      text: m,
      options: m === d.highlighted ? { color: c.teal } : { strike: "sngStrike", color: c.muted },
    });
    rest = rest.slice(i + m.length);
  }
  return out;
}

export function statementKicker(kicker: string, c: Palette): { paras: Para[]; o: BoxOpts } {
  return {
    paras: [{ runs: [caps(kicker, { color: c.tealDark })] }],
    o: { size: PT.sm, mono: true, color: c.tealDark, tracking: 0.06, line: 1.4 },
  };
}

export function columnPointNumber(index: number, c: Palette): Run {
  return {
    text: `${String(index + 1).padStart(2, "0")}  `,
    options: { color: c.teal, bold: true, fontFace: MONO },
  };
}
