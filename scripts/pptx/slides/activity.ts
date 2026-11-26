import type { ActivitySlide, Slide } from "../../../types/slide";
import { header } from "../chrome";
import { MONO } from "../faces";
import type { Look } from "../look";
import type { Sheet } from "../sheet";
import { EDGE, BOTTOM, CW, PT } from "../stage";
import { md, type Para } from "../text";

/** Measures the optional prompt and its card at the head of the body. */
export function activityPrompt(look: Look, text: string, top: number) {
  const o = { size: PT.lead, color: look.c.ink };
  const h = look.need(text, CW - 0.6, o) + 0.3;
  return {
    text,
    o,
    card: { x: EDGE, y: top, w: CW, h },
    area: { x: EDGE + 0.3, y: top + 0.15, w: CW - 0.6, h: h - 0.3 },
    next: top + (h + 0.3),
  };
}

/** The numbered exercise steps or bulleted demonstration items. */
export function activitySteps(look: Look, d: ActivitySlide): Para[] {
  const { c } = look;
  return d.items.map((it, i) => ({
    runs: [
      ...(d.kind === "demo"
        ? []
        : [{ text: `${i + 1}.  `, options: { color: c.teal, bold: true, fontFace: MONO } }]),
      ...md(it, c),
    ],
    bullet: d.kind === "demo",
    after: 10,
  }));
}

/** The side card for the duration, mode and outcome. */
export function activityFrame(look: Look, d: ActivitySlide, top: number) {
  const { c } = look;
  const frame = [d.duration, d.mode, d.outcome].filter((t): t is string => !!t);
  if (!frame.length) return undefined;
  const w = CW * 0.34;
  const x = EDGE + CW - w;
  const h = 0.5 + frame.length * 0.55;
  const paras: Para[] = frame.map((t, i) => ({
    runs: md(t, c, i === 0 && d.duration ? {} : { color: c.muted }),
    mono: i === 0 && !!d.duration,
    bold: i === 0 && !!d.duration,
    rel: i === 0 && d.duration ? 1.4 : 1,
    after: 8,
  }));
  return {
    paras,
    card: { x, y: top, w, h },
    area: { x: x + 0.3, y: top + 0.25, w: w - 0.6, h: h - 0.5 },
  };
}

export function drawActivity(sheet: Sheet, d: Extract<Slide, { type: "activity" }>): void {
  const { c } = sheet;
  const label = d.label ?? { exercise: "Hands-on", demo: "Live demo", debrief: "Debrief" }[d.kind];
  const y = header(sheet, { sectionLabel: label, headline: d.headline, subtitle: d.task });
  let top = y + 0.3;
  if (d.prompt) {
    const prompt = activityPrompt(sheet, d.prompt, top);
    sheet.card(prompt.card, c.litCard);
    sheet.box(prompt.text, prompt.area, prompt.o);
    top = prompt.next;
  }
  const frame = activityFrame(sheet, d, top);
  const fw = frame?.card.w ?? 0;
  sheet.box(
    activitySteps(sheet, d),
    { x: EDGE, y: top, w: CW - fw - (fw ? 0.5 : 0), h: BOTTOM - top },
    { size: PT.lead, color: c.ink },
  );
  if (!frame) return;
  sheet.card(frame.card, c.plainCard);
  sheet.box(frame.paras, frame.area, { size: PT.base, color: c.ink });
}
