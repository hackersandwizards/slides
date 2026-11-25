import type { Slide } from "../../../types/slide";
import { isHighlightPhase } from "../../../lib/process-layout";
import { CALLOUT_PAD } from "../blocks/text";
import { header } from "../chrome";
import { textWidth } from "../fit";
import { flowSteps, type FlowStep } from "../flow-steps";
import { drySheet, type Sheet } from "../sheet";
import { W, CW, PT, BODY } from "../stage";
import type { BoxOpts } from "../text";

/** A process slide's footer, `SlideCaption` on the web: brand's teal callout as wide as its
 *  text, centred, at `y`; returns its height. */
function caption(sheet: Sheet, text: string, y: number) {
  const { c } = sheet;
  const o: BoxOpts = { size: PT.base, color: c.ink, align: "center", valign: "middle" };
  const fw = Math.min(CW, 1365 / 144, textWidth(text, o) + 2 * CALLOUT_PAD + 0.02);
  const th = sheet.need(text, fw - 2 * CALLOUT_PAD, o);
  const h = th + 2 * CALLOUT_PAD;
  if (sheet.dry) return h;
  sheet.card({ x: (W - fw) / 2, y, w: fw, h }, { fill: c.callout(c.teal) });
  sheet.box(
    text,
    { x: (W - fw) / 2 + CALLOUT_PAD, y: y + CALLOUT_PAD, w: fw - 2 * CALLOUT_PAD, h: th },
    o,
  );
  return h;
}

export function drawProcess(sheet: Sheet, d: Extract<Slide, { type: "process" }>): void {
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
  const o = {
    highlight: named < 0 ? undefined : named,
    loop: d.loop === false ? undefined : "",
    k: 1,
  };
  const a = BODY(y);
  const sh = flowSteps(drySheet(sheet), steps, a, o);
  const capH = d.footer ? caption(drySheet(sheet), d.footer, 0) + 0.37 : 0;
  const top = a.y + Math.max(0, a.h - sh - capH) / 2.25;
  flowSteps(sheet, steps, { ...a, y: top }, o);
  if (d.footer) caption(sheet, d.footer, top + sh + 0.37);
}
