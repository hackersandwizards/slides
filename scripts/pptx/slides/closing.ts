import type { Slide } from "../../../types/slide";
import { HW_LOGO } from "../../../lib/logo";
import { profileLabel } from "../../../lib/link-labels";
import { claimParts, companiesWithLogo } from "../../../lib/closing-copy";
import { closingClaim } from "../../../lib/slide-utils";
import { personAccent } from "../../../lib/people-slides";
import { centredMark, header } from "../chrome";
import { brandCut } from "../images";
import { profileLink } from "../people";
import { mixColor } from "../palette";
import { drySheet, type Sheet } from "../sheet";
import { W, H, EDGE, CW, PT, LEADING, REM, BODY } from "../stage";
import { caps, md, literal, type Para, type BoxOpts } from "../text";

export function drawClosing(sheet: Sheet, d: Extract<Slide, { type: "closing" }>): void {
  const { c } = sheet;
  if (d.variant === "discussion") {
    const y = header(sheet, { headline: d.headline ?? d.line1 ?? sheet.words.discussion });
    // Each seed question on its own card, as the web's: 1.25 rem over and under it, 2 rem
    // beside, 1.5 rem between the cards, the question muted.
    const a = BODY(y);
    const [padY, padX, gap] = [1.25 * REM, 2 * REM, 1.5 * REM];
    const o: BoxOpts = { size: PT.h4, color: c.muted, line: 1.35 };
    const qs = d.seedQuestions ?? [];
    const hs = qs.map((q) => sheet.need(literal(q), a.w - 2 * padX, o));
    const total = hs.reduce((sum, h) => sum + h + 2 * padY, 0) + Math.max(0, qs.length - 1) * gap;
    let qy = a.y + Math.max(0, a.h - total) / 2.25;
    qs.forEach((q, i) => {
      sheet.card({ x: a.x, y: qy, w: a.w, h: hs[i] + 2 * padY }, sheet.c.plainCard);
      sheet.box(literal(q), { x: a.x + padX, y: qy + padY, w: a.w - 2 * padX, h: hs[i] }, o);
      qy += hs[i] + 2 * padY + gap;
    });
    return;
  }
  // As ContactVariant: the line, the mark row, the speakers and the closing lines 3.5 rem apart,
  // the column centred in the slide; drawn once on DRY to measure it.
  const gap = 3.5 * REM;
  const column = (sheet: Sheet, y: number) => {
    const { slide: s } = sheet;
    const head = d.line1;
    if (head) {
      const o: BoxOpts = {
        size: PT.display,
        mono: true,
        bold: true,
        color: c.ink,
        tracking: -0.04,
        line: LEADING.display,
        align: "center",
      };
      const hh = sheet.need(literal(head), CW, o);
      sheet.box({ ...literal(head), balance: true }, { x: EDGE, y, w: CW, h: hh }, o);
      y += hh + gap;
    }
    const speakers = d.speakers ?? [];
    if (centredMark(d)) {
      // The web's contact slide without portraits: the lockup in the centre column, each speaker's
      // name and contact lines under it.
      const lockH = 91.7 / 144;
      const [path, ratio] = brandCut(`lockup${sheet.dark ? "-night" : ""}`);
      const lockW = lockH * ratio;
      // As on the web: each partner's logo at the lockup's height, a × after it.
      const partners = d.partners ?? [];
      const times = 0.5;
      const pad = 0.35;
      const partnerW = partners.map((p) => (lockH * p.width) / p.height);
      let x = (W - lockW - partnerW.reduce((sum, w) => sum + w + 2 * pad + times, 0)) / 2;
      partners.forEach((p, i) => {
        sheet.picture(p.src, { x, y, w: partnerW[i], h: lockH }, { alt: p.alt ?? p.company });
        sheet.box(
          "×",
          { x: x + partnerW[i] + pad, y, w: times, h: lockH },
          {
            size: PT.s6,
            color: c.muted,
            align: "center",
            valign: "middle",
          },
        );
        x += partnerW[i] + 2 * pad + times;
      });
      s.addImage({
        path,
        x,
        y,
        w: lockW,
        h: lockH,
        altText: HW_LOGO.alt,
      });
      y += lockH + gap;
      const shown = companiesWithLogo(d);
      for (const sp of speakers) {
        const paras: Para[] = [
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
        const po: BoxOpts = { size: 17.5, color: c.ink, line: 1.4, align: "center" };
        const ph = sheet.need(paras, CW, po);
        sheet.box(paras, { x: EDGE, y, w: CW, h: ph }, po);
        y += ph + 2 * REM;
      }
      y += gap - 2 * REM;
    } else if (speakers.length) {
      const sw = Math.min(3.2, CW / speakers.length);
      // The LinkedIn address under the contact, a line at 0.8 of the size.
      const linked = speakers.some((sp) => sp.linkedIn) ? 0.3 : 0;
      const sx = (W - sw * speakers.length) / 2;
      speakers.forEach((sp, i) => {
        const x = sx + i * sw;
        const tone = personAccent(i) === "secondary" ? c.purple : c.teal;
        sheet.portrait(sp, { x: x + sw / 2 - 0.55, y, d: 1.1 }, tone);
        sheet.box(
          [
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
          ],
          { x, y: y + 1.2, w: sw, h: 1 + linked },
          { size: PT.h4, color: c.ink, align: "center" },
        );
      });
      y += 2.35 + linked + gap;
    }
    const tail: Para[] = [];
    const claim = closingClaim(d, sheet.lang);
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
        after: gap * 72,
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
    if (tail.length) {
      const o: BoxOpts = { size: PT.lead, color: c.muted, line: 1.25, tracking: -0.025 };
      // max-w-7xl less the web line's 5vw sides (--slide-closing-side), EDGE at the 1920 stage.
      const tw = Math.min(CW, 80 * REM) - 2 * EDGE;
      const th = sheet.need(tail, tw, o);
      sheet.box(tail, { x: (W - tw) / 2, y, w: tw, h: th }, o);
      return y + th;
    }
    return y - gap;
  };
  // The measuring pass warns as the drawing pass will: its warnings are dropped.
  const height = column(drySheet(sheet), 0);
  column(sheet, (H - height) / 2);
}
