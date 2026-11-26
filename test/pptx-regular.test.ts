import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { profileSidebar, sectionParas } from "../scripts/pptx/slides/regular";
import type { Area } from "../scripts/pptx/stage";
import type { Para } from "../scripts/pptx/text";
import type { Slide } from "../types/slide";
import { shapesOf } from "./fixtures/rendered-deck";

type RegularSlide = Extract<Slide, { type: "regular" }>;

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const r4 = (n: number) => Number(n.toFixed(4));

function picsOf(xml: string) {
  return [...xml.matchAll(/<p:pic>(.*?)<\/p:pic>/gs)].map(([, body]) => {
    const match = /<a:off x="(-?\d+)" y="(-?\d+)"\s*\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/.exec(body);
    assert(match, "picture frame coordinates");
    const [x, y, w, h] = match.slice(1).map((v) => r4(Number(v) / 914400));
    return { x, y, w, h };
  });
}

async function drawOnSheet(assets: string, draw: (sheet: Sheet) => void) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const warnings: string[] = [];
  const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
    pptx,
    assets,
    warnings,
    charts: new Map(),
  });
  draw(sheet);
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const file = zip.file("ppt/slides/slide1.xml");
  assert(file, "slide1.xml");
  const xml = await file.async("string");
  return { shapes: shapesOf(xml), pics: picsOf(xml), warnings };
}

describe("profileSidebar", () => {
  const area: Area = { x: 1, y: 2, w: 10, h: 4 };
  let assetsDir = "";

  beforeAll(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "pptx-regular-test-"));
    writeFileSync(join(assetsDir, "ada.png"), MINIMAL_PNG);
  });

  afterAll(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it.each<{
    label: string;
    profile: NonNullable<RegularSlide["profile"]>;
    expected: {
      remaining: Area;
      warnings: string[];
      pics: Area[];
      shapes: Array<{
        prst: string | undefined;
        x: number;
        y: number;
        w: number;
        h: number;
        fill: string | undefined;
        texts: string[];
      }>;
    };
  }>([
    {
      label: "a profile with photo and no LinkedIn link",
      profile: { name: "Ada Lovelace", title: "Principal Engineer", imageSrc: "ada.png" },
      expected: {
        remaining: { x: 4.1, y: 2, w: 6.9, h: 4 },
        warnings: [],
        pics: [{ x: 1.6, y: 2.2, w: 1.4, h: 1.4 }],
        shapes: [
          {
            prst: "rect",
            x: 0.987,
            y: 3.75,
            w: 2.626,
            h: 0.9,
            fill: "19283A",
            texts: ["Ada Lovelace", "Principal Engineer"],
          },
        ],
      },
    },
    {
      label: "a profile with initials badge and LinkedIn link",
      profile: {
        name: "Ada Lovelace",
        title: "Principal Engineer",
        linkedIn: "https://linkedin.com/in/ada",
      },
      expected: {
        remaining: { x: 4.1, y: 2, w: 6.9, h: 4 },
        warnings: [],
        pics: [],
        shapes: [
          { prst: "ellipse", x: 1.6, y: 2.2, w: 1.4, h: 1.4, fill: "1A7285", texts: [] },
          {
            prst: "rect",
            x: 1.593,
            y: 2.2,
            w: 1.414,
            h: 1.4,
            fill: "FFFFFF",
            texts: ["AL"],
          },
          {
            prst: "rect",
            x: 0.987,
            y: 3.75,
            w: 2.626,
            h: 1.0625,
            fill: "19283A",
            texts: ["Ada Lovelace", "Principal Engineer", "in/ada"],
          },
        ],
      },
    },
  ])("draws $label and narrows the remaining area", async ({ profile, expected }) => {
    let remaining: Area = { x: 0, y: 0, w: 0, h: 0 };
    const out = await drawOnSheet(assetsDir, (sheet) => {
      remaining = profileSidebar(sheet, profile, area);
    });
    expect({
      remaining,
      warnings: out.warnings,
      pics: out.pics,
      shapes: out.shapes.map(({ prst, x, y, w, h, fill, texts }) => ({
        prst,
        x: r4(x),
        y: r4(y),
        w: r4(w),
        h: r4(h),
        fill,
        texts,
      })),
    }).toEqual(expected);
  });
});

describe("sectionParas", () => {
  const day = palette(false);

  it.each<{ label: string; sections: RegularSlide["sections"]; expected: Para[] }>([
    {
      label: "an empty section list",
      sections: [],
      expected: [],
    },
    {
      label: "a full section with title, text, bullet items, and link",
      sections: [
        {
          title: "Overview",
          text: "Summary line",
          items: ["First item", "Second item"],
          link: { label: "Read more", url: "https://example.com" },
        },
      ],
      expected: [
        {
          runs: [{ text: "Overview", options: { color: "1A7285" } }],
          mono: true,
          bold: true,
          rel: 1,
          after: 6,
        },
        { runs: [{ text: "Summary line", options: {} }], after: 6 },
        { runs: [{ text: "First item", options: {} }], bullet: true, after: 5 },
        { runs: [{ text: "Second item", options: {} }], bullet: true, after: 5 },
        {
          runs: [
            {
              text: "Read more",
              options: { color: "1A7285", hyperlink: { url: "https://example.com" } },
            },
          ],
          after: 14,
        },
      ],
    },
    {
      label: "two sections setting 14 pt spacing on each section's last paragraph",
      sections: [{ title: "One", items: ["Bullet"] }, { text: "Standalone text" }],
      expected: [
        {
          runs: [{ text: "One", options: { color: "1A7285" } }],
          mono: true,
          bold: true,
          rel: 1,
          after: 6,
        },
        { runs: [{ text: "Bullet", options: {} }], bullet: true, after: 14 },
        { runs: [{ text: "Standalone text", options: {} }], after: 14 },
      ],
    },
  ])("builds paragraphs for $label", ({ sections, expected }) => {
    expect(sectionParas(sections, day)).toEqual(expected);
  });
});
