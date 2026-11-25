import { existsSync } from "node:fs";
import PptxGenJS from "pptxgenjs";
import { altText, imageFile, pictureLink, type PictureMetadata, type PictureOpts } from "./images";
import { boxFit, boxPlace, boxRuns } from "./fit";
import type { ProfileInfo } from "../../types/slide";
import { hex, type Surface } from "./palette";
import { CORNER, PT, type Area, type Disc, type Place } from "./stage";
import { asParas, type BoxOpts, type Para } from "./text";
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
  /** Per chart number, what `finishChart` sets on it. */
  charts: Map<number, ChartFix>;
}

export interface RowHeight {
  what: string;
  cap: number;
  floor: number;
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
    const paras = asParas(content, this.c).filter((p) => p.runs.some((r) => r.text));
    if (!paras.length) return;
    const fitted = boxFit(paras, o, area);
    const runs = boxRuns(paras, fitted.o, { w: area.w, k: fitted.k });
    const place = boxPlace(area, fitted.o, paras);
    this.slide.addText(runs, {
      ...place,
      margin: 0,
      valign: fitted.o.valign ?? "top",
      fit: "none",
      ...(fitted.o.fill ? { fill: { color: fitted.o.fill } } : {}),
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

  portrait(
    { name, imageSrc }: Pick<ProfileInfo, "name" | "imageSrc">,
    disc: Disc,
    tone: string,
  ): void {
    const { x, y, d } = disc;
    // Round, as the web's hw-avatar.
    if (imageSrc) this.avatar(imageSrc, disc, { alt: name });
    else {
      this.slide.addShape("ellipse", {
        x,
        y,
        w: d,
        h: d,
        fill: { color: tone },
        line: { type: "none" },
      });
      this.box(
        {
          runs: [
            {
              text: name
                .split(/\s+/)
                .map((p) => p[0])
                .join("")
                .slice(0, 2),
            },
          ],
        },
        { x, y, w: d, h: d },
        {
          size: d * 24,
          mono: true,
          bold: true,
          color: hex("--color-white"),
          align: "center",
          valign: "middle",
        },
      );
    }
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

  /** Each of `n` rows' share of `room`, at most `cap`; below `floor` the rows run past the slide,
   *  which warns. */
  rowShare({ what, cap, floor }: RowHeight, room: number, n: number): number {
    const share = Math.min(cap, room / n);
    if (share < floor) this.warn(`${what}: ${n} rows taller than the slide holds`);
    return Math.max(floor, share);
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
