// `slides-pptx --embed-fonts`: the brand faces inside the file, so PowerPoint draws Inter and
// JetBrains Mono on a machine that has neither. PowerPoint keeps an embedded font as an Embedded
// OpenType file in a `ppt/fonts/*.fntdata` part (MS-OI29500 §15.2.13), named by
// `p:embeddedFontLst` in presentation.xml with one part per style. Both faces are under the SIL
// Open Font License, which allows embedding in a document, whole or as a subset, and their OS/2
// fsType is 0, installable.
import { readFileSync } from "node:fs";
import type JSZip from "jszip";
import { MONO, SANS, faceFiles, unescape } from "./pptx-text";

/** Basic Latin and Latin-1, kept in every subset whatever the deck uses, so text typed into the
 *  file later still finds its letters. */
const KEPT = [
  ...Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i),
  ...Array.from({ length: 0x100 - 0xa0 }, (_, i) => 0xa0 + i),
];
const PITCH: Record<string, string> = { [SANS]: "34", [MONO]: "49" };

/** Embeds the regular and bold of both brand faces in `zip`, each subset to the code points the
 *  slides' text uses and the Latin range. */
export async function embedFonts(zip: JSZip): Promise<void> {
  const { Font, woff2 } = await import("fonteditor-core");
  await woff2.init();
  const used = new Set(KEPT);
  for (const name of Object.keys(zip.files).filter((f) =>
    /^ppt\/(slides|charts)\/.+\.xml$/.test(f),
  ))
    for (const [, t] of (await zip.file(name)!.async("string")).matchAll(/<a:t>([^<]*)<\/a:t>/g))
      for (const ch of unescape(t)) used.add(ch.codePointAt(0)!);

  // One EOT per face and weight: brand's unicode-range subsets of the weight merged, each code
  // point from the first subset holding it, as the browser picks it.
  const eot = (mono: boolean, bold: boolean) => {
    const files = faceFiles(mono, bold).map((f) => readFileSync(f));
    const left = new Set(used);
    let font: InstanceType<typeof Font> | undefined;
    for (const buf of files) {
      const cmap = Font.create(buf, { type: "woff2" }).get().cmap as Record<string, number>;
      const mine = [...left].filter((cp) => cp in cmap);
      if (!mine.length) continue;
      mine.forEach((cp) => left.delete(cp));
      // Without hinting the subset drops GPOS too, whose glyph ids the subset would break; the
      // brand's static faces carry no hinting programs beyond prep.
      const part = Font.create(buf, { type: "woff2", subset: mine });
      if (font) font.merge(part, { scale: 1 });
      else font = part;
    }
    return eotOf(font!.write({ type: "ttf", toBuffer: true }) as Buffer);
  };

  const rels = await zip.file("ppt/_rels/presentation.xml.rels")!.async("string");
  let rid = Math.max(...[...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]))) + 1;
  const entries: string[] = [];
  const links: string[] = [];
  for (const [mono, typeface] of [
    [false, SANS],
    [true, MONO],
  ] as const) {
    const slots: string[] = [];
    for (const bold of [false, true]) {
      const part = `font${rid}.fntdata`;
      zip.file(`ppt/fonts/${part}`, eot(mono, bold));
      links.push(
        `<Relationship Id="rId${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/${part}"/>`,
      );
      slots.push(`<p:${bold ? "bold" : "regular"} r:id="rId${rid++}"/>`);
    }
    entries.push(
      `<p:embeddedFont><p:font typeface="${typeface}" pitchFamily="${PITCH[typeface]}" charset="0"/>${slots.join("")}</p:embeddedFont>`,
    );
  }
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    rels.replace("</Relationships>", `${links.join("")}</Relationships>`),
  );
  const types = await zip.file("[Content_Types].xml")!.async("string");
  zip.file(
    "[Content_Types].xml",
    types.replace(
      /<Types[^>]*>/,
      (m) => `${m}<Default Extension="fntdata" ContentType="application/x-fontdata"/>`,
    ),
  );
  // The list stands after the notes size and before the default text style (CT_Presentation).
  const pres = await zip.file("ppt/presentation.xml")!.async("string");
  const list = `<p:embeddedFontLst>${entries.join("")}</p:embeddedFontLst>`;
  // pptxgenjs already sets saveSubsetFonts, which says the parts hold only the characters used.
  const placed = pres
    .replace(/(<p:notesSz[^>]*\/>)/, `$1${list}`)
    .replace(/<p:presentation\b/, '<p:presentation embedTrueTypeFonts="1"')
    .replace(/<p:presentation\b(?![^>]*saveSubsetFonts)/, '<p:presentation saveSubsetFonts="1"');
  if (!placed.includes(list)) throw new Error("presentation.xml has no p:notesSz to embed after");
  zip.file("ppt/presentation.xml", placed);
}

