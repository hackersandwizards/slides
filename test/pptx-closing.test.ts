import PptxGenJS from "pptxgenjs";
import { expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  closingTail,
  drawContact,
  drawDiscussion,
  portraitRow,
  speakerParas,
} from "../scripts/pptx/slides/closing";

const day = new Look(palette(false), "en", false);

function closingSheet() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  return new Sheet(day, pptx.addSlide(), { pptx, assets: "", warnings: [], charts: new Map() });
}

it("draws each discussion question after its card in input order", () => {
  const sheet = closingSheet();
  const events: unknown[] = [];
  vi.spyOn(sheet, "card").mockImplementation(() => {
    events.push("card");
  });
  vi.spyOn(sheet, "box").mockImplementation((text) => {
    events.push(text);
  });
  drawDiscussion(sheet, {
    type: "closing",
    variant: "discussion",
    headline: "Topics",
    seedQuestions: ["Why?", "How?"],
  });
  expect(events.slice(-4)).toEqual([
    "card",
    { runs: [{ text: "Why?" }] },
    "card",
    { runs: [{ text: "How?" }] },
  ]);
});

it("omits a logo-backed company and links the email in a portrait-free speaker caption", () => {
  expect(
    speakerParas(
      day,
      { name: "Pat", company: "Partner", contact: "pat@example.org" },
      new Set(["partner"]),
    ),
  ).toEqual([
    { runs: [{ text: "Pat" }], mono: true, bold: true, rel: 18 / 17.5, after: 2 },
    {
      runs: [
        {
          text: "pat@example.org",
          options: { color: day.c.teal, hyperlink: { url: "mailto:pat@example.org" } },
        },
      ],
    },
  ]);
});

it("leaves space for a LinkedIn line across the portrait row", () => {
  const sheet = closingSheet();
  const pics = vi.spyOn(sheet, "portrait").mockImplementation(() => {});
  vi.spyOn(sheet, "box").mockImplementation(() => {});
  const height = portraitRow(
    sheet,
    [
      { name: "Pat", company: "Partner" },
      { name: "Lee", company: "Example", linkedIn: "https://www.linkedin.com/in/example" },
    ],
    2,
  );
  expect({
    height,
    portraits: pics.mock.calls.map(([person, disc]) => ({
      name: person.name,
      x: +disc.x.toFixed(4),
      y: disc.y,
      d: disc.d,
    })),
  }).toEqual({
    height: 2.65,
    portraits: [
      { name: "Pat", x: 4.5165, y: 2, d: 1.1 },
      { name: "Lee", x: 7.7165, y: 2, d: 1.1 },
    ],
  });
});

it("uses curly marks and a balanced line for a quote without the brand claim", () => {
  const paras = closingTail(day, { type: "closing", claim: false, closingQuote: "Try it." });
  expect(
    paras.map(({ runs, mono, bold, align, balance }) => ({
      text: runs.map((run) => run.text),
      mono,
      bold,
      align,
      balance,
    })),
  ).toEqual([
    { text: ["“", "Try it.", "”"], mono: true, bold: true, align: "center", balance: true },
  ]);
});

it("places a contact-only lockup according to the column's final gap adjustment", () => {
  const sheet = closingSheet();
  const pics = vi.spyOn(sheet.slide, "addImage").mockReturnValue(sheet.slide);
  drawContact(sheet, { type: "closing", claim: false });
  expect(
    pics.mock.calls.map(([image]) => ({
      y: Number(image.y).toFixed(4),
      h: Number(image.h).toFixed(4),
    })),
  ).toEqual([{ y: "3.3205", h: "0.6368" }]);
});
