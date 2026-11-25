import PptxGenJS from "pptxgenjs";
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
