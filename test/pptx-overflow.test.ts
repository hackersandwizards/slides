import { describe, expect, it } from "vitest";
import {
  checkSlide,
  crossesHolder,
  holderFor,
  outsideSlide,
  paragraphOf,
  shapeOf,
  spanOf,
  tallerThanBox,
  widerThanBox,
} from "../scripts/pptx/overflow";

const body = {
  paragraphs: [],
  left: 0.1,
  top: 0.1,
  right: 0.25,
  bottom: 0.25,
  anchor: "b",
  alignment: "r",
};

it("reads a run's font settings and XML entities", () => {
  expect(
    spanOf(
      '<a:rPr sz="2400" b="1" cap="all" spc="-25"><a:latin typeface="JetBrains Mono"/></a:rPr><a:t>A&amp;B</a:t>',
    ),
  ).toEqual({ text: "A&B", size: 24, mono: true, bold: true, tracking: -0.25, caps: true });
});

it("reads paragraph spacing and appends a break to the preceding run", () => {
  expect(
    paragraphOf(
      '<a:pPr marL="228600"><a:lnSpc><a:spcPts val="1400"/></a:lnSpc><a:spcAft><a:spcPts val="200"/></a:spcAft></a:pPr>' +
        "<a:br/><a:r><a:t>First</a:t></a:r><a:br/><a:r><a:t>Next</a:t></a:r>",
    ),
  ).toEqual({
    spans: [
      { text: "First\n", size: 18, mono: false, bold: false, tracking: 0, caps: false },
      { text: "Next", size: 18, mono: false, bold: false, tracking: 0, caps: false },
    ],
    marL: 0.25,
    exact: "1400",
    pct: undefined,
    after: "200",
  });
});

it("reads a shape's box, insets and alignment from its markup", () => {
  expect(
    shapeOf(
      '<p:cNvPr name="A"/><a:xfrm><a:off x="914400" y="1828800"/><a:ext cx="2743200" cy="3657600"/></a:xfrm>' +
        '<a:prstGeom prst="rect"/><p:txBody><a:bodyPr lIns="228600" anchor="ctr"/>' +
        '<a:p><a:pPr algn="r"/><a:r><a:t>A&amp;B</a:t></a:r></a:p></p:txBody>',
      "sp",
    ),
  ).toEqual({
    kind: "sp",
    name: "A",
    rect: { x: 1, y: 2, w: 3, h: 4 },
    geom: "rect",
    text: "A&B",
    body: {
      paragraphs: ['<a:pPr algn="r"/><a:r><a:t>A&amp;B</a:t></a:r>'],
      left: 0.25,
      right: 0.1,
      top: 0.05,
      bottom: 0.05,
      anchor: "ctr",
      alignment: "r",
    },
  });
});

it("reports a shape crossing the left edge", () => {
  expect(outsideSlide({ x: -0.04, y: 1, w: 2, h: 2 }, 10, 7)).toEqual("stands outside the slide");
});

it("measures a text box's height inside both vertical insets", () => {
  expect(
    tallerThanBox({
      rect: { x: 1, y: 1, w: 2, h: 1.5 },
      body,
      inner: 1.65,
      metrics: { h: 1.5, widest: 0.2, line: 0.2 },
    }),
  ).toEqual("text 1.50 in tall in a box 1.15 in");
});

it("reports a piece wider than the interior of a text box", () => {
  expect(
    widerThanBox({
      rect: { x: 1, y: 1, w: 1.35, h: 1.5 },
      body,
      inner: 1,
      metrics: { h: 0.5, widest: 1.03, line: 1 },
    }),
  ).toEqual("a word 1.03 in wide in a box 1.00 in");
});

