import type { ClosingSlide } from "../../../types/slide";
import { HW_LOGO } from "../../../lib/logo";
import { profileLabel } from "../../../lib/link-labels";
import { claimParts, companiesWithLogo } from "../../../lib/closing-copy";
import { closingClaim } from "../../../lib/slide-utils";
import { personAccent } from "../../../lib/people-slides";
import { centredMark } from "../chrome";
import { brandCut } from "../images";
import { profileLink } from "../people";
import type { Look } from "../look";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { W, H, EDGE, CW, PT, LEADING, REM } from "../stage";
import { caps, md, literal, type Para, type BoxOpts } from "../text";

type ClosingSpeaker = NonNullable<ClosingSlide["speakers"]>[number];

/** The name, company where needed, and contact links of a speaker without a portrait. */
export function speakerParas(look: Look, sp: ClosingSpeaker, shown: ReadonlySet<string>): Para[] {
  const { c } = look;
  return [
    { runs: [{ text: sp.name }], mono: true, bold: true, rel: PT.h4 / 17.5, after: 2 },
    ...(shown.has(sp.company.toLowerCase())
      ? []
      : [
          {
            runs: [caps(sp.company, { color: c.muted })],
            rel: 0.8,
            after: 2,
          },
        ]),
    ...(sp.contact
      ? [
          {
            runs: [
              {
                text: sp.contact,
                options: {
                  color: c.teal,
                  ...(sp.contact.includes("@")
                    ? { hyperlink: { url: `mailto:${sp.contact}` } }
                    : {}),
                },
              },
            ],
          },
        ]
      : []),
    ...(sp.linkedIn
      ? [
          {
            runs: [
              {
                text: profileLabel(sp.linkedIn),
                options: { color: c.teal, hyperlink: { url: sp.linkedIn } },
              },
            ],
          },
        ]
      : []),
  ];
}

/** Paint-ready captions and portrait positions for a row of speakers. */
export function portraitLayout(look: Look, speakers: ClosingSpeaker[]) {
  const { c } = look;
  const sw = Math.min(3.2, CW / speakers.length);
  // The LinkedIn address under the contact, a line at 0.8 of the size.
  const linked = speakers.some((sp) => sp.linkedIn) ? 0.3 : 0;
  const sx = (W - sw * speakers.length) / 2;
  const captions = speakers.map((sp, i) => {
    const x = sx + i * sw;
    const tone = personAccent(i) === "secondary" ? c.purple : c.teal;
    const paras: Para[] = [
      { runs: [{ text: sp.name }], mono: true, bold: true, after: 2 },
      {
        runs: [caps(sp.company, { color: tone })],
        mono: true,
        bold: true,
        rel: 0.7,
        after: 6,
      },
      ...(sp.contact
        ? [
            {
              runs: [
                {
                  text: sp.contact,
                  options: {
                    color: tone,
                    ...(sp.contact.includes("@")
                      ? { hyperlink: { url: `mailto:${sp.contact}` } }
                      : {}),
                  },
                },
              ],
              rel: 0.8,
            },
          ]
        : []),
      ...(sp.linkedIn ? [{ ...profileLink(sp.linkedIn, c), rel: 0.8 }] : []),
    ];
    return { sp, tone, paras, x, portraitX: x + sw / 2 - 0.55 };
  });
  return { captions, width: sw, captionHeight: 1 + linked, height: 2.35 + linked };
}

/** Draws the portraits and captions at their measured widths. */
export function portraitRow(
  sheet: Sheet,
  layout: ReturnType<typeof portraitLayout>,
  y: number,
): void {
  for (const { sp, tone, paras, x, portraitX } of layout.captions) {
    sheet.portrait(sp, { x: portraitX, y, d: 1.1 }, tone);
    sheet.box(
      paras,
      { x, y: y + 1.2, w: layout.width, h: layout.captionHeight },
      { size: PT.h4, color: sheet.c.ink, align: "center" },
    );
  }
}

/** The claim and attributed quote paragraphs under a contact column. */
export function closingTail(look: Look, d: ClosingSlide): Para[] {
  const { c } = look;
  const tail: Para[] = [];
  const claim = closingClaim(d, look.lang);
  if (claim) {
    // The claim in muted ink, the word brand names for it in teal, one step below a quote's
    // lead, as ClosingSlide draws it.
    const [before, word, after] = claimParts(claim);
    tail.push({
      rel: PT.h4 / PT.lead,
      runs: [
        { text: before, options: { color: c.muted } },
        { text: word, options: { color: c.teal } },
        { text: after, options: { color: c.muted } },
      ].filter((r) => r.text),
      mono: true,
      bold: true,
      after: 3.5 * REM * 72,
      align: "center",
      balance: true,
    });
  }
  if (d.closingQuote) {
    const mark = { color: mixColor(c.teal, c.bg, 0.7) };
    tail.push({
      runs: [
        { text: "“", options: mark },
        ...md(d.closingQuote, c, { color: c.muted }),
        { text: "”", options: mark },
      ],
      mono: true,
      bold: true,
      align: "center",
      balance: true,
    });
  }
  return tail;
}

const CONTACT_GAP = 3.5 * REM;