/** A TrueType font wrapped as an uncompressed Embedded OpenType file, version 0x00020001 (W3C EOT
 *  submission, 2008): the little-endian header from the font's OS/2, head and name tables, the
 *  names in UTF-16LE, no root string, then the font as it stands. */
export function eotOf(ttf: Buffer): Buffer {
  const table = (tag: string) => {
    for (let i = 0; i < ttf.readUInt16BE(4); i++) {
      const at = 12 + i * 16;
      if (ttf.toString("latin1", at, at + 4) === tag) return ttf.readUInt32BE(at + 8);
    }
    throw new Error(`the font has no ${tag} table`);
  };
  const [os2, head, name] = [table("OS/2"), table("head"), table("name")];
  // Family, subfamily, version and full name, Windows Unicode English, byte-swapped to LE.
  const names = [1, 2, 5, 4].map((id) => {
    const strings = name + ttf.readUInt16BE(name + 4);
    for (let i = 0; i < ttf.readUInt16BE(name + 2); i++) {
      const r = name + 6 + i * 12;
      const [platform, encoding, language, nameId] = [0, 2, 4, 6].map((o) =>
        ttf.readUInt16BE(r + o),
      );
      if (platform !== 3 || encoding !== 1 || language !== 0x409 || nameId !== id) continue;
      const start = strings + ttf.readUInt16BE(r + 10);
      return Buffer.from(ttf.subarray(start, start + ttf.readUInt16BE(r + 8))).swap16();
    }
    return Buffer.alloc(0);
  });
  const fixed = Buffer.alloc(82);
  fixed.writeUInt32LE(ttf.length, 4);
  fixed.writeUInt32LE(0x00020001, 8);
  ttf.copy(fixed, 16, os2 + 32, os2 + 42); // PANOSE
  fixed[26] = 1; // DEFAULT_CHARSET
  fixed[27] = ttf.readUInt16BE(os2 + 62) & 1; // italic
  fixed.writeUInt32LE(ttf.readUInt16BE(os2 + 4), 28);
  fixed.writeUInt16LE(ttf.readUInt16BE(os2 + 8), 32);
  fixed.writeUInt16LE(0x504c, 34);
  for (let i = 0; i < 4; i++) fixed.writeUInt32LE(ttf.readUInt32BE(os2 + 42 + i * 4), 36 + i * 4);
  for (let i = 0; i < 2; i++) fixed.writeUInt32LE(ttf.readUInt32BE(os2 + 78 + i * 4), 52 + i * 4);
  fixed.writeUInt32LE(ttf.readUInt32BE(head + 8), 60);
  const u16 = (v: number) => {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(v);
    return b;
  };
  const out = Buffer.concat([
    fixed,
    ...names.flatMap((n) => [u16(n.length), n, u16(0)]),
    u16(0), // RootStringSize
    ttf,
  ]);
  out.writeUInt32LE(out.length, 0);
  return out;
}