it("keeps the first smallest holder and excludes an ellipse's corners", () => {
  const first = { x: 0, y: 0, w: 2, h: 2 };
  expect(
    holderFor(
      { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
      [
        { geom: "rect", rect: { x: 0, y: 0, w: 4, h: 4 } },
        { geom: "ellipse", rect: { x: 0, y: 0, w: 1.5, h: 1.5 } },
        { geom: "rect", rect: first },
        { geom: "rect", rect: { x: 0.1, y: 0.1, w: 2, h: 2 } },
      ],
      25,
    ),
  ).toEqual(first);
});

it("uses right and bottom alignment when checking a holder", () => {
  expect(
    crossesHolder(
      {
        rect: { x: 1, y: 1, w: 2, h: 2 },
        body,
        inner: 1.65,
        metrics: { h: 0.5, widest: 0.5, line: 0.5 },
      },
      { x: 2, y: 2, w: 1, h: 1 },
    ),
  ).toEqual(undefined);
});

it.each([
  { label: "a box that holds its text", x: 914400, y: 1143000, height: 365760, findings: [] },
  {
    label: "a 0.05-inch text box",
    x: 914400,
    y: 1143000,
    height: 45720,
    findings: ['Sample "Fits": text 0.25 in tall in a box 0.05 in'],
  },
  {
    label: "a text box moved to 12 inches",
    x: 10972800,
    y: 1143000,
    height: 365760,
    findings: ['Sample "Fits" stands outside the slide'],
  },
  // Raised so its top stands above the card while its centre stays inside.
  {
    label: "text raised across its card's top",
    x: 914400,
    y: 822960,
    height: 365760,
    findings: ['Sample "Fits": text crosses the edge of the shape it stands in'],
  },
])("checks $label", ({ x, y, height, findings }) => {
  const xml = `<p:sld><p:cSld><p:spTree>
    <p:sp><p:nvSpPr><p:cNvPr name="Card"/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="0" y="914400"/><a:ext cx="3657600" cy="1828800"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr name="Sample"/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="1828800" cy="${height}"/></a:xfrm></p:spPr>
    <p:txBody><a:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"/>
    <a:p><a:pPr><a:lnSpc><a:spcPts val="1800"/></a:lnSpc></a:pPr><a:r><a:rPr sz="1800"/><a:t>Fits</a:t></a:r></a:p>
    </p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
  expect(checkSlide(xml, 13.333, 7.5)).toEqual(findings);
});

describe("slides-pptx measures written text", () => {
  const line = '<a:r><a:rPr sz="1800"/><a:t>One line</a:t></a:r>';

  it.each([
    {
      label: "an empty paragraph is skipped",
      width: 1828800,
      height: 365760,
      paragraphs:
        '<a:p><a:pPr><a:lnSpc><a:spcPts val="7200"/></a:lnSpc></a:pPr></a:p>' +
        `<a:p><a:pPr><a:lnSpc><a:spcPts val="1800"/></a:lnSpc></a:pPr>${line}</a:p>`,
      findings: [],
    },
    {
      label: "200% line spacing makes text too tall",
      width: 1828800,
      height: 365760,
      paragraphs: `<a:p><a:pPr><a:lnSpc><a:spcPct val="200000"/></a:lnSpc></a:pPr>${line}</a:p>`,
      findings: ['Sample "One line": text 0.60 in tall in a box 0.40 in'],
    },
    {
      label: "one word is wider than its text box",
      width: 457200,
      height: 2743200,
      paragraphs:
        '<a:p><a:r><a:rPr sz="1800"><a:latin typeface="JetBrains Mono"/></a:rPr>' +
        "<a:t>MMMMMMMM</a:t></a:r></a:p>",
      findings: ['Sample "MMMMMMMM": a word 1.20 in wide in a box 0.50 in'],
    },
  ])("checks written text when $label", ({ width, height, paragraphs, findings }) => {
    const xml = `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
        xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree><p:sp>
          <p:nvSpPr><p:cNvPr id="1" name="Sample"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm></p:spPr>
          <p:txBody>
            <a:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
            ${paragraphs}
          </p:txBody>
        </p:sp></p:spTree></p:cSld>
      </p:sld>`;
    expect(checkSlide(xml, 13.333, 7.5)).toEqual(findings);
  });
});
