import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  drawOpeningQr,
  openingHeading,
  openingQr,
  openingRow,
  type OpeningQrLayout,
  type OpeningRowLayout,
} from "../scripts/pptx/slides/opening";
import type { StackItem } from "../scripts/pptx/stack";
import type { TitleSlide } from "../types/slide";
import { shapesOf } from "./fixtures/rendered-deck";

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const r4 = (n: number) => Number(n.toFixed(4));

describe("openingHeading", () => {
  const day = palette(false);

  it.each<{ label: string; slide: TitleSlide; expected: StackItem[] }>([
    {
      label: "a full opening with kicker, name, title and subtitle",
      slide: {
        type: "title",
        kicker: "Workshop",
        name: "Team Alpha",
        title: "Ship Fast",
        subtitle: "Keep quality high",
      },
      expected: [
        {
          text: { runs: [{ text: "Workshop", options: { lang: "x-caps" } }] },
          o: { size: 18, mono: true, color: "1A7285", tracking: 0.06 },
          gap: 0,
          maxH: 3,
        },
        {
          text: { runs: [{ text: "Team Alpha" }] },
          o: { size: 32, mono: true, bold: true, color: "1A7285", tracking: -0.025 },
          gap: 0.1527777777777778,
          maxH: 3,
        },
        {
          text: { runs: [{ text: "Ship Fast" }] },
          o: {
            size: 48,
            mono: true,
            bold: true,
            color: "19283A",
            line: 1.05,
            floor: 0.5,
            tracking: -0.04,
            balance: true,
          },
          gap: 0.2361111111111111,
          maxH: 3,
        },
        {
          text: { runs: [{ text: "Keep quality high" }] },
          o: { size: 20, color: "545861" },
          gap: 0.2986111111111111,
          maxH: 3,
        },
      ],
    },
    {
      label: "a minimal title-only opening using the shorter pre-title gap",
      slide: { type: "title", title: "Only Title" },
      expected: [
        {
          text: { runs: [{ text: "Only Title" }] },
          o: {
            size: 48,
            mono: true,
            bold: true,
            color: "19283A",
            line: 1.05,
            floor: 0.5,
            tracking: -0.04,
            balance: true,
          },
          gap: 0.1527777777777778,
          maxH: 3,
        },
      ],
    },
  ])("builds stack items for $label", ({ slide, expected }) => {
    expect(openingHeading(slide, day)).toEqual(expected);
  });
});

describe("openingQr", () => {
  it("computes the right-aligned QR image and link box geometry", () => {
    expect(
      openingQr({ src: "qr.png", href: "https://example.com/talk" }, "en", 4.395833333333333),
    ).toEqual<OpeningQrLayout>({
      src: "qr.png",
      href: "https://example.com/talk",
      alt: "QR code: example.com/talk",
      label: "↗ example.com/talk",
      image: {
        x: 10.363944444444446,
        y: 4.395833333333333,
        w: 1.7777777777777777,
        h: 1.7777777777777777,
      },
      link: {
        x: 9.839333333333334,
        y: 6.256944444444444,
        w: 2.8269999999999995,
        h: 0.3611111111111111,
      },
      colW: 2.8269999999999995,
    });
  });
});

