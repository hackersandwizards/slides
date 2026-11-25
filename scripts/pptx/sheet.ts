import PptxGenJS from "pptxgenjs";
import { breakAt, BULLET_INDENT, fitScale, lineOf, marginOf, paraType, spansOf } from "./fit";
import { balance, pretty } from "./lines";
import type { Surface } from "./palette";
import { CORNER, LEADING, type Area } from "./stage";
import {
  asParas,
  breaks,
  MARKER_CODES,
  MARKER_SQUARE,
  type BoxOpts,
  type Para,
  type Run,
} from "./text";
import { Look } from "./look";

type Pptx = InstanceType<typeof PptxGenJS>;
export type PSlide = ReturnType<Pptx["addSlide"]>;

/** A trend's marked point, -1 for none, and the series its legend leaves out, or whether a bar's
 *  names stay level. */
export type ChartFix = { now: number; unnamed: number[] } | { level: boolean };

export interface Output {
  pptx: Pptx;
  assets: string;
  warnings: string[];
  /** Per chart number, what the chart finishing pass sets on it. */
  charts: Map<number, ChartFix>;
}

/** A slide that draws nothing, to measure a layout drawn top-down before placing it. */
const DRY = new Proxy({}, { get: () => () => undefined }) as PSlide;

export class Sheet extends Look {
  readonly slide: PSlide;
  readonly out: Output;

  constructor(look: Look, slide: PSlide, out: Output) {
    super(look.c, look.lang, look.dark);
    this.slide = slide;
    this.out = out;
  }

  get dry(): boolean {
    return this.slide === DRY;
  }

  /** A text box at x, y, w, h whose paragraphs shrink together until their measure fits. */
  box(content: Para[] | Para | string, area: Area, o: BoxOpts): void {
    const { x, y, w, h } = area;
    const paras = asParas(content, this.c).filter((p) => p.runs.some((r) => r.text));
    if (!paras.length) return;
    // A box too short for its lines keeps their size and closes their leading first, down to the
    // size itself: a box cut to a label's height on the web holds the label at its size.
    let k = fitScale(paras, o, area);
    if (k < 1) {
      const base = Math.min(...paras.map((p) => p.line ?? o.line ?? LEADING.body));
      for (let sc = 0.98; sc * base >= 1; sc -= 0.02)
        if (fitScale(paras, { ...o, lineScale: sc }, area) === 1) {
          o = { ...o, lineScale: sc };
          k = 1;
          break;
        }
    }
    const runs: Run[] = [];
    paras.forEach((p, i) => {
      const last = i === paras.length - 1;
      const { size, face: fontFace, bold } = paraType(p, o, k);
      const lines = (o.balance || p.balance ? balance : pretty)(
        spansOf(p, o, k),
        (w - marginOf(p)) * 72,
      );
      breaks(breakAt(p.runs, lines)).forEach((r, j, all) => {
        runs.push({
          text: r.text,
          options: {
            fontFace,
            fontSize: size,
            color: o.color,
            bold,
            italic: o.italic,
            ...(o.tracking ? { charSpacing: Math.round(o.tracking * size * 10) / 10 } : {}),
            align: p.align ?? o.align ?? "left",
            // Exact points, the web's line box: a percentage would multiply the face's own line
            // height, a fifth to a third taller than the size.
            lineSpacing: lineOf(p, o, k),
            paraSpaceAfter: last ? 0 : (p.after ?? 0) * k,
            ...(p.tabs
              ? { tabStops: p.tabs.map((at) => ({ position: at * k, alignment: "l" as const })) }
              : {}),
            ...(p.bullet
              ? {
                  bullet:
                    p.bullet === "number"
                      ? { type: "number", indent: BULLET_INDENT }
                      : {
                          code: p.marker ? MARKER_CODES[p.marker] : MARKER_SQUARE,
                          indent: BULLET_INDENT,
                        },
                  indentLevel: p.indent ?? 0,
                }
              : {}),
            ...r.options,
            ...(j === all.length - 1 && !last ? { breakLine: true } : {}),
          },
        });
      });
    });
    // The box 1 % wider than the width its lines were measured at, on the side its text runs to:
    // LibreOffice sets a line up to 0.7 % wider than the faces' advances add up to, and would wrap
    // a line the measure fills. A filled box keeps its size.
    const spare = o.fill ? 0 : w * 0.01;
    const align = paras.some((p) => p.align === "center") ? "center" : (o.align ?? "left");
    const dx = align === "center" ? spare / 2 : align === "right" ? spare : 0;
    this.slide.addText(runs, {
      x: x - dx,
      y,
      w: w + spare,
      h,
      margin: 0,
      valign: o.valign ?? "top",
      fit: "none",
      ...(o.fill ? { fill: { color: o.fill } } : {}),
    });
  }

  card(area: Area, surface: Surface): void {
    const { x, y, w, h } = area;
    const { fill, line } = surface;
    this.slide.addShape("round2DiagRect", {
      x,
      y,
      w,
      h,
      rectRadius: Math.min(CORNER, w / 2, h / 2),
      fill: { color: fill },
      line: line ? { color: line, width: 1 } : { type: "none" },
    });
  }

  rounded(area: Area, surface: Surface, r: number): void {
    const { x, y, w, h } = area;
    const { fill, line } = surface;
    this.slide.addShape("roundRect", {
      x,
      y,
      w,
      h,
      rectRadius: Math.min(r, w / 2, h / 2),
      fill: { color: fill },
      line: line ? { color: line, width: 1 } : { type: "none" },
    });
  }

  rect(area: Area, fill: string): void {
    const { x, y, w, h } = area;
    this.slide.addShape("rect", {
      x,
      y,
      w,
      h,
      fill: { color: fill },
      line: { type: "none" },
    });
  }

  warn(message: string): void {
    if (!this.dry) this.out.warnings.push(message);
  }
}

export function drySheet(look: Look): Sheet {
  const out = look instanceof Sheet ? look.out : undefined;
  return new Sheet(look, DRY, {
    pptx: out?.pptx ?? new PptxGenJS(),
    assets: out?.assets ?? "",
    warnings: [],
    charts: new Map(),
  });
}
