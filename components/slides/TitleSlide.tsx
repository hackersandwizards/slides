"use client";

import Image from "../ui/image";
import type { TitleSlide as TitleSlideType } from "../../types/slide";
import { isOpening, qrAlt, speakerLine } from "../../lib/slide-utils";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { DisplayHeading, LinkCaption, PictureLink } from "./primitives";

/** Inline, because the `white-space` shorthand of `whitespace-pre-line` resets the class's
 *  `text-wrap: balance`, which left a lone year on the subtitle's second line. */
const BALANCED = { textWrap: "balance" } as const;

interface Props {
  slide: TitleSlideType;
}

/** A talk's opening: kicker, name and title on the left, the title the largest line; speakers and
 *  event along the bottom, beside the QR code in the lower right. Blind panel 06.11.2026, two
 *  rounds of four reviewers (a hall attendee, a stream viewer, a brand designer, Codex): 8.02 of 10
 *  against 7.75 for the whole stack centred on the left with the QR code apart, 7.68 for the same
 *  bottom row under a rule, 7.31 for the QR code beside the speakers under the title, and 4.65 for
 *  the opening set as a centred content slide. Noise 0.69 per reviewer, so the first three tie; it
 *  ranked first or second with every reviewer. The QR code at 12rem, a quarter of the slide's
 *  height, the title block kept 2rem above the bottom row: blind panel 06.11.2026, two rounds (a
 *  hall attendee in row 15, a stream viewer, a presentation designer; Claude twice, Codex once),
 *  on a one-line and a three-line title: 7.58 of 10 against 7.25 for a code that takes what the
 *  title leaves between 16 and 10rem and 6.67 for 16rem, which on a three-line title crowded the
 *  title and shrank the whole slide; capping the code at the title block's height scored 7.15 in
 *  round one. Noise 0.44 (Claude), so the first two tie with Claude; Codex put 12rem 1.0 ahead. An
 *  earlier panel on the two-line specimen title alone had 16rem ahead, 8.00 against 7.00. */
function Opening({ slide }: Props) {
  return (
    <SlideShell direction="col" overflowHidden>
      <div className="slide-content relative z-10 flex flex-col items-stretch justify-between px-(--slide-side) pt-(--slide-top)">
        <BlurFade delay={0.1} duration={0.5} className="flex flex-1 flex-col justify-center pb-8">
          {slide.kicker && (
            <p className="hw-label mb-4 [--hw-label-size:var(--text-xl)]">{slide.kicker}</p>
          )}
          {slide.name && (
            <p className="mb-10 font-heading text-5xl font-bold tracking-tight text-primary">
              {slide.name}
            </p>
          )}
          <DisplayHeading as="div" size="lg" className="max-w-7xl">
            {slide.title}
          </DisplayHeading>
          {slide.subtitle && (
            <p
              className="mt-8 max-w-6xl text-3xl font-medium whitespace-pre-line text-text-muted"
              style={BALANCED}
            >
              {slide.subtitle}
            </p>
          )}
        </BlurFade>
        <BlurFade
          delay={0.25}
          duration={0.4}
          className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between md:gap-12"
        >
          <div>
            {slide.speakers && slide.speakers.length > 0 && (
              <p className="font-heading text-4xl font-bold text-text">{speakerLine(slide)}</p>
            )}
            {slide.event && <p className="mt-3 text-2xl text-text-muted">{slide.event}</p>}
          </div>
          {slide.qr && (
            <div className="flex shrink-0 flex-col items-center gap-3">
              <PictureLink href={slide.qr.href}>
                <Image
                  src={slide.qr.src}
                  alt={qrAlt(slide.qr.href, slide.lang)}
                  width={360}
                  height={360}
                  className="size-48 rounded-brand"
                />
              </PictureLink>
              <LinkCaption href={slide.qr.href} />
            </div>
          )}
        </BlurFade>
      </div>
    </SlideShell>
  );
}

/** A title with at most a subtitle stands centred on the ground, the subtitle under it in ink, the
 *  lockup in the corner. No gradient field and no decoration, as on the section divider:
 *  blind-scored against the title on the left half's gradient field and against the centred title
 *  with glow, particles and rule (2026-10-31). Any of the opening's fields draws the opening. */
export function TitleSlide({ slide }: Props) {
  if (isOpening(slide)) return <Opening slide={slide} />;
  return (
    <SlideShell direction="col" overflowHidden>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-8 text-center">
        <BlurFade delay={0.1} duration={0.5}>
          <DisplayHeading as="div">{slide.title}</DisplayHeading>
        </BlurFade>

        {slide.subtitle && (
          <BlurFade delay={0.2} duration={0.4}>
            <p
              className="mt-10 max-w-7xl text-2xl font-medium whitespace-pre-line text-text md:text-3xl"
              style={BALANCED}
            >
              {slide.subtitle}
            </p>
          </BlurFade>
        )}
      </div>
    </SlideShell>
  );
}
