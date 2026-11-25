import { beforeAll, describe, expect, it } from "vitest";
import { checkSlide } from "../scripts/pptx-text";
import { slideCatalog } from "../specimen/slide-catalog";
import type { ContentSlide } from "../types/slide";
import { shapesOf, specimen, specimenAt } from "./fixtures/rendered-deck";

let slideXml: string[];

beforeAll(async () => {
  ({ slideXml } = await specimen());
}, 60_000);

describe("slides-pptx draws what the slide shows", () => {
  it("finds no text taller or wider than its box, across its shape or off the slide, and finds each where it is", () => {
    const found = slideXml.flatMap((x, i) =>
      checkSlide(x, 13.333, 7.5).map((f) => `slide ${i + 1}: ${f}`),
    );
    expect(found).toEqual([]);
    // Controls on a real slide: its title squeezed, a card's text pushed out of its card, the
    // title moved off the slide.
    const i = specimenAt((x) => x.type === "content" && x.content.some((b) => b.type === "cards"));
    const xml = slideXml[i];
    const title = shapesOf(xml).find(
      (sh) => sh.texts.join("") === (slideCatalog.slides[i] as ContentSlide).headline,
    )!;
    const ext = /<a:ext cx="\d+" cy="\d+"\/>/.exec(title.xml)![0];
    expect(
      checkSlide(
        xml.replace(title.xml, title.xml.replace(ext, ext.replace(/cy="\d+"/, 'cy="45720"'))),
        13.333,
        7.5,
      ).join(),
    ).toMatch(/tall in a box/);
    const off = /<a:off x="(\d+)"/.exec(title.xml)!;
    expect(
      checkSlide(
        xml.replace(title.xml, title.xml.replace(off[0], '<a:off x="11000000"')),
        13.333,
        7.5,
      ).join(),
    ).toMatch(/slide/);
    const inCard = shapesOf(xml).find(
      (sh) =>
        sh.texts.length &&
        shapesOf(xml).some(
          (c) =>
            c.prst === "round2DiagRect" &&
            c.x! <= sh.x! &&
            sh.x! + sh.w! <= c.x! + c.w! &&
            c.y! <= sh.y! &&
            sh.y! < c.y! + c.h!,
        ),
    )!;
    // Raised so its top stands above the card while its centre stays inside.
    const card = shapesOf(xml).find(
      (c) =>
        c.prst === "round2DiagRect" &&
        c.x! <= inCard.x! &&
        c.y! <= inCard.y! &&
        inCard.y! < c.y! + c.h!,
    )!;
    const at = /<a:off x="(\d+)" y="(\d+)"/.exec(inCard.xml)!;
    const raised = Math.round((card.y! - 0.4 * inCard.h!) * 914400);
    expect(
      checkSlide(
        xml.replace(inCard.xml, inCard.xml.replace(at[0], `<a:off x="${at[1]}" y="${raised}"`)),
        13.333,
        7.5,
      ).join(),
    ).toMatch(/crosses the edge/);
  });
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