/** The lockup and each partner's logo and multiplication sign in drawing order. */
export function contactMark(look: Look, d: ClosingSlide) {
  // The web's contact slide without portraits: the lockup in the centre column, each speaker's
  // name and contact lines under it.
  const lockH = 91.7 / 144;
  const [path, ratio] = brandCut(`lockup${look.dark ? "-night" : ""}`);
  const lockW = lockH * ratio;
  // As on the web: each partner's logo at the lockup's height, a × after it.
  const partners = d.partners ?? [];
  const times = 0.5;
  const pad = 0.35;
  const partnerW = partners.map((p) => (lockH * p.width) / p.height);
  let x = (W - lockW - partnerW.reduce((sum, w) => sum + w + 2 * pad + times, 0)) / 2;
  const logos = partners.map((p, i) => {
    const logo = {
      src: p.src,
      alt: p.alt ?? p.company,
      x,
      w: partnerW[i],
      timesX: x + partnerW[i] + pad,
    };
    x += partnerW[i] + 2 * pad + times;
    return logo;
  });
  return { path, lockX: x, lockW, lockH, times, logos };
}

interface ContactBox {
  kind: "text";
  text: Para | Para[];
  x: number;
  w: number;
  h: number;
  o: BoxOpts;
  advance: number;
}

type ContactBand =
  | ContactBox
  | { kind: "mark"; mark: ReturnType<typeof contactMark>; advance: number }
  | { kind: "portraits"; portraits: ReturnType<typeof portraitLayout>; advance: number }
  | { kind: "space"; advance: number };

/** The middle of the contact column, a lockup with captions or a portrait row. */
export function contactBody(look: Look, d: ClosingSlide): ContactBand[] {
  const speakers = d.speakers ?? [];
  if (!centredMark(d)) {
    if (!speakers.length) return [];
    const portraits = portraitLayout(look, speakers);
    return [{ kind: "portraits", portraits, advance: portraits.height + CONTACT_GAP }];
  }

  const mark = contactMark(look, d);
  const shown = companiesWithLogo(d);
  const captions = speakers.map((sp): ContactBox => {
    const text = speakerParas(look, sp, shown);
    const o: BoxOpts = { size: 17.5, color: look.c.ink, line: 1.4, align: "center" };
    const h = look.need(text, CW, o);
    return { kind: "text", text, x: EDGE, w: CW, h, o, advance: h + 2 * REM };
  });
  return [
    { kind: "mark", mark, advance: mark.lockH + CONTACT_GAP },
    ...captions,
    { kind: "space", advance: CONTACT_GAP - 2 * REM },
  ];
}

/** Measures the contact column before drawing its text and pictures. */
export function contactLayout(look: Look, d: ClosingSlide) {
  // As ContactVariant: the line, the mark row, the speakers and the closing lines 3.5 rem apart,
  // the column centred in the slide.
  const { c } = look;
  const bands: ContactBand[] = [];
  if (d.line1) {
    const o: BoxOpts = {
      size: PT.display,
      mono: true,
      bold: true,
      color: c.ink,
      tracking: -0.04,
      line: LEADING.display,
      align: "center",
    };
    const text = literal(d.line1);
    const h = look.need(text, CW, o);
    bands.push({
      kind: "text",
      text: { ...text, balance: true },
      x: EDGE,
      w: CW,
      h,
      o,
      advance: h + CONTACT_GAP,
    });
  }
  bands.push(...contactBody(look, d));
  const tail = closingTail(look, d);
  if (tail.length) {
    const o: BoxOpts = { size: PT.lead, color: c.muted, line: 1.25, tracking: -0.025 };
    // max-w-7xl less the web line's 5vw sides (--slide-closing-side), EDGE at the 1920 stage.
    const w = Math.min(CW, 80 * REM) - 2 * EDGE;
    const h = look.need(tail, w, o);
    bands.push({ kind: "text", text: tail, x: (W - w) / 2, w, h, o, advance: h });
  }
  const end = bands.reduce((y, band) => y + band.advance, 0);
  return { bands, height: tail.length ? end : end - CONTACT_GAP };
}

/** Draws the partner marks, separators and the brand lockup. */
export function drawContactMark(
  sheet: Sheet,
  mark: ReturnType<typeof contactMark>,
  y: number,
): void {
  const { logos, path, lockX, lockW, lockH, times } = mark;
  for (const logo of logos) {
    sheet.picture(logo.src, { x: logo.x, y, w: logo.w, h: lockH }, { alt: logo.alt });
    sheet.box(
      "×",
      { x: logo.timesX, y, w: times, h: lockH },
      { size: PT.s6, color: sheet.c.muted, align: "center", valign: "middle" },
    );
  }
  sheet.slide.addImage({ path, x: lockX, y, w: lockW, h: lockH, altText: HW_LOGO.alt });
}

/** Draws the centred contact column with its speakers and closing lines. */
export function drawContact(sheet: Sheet, d: ClosingSlide): void {
  const { bands, height } = contactLayout(sheet, d);
  let y = (H - height) / 2;
  for (const band of bands) {
    switch (band.kind) {
      case "text":
        sheet.box(band.text, { x: band.x, y, w: band.w, h: band.h }, band.o);
        break;
      case "mark":
        drawContactMark(sheet, band.mark, y);
        break;
      case "portraits":
        portraitRow(sheet, band.portraits, y);
        break;
      case "space":
        break;
    }
    y += band.advance;
  }
}
