import { existsSync } from "node:fs";
import PptxGenJS from "pptxgenjs";
import { altText, imageFile, pictureLink, type PictureMetadata, type PictureOpts } from "./images";
import { breakAt, BULLET_INDENT, fitScale, lineOf, marginOf, paraType, spansOf } from "./fit";
import { balance, pretty } from "./lines";
import type { Surface } from "./palette";
import { CORNER, LEADING, PT, type Area, type Disc, type Place } from "./stage";
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

  /** A deck image, from the consumer's public directory, contained in the box. The engine's own
   *  logo paths take the brand package's PNG cut, since PowerPoint shows an SVG without a raster
   *  fallback as a broken picture in older viewers. */
  picture(src: string, area: Area, o: PictureOpts): Area {
    const { x, y, w, h } = area;
    const image = imageFile(this.out.assets, src);
    const { path, size } = image;
    if (!size) return this.missingPicture(image, area, o.alt);
    const [iw, ih] = size;
    const k = Math.min(w / iw, h / ih, o.native ? 1 / 144 : Infinity);
    const pw = iw * k;
    const ph = ih * k;
    const px = o.align === "left" ? x : o.align === "right" ? x + w - pw : x + (w - pw) / 2;
    const py = y + (h - ph) / 2;
    this.slide.addImage({
      path,
      x: px,
      y: py,
      w: pw,
      h: ph,
      altText: altText(o.alt),
      ...pictureLink(o.href),
    });
    return { x: px, y: py, w: pw, h: ph };
  }

  /** Cropped to a circle that it fills, as a portrait. */
  avatar(src: string, disc: Disc, { alt, href }: PictureMetadata): Area {
    const { x, y, d: diameter } = disc;
    const w = diameter;
    const h = diameter;
    const image = imageFile(this.out.assets, src);
    const { path, size } = image;
    if (!size) return this.missingPicture(image, { x, y, w, h }, alt);
    const [iw, ih] = size;
    // Filled and anchored at the top, as the web's hw-avatar (object-position: top).
    const d = Math.min(w, h);
    const k = d / Math.min(iw, ih);
    const [px, py] = [x + (w - d) / 2, y + (h - d) / 2];
    this.slide.addImage({
      path,
      x: px,
      y: py,
      w: iw * k,
      h: ih * k,
      sizing: { type: "crop", x: (iw * k - d) / 2, y: 0, w: d, h: d },
      rounding: true,
      altText: altText(alt),
      ...pictureLink(href),
    });
    return { x: px, y: py, w: d, h: d };
  }

  private missingPicture(
    { src, path }: ReturnType<typeof imageFile>,
    area: Area,
    alt?: string,
  ): Area {
    const { x, y, w, h } = area;
    this.warn(
      `image ${src}: ${existsSync(path) ? "unreadable format" : `not found under ${this.out.assets}`}`,
    );
    this.card({ x, y, w, h }, { fill: this.c.tint, line: this.c.border });
    this.box(
      alt || src,
      { x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h - 0.2 },
      {
        size: PT.sm,
        color: this.c.muted,
        align: "center",
        valign: "middle",
      },
    );
    return { x, y, w, h };
  }

  arrow(from: Place, to: Place, color: string): void {
    const { x: x1, y: y1 } = from;
    const { x: x2, y: y2 } = to;
    this.slide.addShape("line", {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1) || 0.001,
      h: Math.abs(y2 - y1) || 0.001,
      flipH: x2 < x1,
      flipV: y2 < y1,
      line: { color, width: 1.25, endArrowType: "triangle" },
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
