import PptxGenJS from "pptxgenjs";
import { expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  closingTail,
  drawContact,
  contactBody,
  contactLayout,
  contactMark,
  drawContactMark,
  portraitLayout,
  portraitRow,
  speakerParas,
} from "../scripts/pptx/slides/closing-contact";
import type { Area } from "../scripts/pptx/stage";
import { drawClosing, drawDiscussion } from "../scripts/pptx/slides/closing";

const day = new Look(palette(false), "en", false);

function closingSheet() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  return new Sheet(day, pptx.addSlide(), { pptx, assets: "", warnings: [], charts: new Map() });
}

it("draws each discussion question after its card in input order", () => {
  const sheet = closingSheet();
  vi.spyOn(sheet, "need").mockReturnValue(0.5);
  const events: unknown[] = [];
  const round = ({ x, y, w, h }: Area) => ({
    x: +x.toFixed(4),
    y: +y.toFixed(4),
    w: +w.toFixed(4),
    h: +h.toFixed(4),
  });
  vi.spyOn(sheet, "card").mockImplementation((area) => {
    events.push({ card: round(area) });
  });
  vi.spyOn(sheet, "box").mockImplementation((text, area) => {
    events.push({ text, area: round(area) });
  });
  drawDiscussion(sheet, {
    type: "closing",
    variant: "discussion",
    headline: "Topics",
    seedQuestions: ["Why?", "How?"],
  });
  expect(events).toEqual([
    { text: "Topics", area: { x: 0.6667, y: 0.8125, w: 11.9997, h: 0.5 } },
    { card: { x: 0.6667, y: 3.0216, w: 11.9997, h: 0.8704 } },
    { text: { runs: [{ text: "Why?" }] }, area: { x: 0.963, y: 3.2067, w: 11.4071, h: 0.5 } },
    { card: { x: 0.6667, y: 4.1141, w: 11.9997, h: 0.8704 } },
    { text: { runs: [{ text: "How?" }] }, area: { x: 0.963, y: 4.2993, w: 11.4071, h: 0.5 } },
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
  const layout = portraitLayout(day, [
    { name: "Pat", company: "Partner" },
    { name: "Lee", company: "Example", linkedIn: "https://www.linkedin.com/in/example" },
  ]);
  portraitRow(sheet, layout, 2);
  expect({
    height: layout.height,
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

it("sizes the partner mark to the lockup and inserts the separator before the lockup", () => {
  const { logos, lockX, lockH, times } = contactMark(day, {
    type: "closing",
    partners: [{ src: "/mark.png", company: "Partner", width: 2, height: 1 }],
  });
  const [logo] = logos;
  expect({
    logos: logos.map(({ src, alt, w }) => ({ src, alt, w: +w.toFixed(4) })),
    lockH: +lockH.toFixed(4),
    separator: [+(logo.timesX - logo.x - logo.w).toFixed(4), times],
    afterSeparator: +(lockX - logo.timesX - times).toFixed(4),
  }).toEqual({
    logos: [{ src: "/mark.png", alt: "Partner", w: 1.2736 }],
    lockH: 0.6368,
    separator: [0.35, 0.5],
    afterSeparator: 0.35,
  });
});

it("gives a portrait caption without a LinkedIn line its shorter height", () => {
  const { captions, width, captionHeight, height } = portraitLayout(day, [
    { name: "Pat", company: "Example", contact: "555 0100" },
  ]);
  expect({
    width,
    captionHeight,
    height,
    captions: captions.map(({ paras, portraitX }) => ({
      x: +portraitX.toFixed(4),
      lines: paras.map(({ runs }) => runs.map(({ text, options }) => [text, options])),
    })),
  }).toEqual({
    width: 3.2,
    captionHeight: 1,
    height: 2.35,
    captions: [
      {
        x: 6.1165,
        lines: [
          [["Pat", undefined]],
          [["Example", { color: day.c.teal, lang: "x-caps" }]],
          [["555 0100", { color: day.c.teal }]],
        ],
      },
    ],
  });
});

it("keeps independent advances for the lockup, each caption and the final gap", () => {
  const look = new Look(day.c, "en", false);
  vi.spyOn(look, "need").mockReturnValue(0.5);
  const bands = contactBody(look, {
    type: "closing",
    speakers: [
      { name: "Pat", company: "Example" },
      { name: "Lee", company: "Partner" },
    ],
  });
  expect(bands.map(({ kind, advance }) => [kind, +advance.toFixed(4)])).toEqual([
    ["mark", 1.1553],
    ["text", 0.7963],
    ["text", 0.7963],
    ["space", 0.2222],
  ]);
});

it("includes the measured head and quote around the contact column", () => {
  const look = new Look(day.c, "en", false);
  vi.spyOn(look, "need").mockReturnValue(0.5);
  const layout = contactLayout(look, {
    type: "closing",
    line1: "Thanks",
    claim: false,
    closingQuote: "Try it.",
  });
  expect({
    height: +layout.height.toFixed(4),
    bands: layout.bands.map(({ kind, advance }) => [kind, +advance.toFixed(4)]),
  }).toEqual({
    height: 2.896,
    bands: [
      ["text", 1.0185],
      ["mark", 1.1553],
      ["space", 0.2222],
      ["text", 0.5],
    ],
  });
});

it("draws a literal separator after each partner and puts the brand mark last", () => {
  const sheet = closingSheet();
  const events: string[] = [];
  vi.spyOn(sheet, "picture").mockImplementation((src, area) => {
    events.push(src);
    return area;
  });
  vi.spyOn(sheet, "box").mockImplementation((text) => {
    events.push(String(text));
  });
  vi.spyOn(sheet.slide, "addImage").mockImplementation(() => {
    events.push("brand");
    return sheet.slide;
  });
  drawContactMark(
    sheet,
    contactMark(day, {
      type: "closing",
      partners: [
        { src: "/first.png", company: "First", width: 2, height: 1 },
        { src: "/second.png", company: "Second", width: 1, height: 2 },
      ],
    }),
    1,
  );
  expect(events).toEqual(["/first.png", "×", "/second.png", "×", "brand"]);
});

it("uses the contact layout for an unrecognised closing variant", () => {
  const sheet = closingSheet();
  const images = vi.spyOn(sheet.slide, "addImage").mockReturnValue(sheet.slide);
  drawClosing(sheet, { type: "closing", variant: "constructor" as "contact", claim: false });
  expect(images.mock.calls.map(([image]) => image.altText)).toEqual(["hackers&wizards"]);
});
