"use client";

import { useContext, type ReactNode } from "react";
import Image from "../ui/image";
import type { StatementSlide as StatementSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { DeckLang, SlideShell, groundOf } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { closingLineOf, statementDelays } from "../../lib/statement-sequence";
import { qrAlt } from "../../lib/link-labels";
import {
  LinkCaption,
  PictureLink,
  Portrait,
  SlideCard,
  SlideFooter,
  TitledContent,
} from "./primitives";
import {
  StatementCrossedOut,
  StatementLines,
  StatementLinkedPicture,
  StatementPoints,
} from "./StatementContent";

function LeftLines({ slide, size }: { slide: StatementSlideType; size: "lg" | "md" }) {
  return (
    <>
      {slide.kicker && (
        <BlurFade delay={0.05} duration={0.4}>
          <p className="hw-label mb-6 [--hw-label-size:var(--text-base)]">{slide.kicker}</p>
        </BlurFade>
      )}
      {slide.crossedOut && <StatementCrossedOut text={slide.crossedOut} />}
      <StatementLines slide={slide} size={size} />
    </>
  );
}

type ClosingLine = NonNullable<ReturnType<typeof closingLineOf>>;

function LeftClosing({ closing, delay }: { closing: ClosingLine; delay: number }) {
  const quoted = closing.kind === "quote";
  return (
    <BlurFade delay={delay} duration={0.4}>
      <p className="mt-6 text-4xl leading-snug font-semibold text-text">
        {quoted && <span className="text-primary">&ldquo;</span>}
        {renderMarkdown(closing.text)}
        {quoted && <span className="text-primary">&rdquo;</span>}
      </p>
    </BlurFade>
  );
}

/** What a statement says under its lines, at the left edge, entering `shift` seconds later than
 *  after its lines. */
function LeftSupport({
  slide,
  closing,
  shift = 0,
}: {
  slide: StatementSlideType;
  closing?: ClosingLine;
  shift?: number;
}) {
  const delays = statementDelays(slide);
  const start = delays.afterLines + shift;
  return (
    <>
      {slide.subtitle && (
        <BlurFade delay={start} duration={0.4}>
          <p className="mt-6 text-4xl leading-snug font-medium whitespace-pre-line text-text">
            {renderMarkdown(slide.subtitle)}
          </p>
        </BlurFade>
      )}
      {slide.linkedImage && <StatementLinkedPicture image={slide.linkedImage} />}
      {slide.points && slide.points.length > 0 && (
        <div className="mt-8 space-y-5">
          <StatementPoints points={slide.points} delay={start} />
        </div>
      )}
      {closing && <LeftClosing closing={closing} delay={delays.closing + shift} />}
    </>
  );
}

function LeftStatement({ slide, children }: { slide: StatementSlideType; children: ReactNode }) {
  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)}>
      <TitledContent>
        <div className="my-auto">{children}</div>
        {slide.footer && (
          <SlideFooter className="w-full" delay={statementDelays(slide).closing + 0.2}>
            {renderMarkdown(slide.footer)}
          </SlideFooter>
        )}
      </TitledContent>
    </SlideShell>
  );
}

/** A closing with a QR code: the words on the left, the code on the right, so neither fills the
 *  stage alone. The white card's padding is the code's quiet zone, so the brand corner never cuts
 *  a module. */
export function QrStatement({
  slide,
  qr,
}: {
  slide: StatementSlideType;
  qr: NonNullable<StatementSlideType["qr"]>;
}) {
  const alt = qrAlt(qr.href, useContext(DeckLang));
  return (
    <LeftStatement slide={slide}>
      <div className="flex items-start gap-20 max-md:flex-col max-md:items-stretch max-md:gap-8">
        <div className="min-w-0 flex-1">
          <LeftLines slide={slide} size="lg" />
          <LeftSupport slide={slide} closing={closingLineOf(slide)} />
        </div>
        <BlurFade delay={statementDelays(slide).afterLines} duration={0.4}>
          <figure className="slide-qr flex shrink-0 flex-col items-center gap-4">
            <SlideCard className="size-(--slide-qr) bg-white card-pad-10 max-md:size-48">
              <PictureLink href={qr.href}>
                <Image
                  src={qr.src}
                  alt={alt}
                  width={600}
                  height={600}
                  className="block size-full"
                />
              </PictureLink>
            </SlideCard>
            <LinkCaption href={qr.href} />
          </figure>
        </BlurFade>
      </div>
    </LeftStatement>
  );
}

function Attribution({ text }: { text: string }) {
  const name = text.split(",")[0];
  return (
    <p className="mt-8 text-3xl text-text-muted">
      <span className="font-semibold text-text">{name}</span>
      {text.slice(name.length)}
    </p>
  );
}

/** A statement someone is named for: at the left edge, since a centred passage reads worst, with
 *  its portrait beside it. Without one the words take the width behind brand's quote rule: a tile
 *  in its place reads as a missing photo. The name follows the words said, the lines and a
 *  closing set as a quote; the slide's own words (subtitle, points, a plain closing) come after
 *  it, outside the rule, so none of them reads as said. */
export function Quotation({
  slide,
  attribution,
}: {
  slide: StatementSlideType;
  attribution: string;
}) {
  const closing = closingLineOf(slide);
  const quotedClosing = closing?.kind === "quote" ? closing : undefined;
  const { afterLines } = statementDelays(slide);
  const lead = quotedClosing ? 0.1 : 0.05;
  const said = (
    <>
      <LeftLines slide={slide} size={slide.imageSrc ? "md" : "lg"} />
      {quotedClosing && <LeftClosing closing={quotedClosing} delay={afterLines} />}
      <BlurFade delay={afterLines + lead} duration={0.4}>
        <Attribution text={attribution} />
      </BlurFade>
    </>
  );
  // The slide's own words, kept apart from the name, so they never read as part of what was said;
  // without any, the empty box takes no space.
  const own = (
    <div className="mt-10 empty:hidden">
      <LeftSupport slide={slide} closing={quotedClosing ? undefined : closing} shift={lead + 0.1} />
    </div>
  );
  return (
    <LeftStatement slide={slide}>
      {slide.imageSrc ? (
        <div className="flex items-center gap-16 max-md:flex-col max-md:items-start max-md:gap-8">
          <BlurFade delay={0.05} duration={0.4} className="shrink-0">
            <Portrait src={slide.imageSrc} alt={slide.imageAlt ?? ""} size="2xl" />
          </BlurFade>
          <div className="min-w-0 flex-1">
            {said}
            {own}
          </div>
        </div>
      ) : (
        <>
          <blockquote className="hw-quote">{said}</blockquote>
          {own}
        </>
      )}
    </LeftStatement>
  );
}