describe("openingRow", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{ label: string; slide: TitleSlide; expected: OpeningRowLayout }>([
    {
      label: "a full bottom row with speakers, event and QR column",
      slide: {
        type: "title",
        title: "Ship Fast",
        speakers: ["Ada", "Grace"],
        event: "Conf 2026",
        qr: { src: "qr.png", href: "https://example.com/talk" },
      },
      expected: {
        headEnd: 4.097222222222222,
        speakers: {
          text: { runs: [{ text: "Ada and Grace" }] },
          area: {
            x: 0.6666666666666666,
            y: 5.107638888888888,
            w: 8.672666666666666,
            h: 0.3680555555555556,
          },
        },
        event: {
          text: { runs: [{ text: "Conf 2026" }] },
          area: {
            x: 0.6666666666666666,
            y: 5.593749999999999,
            w: 8.672666666666666,
            h: 0.3402777777777778,
          },
        },
        qr: {
          src: "qr.png",
          href: "https://example.com/talk",
          alt: "QR code: example.com/talk",
          label: "↗ example.com/talk",
          image: {
            x: 10.363944444444446,
            y: 4.395833333333333,
            w: 1.7777777777777777,
            h: 1.7777777777777777,
          },
          link: {
            x: 9.839333333333334,
            y: 6.256944444444444,
            w: 2.8269999999999995,
            h: 0.3611111111111111,
          },
          colW: 2.8269999999999995,
        },
      },
    },
    {
      label: "an event-only bottom row without speakers or QR",
      slide: { type: "title", title: "Only Title", event: "Berlin" },
      expected: {
        headEnd: 5.520833333333334,
        speakers: undefined,
        event: {
          text: { runs: [{ text: "Berlin" }] },
          area: {
            x: 0.6666666666666666,
            y: 6.0625,
            w: 11.999666666666666,
            h: 0.3402777777777778,
          },
        },
        qr: undefined,
      },
    },
  ])("computes layout for $label", ({ slide, expected }) => {
    expect(openingRow(look, slide)).toEqual(expected);
  });
});

function qrPictureOf(xml: string, relsXml: string) {
  const pics = [...xml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)];
  assert(pics.length === 1, "one QR picture");
  const body = pics[0][1];
  const frame = /<a:off x="(-?\d+)" y="(-?\d+)"\s*\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/.exec(body);
  assert(frame, "picture frame");
  const descr = /descr="([^"]*)"/.exec(body);
  assert(descr, "picture alt text");
  const link = /<a:hlinkClick[^>]*r:id="([^"]+)"/.exec(body);
  assert(link, "picture hyperlink relationship");
  const target = new RegExp(`Id="${link[1]}"[^>]*Target="([^"]+)"`).exec(relsXml);
  assert(target, "picture hyperlink target");
  const [x, y, w, h] = frame.slice(1).map((v) => r4(Number(v) / 914400));
  return { x, y, w, h, alt: descr[1], href: target[1] };
}

describe("drawOpeningQr", () => {
  let assetsDir = "";

  beforeAll(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "pptx-opening-test-"));
    writeFileSync(join(assetsDir, "qr.png"), MINIMAL_PNG);
  });

  afterAll(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it("draws the QR picture with its frame, alt text, and hyperlink beside the teal link box", async () => {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
      pptx,
      assets: assetsDir,
      warnings: [],
      charts: new Map(),
    });
    const qr: OpeningQrLayout = {
      src: "qr.png",
      href: "https://example.com/talk",
      alt: "QR code: example.com/talk",
      label: "↗ example.com/talk",
      image: { x: 10.36, y: 4.4, w: 1.78, h: 1.78 },
      link: { x: 9.84, y: 6.26, w: 2.83, h: 0.36 },
      colW: 2.83,
    };
    drawOpeningQr(sheet, qr);
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
    const file = zip.file("ppt/slides/slide1.xml");
    assert(file, "slide1.xml");
    const rels = zip.file("ppt/slides/_rels/slide1.xml.rels");
    assert(rels, "slide1.xml.rels");
    const xml = await file.async("string");
    const relsXml = await rels.async("string");
    expect({
      picture: qrPictureOf(xml, relsXml),
      shapes: shapesOf(xml).map(({ prst, x, y, w, h, fill, texts }) => ({
        prst,
        x: r4(x),
        y: r4(y),
        w: r4(w),
        h: r4(h),
        fill,
        texts,
      })),
    }).toEqual({
      picture: {
        x: 10.36,
        y: 4.4,
        w: 1.78,
        h: 1.78,
        alt: "QR code: example.com/talk",
        href: "https://example.com/talk",
      },
      shapes: [
        {
          prst: "rect",
          x: 9.8258,
          y: 6.26,
          w: 2.8583,
          h: 0.36,
          fill: "1A7285",
          texts: ["↗ example.com/talk"],
        },
      ],
    });
  });
});
