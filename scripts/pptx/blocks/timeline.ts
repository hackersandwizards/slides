import { minus } from "../../../lib/figure-layout";
import { continuation } from "../../../lib/process-layout";
import { textWidth } from "../fit";
import type { Palette, Surface } from "../palette";
import type { Sheet } from "../sheet";
import { PT, TITLE, W, type Area } from "../stage";
import { md, type Para } from "../text";
import { bodyO, type Block, type BlockKind, type Slot } from "./kind";

const LABEL_COLUMN_W = 1.2;

export interface TimelineEventLayout {
  x: number;
  w: number;
  dot: Surface;
  segment?: string;
  when?: string;
  paras: Para[];
}

/** A timeline event's title, text and result in the figure face, as `EventBody` sets them on the
 *  web: one list, so the measured height is the drawn one. */
export function eventParas(
  e: Block<"timeline">["events"][number],
  c: Palette,
  hi: boolean,
): Para[] {
  return [
    { runs: md(e.title, c, { color: hi ? c.teal : c.ink }), ...TITLE, after: 4 },
    { runs: md(e.text ?? "", c, { color: c.muted }), rel: 0.9, after: e.text ? 16 : 8 },
    ...(e.figure
      ? [
          {
            runs: [{ text: minus(e.figure), options: { color: hi ? c.teal : c.ink } }],
            mono: true,
            bold: true,
            rel: PT.s6 / PT.base,
          },
        ]
      : []),
  ];
}

/** Draws the left-hand label column (when, title, text) for a labelled timeline and returns the
 *  remaining area to its right for the timeline events. */
export function drawTimelineLabels(
  sheet: Sheet,
  labels: NonNullable<Block<"timeline">["labels"]>,
  slot: Pick<Slot, "area" | "k">,
): Area {
  const { area: a, k } = slot;
  const rows: [string | undefined, number, number][] = [
    [labels.when, a.y, PT.label],
    [labels.title, a.y + 0.55, PT.base],
    [labels.text, a.y + 0.8, PT.base * 0.9],
  ];
  for (const [label, ly, size] of rows)
    if (label)
      sheet.box(
        { runs: [{ text: label }] },
        { x: a.x, y: ly, w: LABEL_COLUMN_W - 0.1, h: 0.25 },
        { size: size * k, mono: true, bold: true, color: sheet.c.muted, align: "right" },
      );
  return { ...a, x: a.x + LABEL_COLUMN_W, w: a.w - LABEL_COLUMN_W };
}

/** Draws a timeline's base line (extended to the slide edge when continued) and overlays the
 *  dashed line after `now`. */
export function drawTimelineLine(sheet: Sheet, b: Block<"timeline">, area: Area): void {
  const { slide: s, c } = sheet;
  const n = b.events.length;
  const ew = area.w / n;
  const ly = area.y + 0.35;
  // A timeline continued over slides runs its line in from the slide's edge or out to it.
  const { into, onward } = continuation(b);
  const from = into ? 0 : area.x + ew / 2;
  const to = onward ? W : area.x + area.w - ew / 2;
  s.addShape("line", {
    x: from,
    y: ly,
    w: to - from,
    h: 0.001,
    line: { color: c.border, width: 2 },
  });
  // The line after `now` is dashed, as is a run-out past the last event (`now` defaults to it)
  // and a run-in where no event has happened (`now` -1).
  const now = b.now ?? n - 1;
  if (now < n - 1 || onward) {
    const dx = now < 0 ? from : area.x + ew / 2 + now * ew;
    for (const color of [c.bg, c.muted])
      s.addShape("line", {
        x: dx,
        y: ly,
        w: to - dx,
        h: 0.001,
        line: { color, width: 2, dashType: "dash" },
      });
  }
}

/** Draws one timeline event: its dot on the line, optional segment label on the preceding gap,
 *  optional `when` heading above the line, and its body paragraphs below. */
export function drawTimelineEvent(sheet: Sheet, ev: TimelineEventLayout, slot: Slot): void {
  const { area: a, k, centered } = slot;
  const { slide: s, c } = sheet;
  const o = bodyO(c, k, centered ? { align: "center" } : {});
  const ly = a.y + 0.35;
  const cx = ev.x + ev.w / 2;
  s.addShape("ellipse", {
    x: cx - 0.09,
    y: ly - 0.09,
    w: 0.18,
    h: 0.18,
    fill: { color: ev.dot.fill },
    line: { color: ev.dot.line, width: 1.5 },
  });
  // A segment's label breaks the middle of the line that leads to its event, as on the web.
  if (ev.segment) {
    const tw = textWidth(ev.segment, { size: PT.label * k, mono: true }) + 0.16;
    sheet.box(
      { runs: [{ text: ev.segment }] },
      { x: cx - ev.w / 2 - tw / 2, y: ly - 0.11, w: tw, h: 0.22 },
      {
        size: PT.label * k,
        mono: true,
        bold: true,
        color: c.muted,
        align: "center",
        valign: "middle",
        fill: c.bg,
      },
    );
  }
  if (ev.when)
    sheet.box(
      { runs: [{ text: ev.when }] },
      { x: cx - ev.w / 2 + 0.05, y: a.y, w: ev.w - 0.1, h: 0.22 },
      { size: PT.label * k, mono: true, bold: true, color: c.muted, align: "center" },
    );
  sheet.box(
    ev.paras,
    { x: cx - ev.w / 2 + 0.07, y: ly + 0.2, w: ev.w - 0.14, h: a.h - 0.55 },
    { ...o, align: "center" },
  );
}

export const timeline: BlockKind<"timeline"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return (
      0.6 +
      Math.max(
        ...b.events.map((e) => look.need(eventParas(e, c, false), w / b.events.length - 0.15, o)),
      )
    );
  },
  draw(sheet, b, slot) {
    const area = b.labels ? drawTimelineLabels(sheet, b.labels, slot) : slot.area;
    const { c } = sheet;
    drawTimelineLine(sheet, b, area);
    const ew = area.w / b.events.length;
    const eventSlot: Slot = { ...slot, area };
    b.events.forEach((e, i) => {
      const hi = i === b.highlight;
      drawTimelineEvent(
        sheet,
        {
          x: area.x + ew * i,
          w: ew,
          dot: hi ? { fill: c.teal, line: c.teal } : { fill: c.card, line: c.muted },
          segment: i > 0 ? e.segment : undefined,
          when: e.when,
          paras: eventParas(e, c, hi),
        },
        eventSlot,
      );
    });
  },
};
