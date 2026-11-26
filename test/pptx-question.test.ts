import PptxGenJS from "pptxgenjs";
import { expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { questionLayout, questionRow } from "../scripts/pptx/slides/question";
import type { Area } from "../scripts/pptx/stage";
import type { QuestionSlide } from "../types/slide";

const day = new Look(palette(false), "en", false);
const slide: QuestionSlide = {
  type: "question",
  headline: "Which?",
  storageKey: "which",
  options: [
    { label: "A", text: "Red" },
    { label: "B", text: "Blue" },
  ],
};
const round = ({ x, y, w, h }: Area) => ({
  x: +x.toFixed(4),
  y: +y.toFixed(4),
  w: +w.toFixed(4),
  h: +h.toFixed(4),
});

function questionLook() {
  const look = new Look(day.c, "en", false);
  vi.spyOn(look, "need").mockReturnValue(0.6);
  return look;
}

it("centres the heading and positions each letter, answer and count within its card", () => {
  const { heading, rows } = questionLayout(questionLook(), slide);
  expect({
    heading: { text: heading.text, area: round(heading.area) },
    rows: rows.map(({ option, card, letter, answer, count }) => ({
      option,
      card: round(card),
      letter: round(letter),
      answer: round(answer),
      count: round(count),
    })),
  }).toEqual({
    heading: {
      text: { runs: [{ text: "Which?" }], balance: true },
      area: { x: 0.6667, y: 1.9692, w: 11.9997, h: 0.6 },
    },
    rows: [
      {
        option: { label: "A", text: "Red" },
        card: { x: 2.5184, y: 3.0877, w: 8.2962, h: 0.7204 },
        letter: { x: 2.7406, y: 3.0877, w: 0.2963, h: 0.7204 },
        answer: { x: 3.1851, y: 3.0877, w: 6.8147, h: 0.7204 },
        count: { x: 9.9998, y: 3.0877, w: 0.5926, h: 0.7204 },
      },
      {
        option: { label: "B", text: "Blue" },
        card: { x: 2.5184, y: 3.9562, w: 8.2962, h: 0.7204 },
        letter: { x: 2.7406, y: 3.9562, w: 0.2963, h: 0.7204 },
        answer: { x: 3.1851, y: 3.9562, w: 6.8147, h: 0.7204 },
        count: { x: 9.9998, y: 3.9562, w: 0.5926, h: 0.7204 },
      },
    ],
  });
});

it("draws card, literal letter, answer and right-aligned vote count in order", () => {
  const pptx = new PptxGenJS();
  const sheet = new Sheet(day, pptx.addSlide(), {
    pptx,
    assets: "",
    warnings: [],
    charts: new Map(),
  });
  const events: unknown[] = [];
  vi.spyOn(sheet, "card").mockImplementation((area, surface) => {
    events.push({ area: round(area), surface });
  });
  vi.spyOn(sheet, "box").mockImplementation((text, area, options) => {
    events.push({ text, area: round(area), options });
  });
  questionRow(sheet, questionLayout(questionLook(), slide).rows[0]);
  expect(events).toEqual([
    { area: { x: 2.5184, y: 3.0877, w: 8.2962, h: 0.7204 }, surface: day.c.plainCard },
    {
      text: { runs: [{ text: "A" }] },
      area: { x: 2.7406, y: 3.0877, w: 0.2963, h: 0.7204 },
      options: { size: 14, mono: true, bold: true, color: day.c.muted, valign: "middle" },
    },
    {
      text: "Red",
      area: { x: 3.1851, y: 3.0877, w: 6.8147, h: 0.7204 },
      options: { size: 17.5, color: day.c.ink, line: 1.4, valign: "middle" },
    },
    {
      text: { runs: [{ text: "0" }] },
      area: { x: 9.9998, y: 3.0877, w: 0.5926, h: 0.7204 },
      options: {
        size: 18,
        mono: true,
        bold: true,
        color: day.c.teal,
        align: "right",
        valign: "middle",
      },
    },
  ]);
});
