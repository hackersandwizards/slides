import { isHighlightPhase } from "../../../lib/process-layout";
import type { ProcessSlide } from "../../../types/slide";
import { CALLOUT_PAD } from "../blocks/text";
import { header } from "../chrome";
import { textWidth } from "../fit";
import { drawSteps, stepsLayout, type FlowStep } from "../flow-steps";
import type { Look } from "../look";
import type { Sheet } from "../sheet";
import { BODY, CW, PT, W } from "../stage";
import type { BoxOpts } from "../text";

export interface ProcessCaptionLayout {
  text: string;
  o: BoxOpts;
  w: number;
  h: number;
  textH: number;
}

/** Measures a process slide's footer (`SlideCaption` on the web): brand's teal callout as wide as
 *  its text, centred. */
export function processCaptionLayout(look: Look, text: string): ProcessCaptionLayout {
  const o: BoxOpts = { size: PT.base, color: look.c.ink, align: "center", valign: "middle" };
  const w = Math.min(CW, 1365 / 144, textWidth(text, o) + 2 * CALLOUT_PAD + 0.02);
  const textH = look.need(text, w - 2 * CALLOUT_PAD, o);
  return { text, o, w, h: textH + 2 * CALLOUT_PAD, textH };
}

/** Draws a measured process slide caption centred at `y`. */
export function drawProcessCaption(sheet: Sheet, caption: ProcessCaptionLayout, y: number): void {
  const x = (W - caption.w) / 2;
  sheet.card({ x, y, w: caption.w, h: caption.h }, { fill: sheet.c.callout(sheet.c.teal) });
  sheet.box(
    caption.text,
    {
      x: x + CALLOUT_PAD,
      y: y + CALLOUT_PAD,
      w: caption.w - 2 * CALLOUT_PAD,
      h: caption.textH,
    },
    caption.o,
  );
}

export function drawProcess(sheet: Sheet, d: ProcessSlide): void {
  // `ProcessSlide` on a desktop and in print: the nodes as the flow block's steps, the loop back
  // above unless `loop: false`, the named phase lit, the footer as the caption under them.
  const y = header(sheet, d);
  const steps: FlowStep[] = d.nodes.map((n) => ({
    title: n.title,
    text: n.description || undefined,
    label: n.label,
    subtitle: n.subtitle || undefined,
    badge: n.badge,
    dim: n.dimmed,
    numbered: n.numbered,
  }));
  const named = d.nodes.findIndex((n) => isHighlightPhase(n.title, d.highlightPhase));
  const flow = {
    steps,
    highlight: named < 0 ? undefined : named,
    loop: d.loop === false ? undefined : "",
  };
  const a = BODY(y);
  const layout = stepsLayout(sheet, flow, { w: a.w, k: 1 });
  const sh = layout.h;
  const caption = d.footer ? processCaptionLayout(sheet, d.footer) : undefined;
  const capH = caption ? caption.h + 0.37 : 0;
  const top = a.y + Math.max(0, a.h - sh - capH) / 2.25;
  drawSteps(sheet, layout, { x: a.x, y: top });
  if (caption) drawProcessCaption(sheet, caption, top + sh + 0.37);
}
