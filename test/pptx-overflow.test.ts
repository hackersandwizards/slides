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
