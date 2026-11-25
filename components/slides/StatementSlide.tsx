"use client";

import Image from "../ui/image";
import type { StatementSlide as StatementSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell, groundOf } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { closingLineOf, statementDelays } from "../../lib/statement-sequence";
import { SlideFooter } from "./primitives";
import { Quotation, QrStatement } from "./LeftStatementLayouts";
import {
  StatementCrossedOut,
  StatementLines,
  StatementLinkedPicture,
  StatementPoints,
} from "./StatementContent";

interface Props {
  slide: StatementSlideType;
}

export function StatementSlide({ slide }: Props) {
  if (slide.attribution) return <Quotation slide={slide} attribution={slide.attribution} />;
  if (slide.qr) return <QrStatement slide={slide} qr={slide.qr} />;
  return <CenteredStatement slide={slide} />;
}

function CenteredStatement({ slide }: Props) {
  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)}>
      <div
        className={`slide-content relative z-10 flex flex-col items-center justify-center ${slide.footer ? "px-(--slide-side) pt-(--slide-top)" : "px-16"}`}
      >
        {/* With a footer, the statement takes a titled slide's top and side padding, so the footer
            stands where a content slide's does, and centres between them: the two auto margins
            share the free height. */}
        {slide.footer && <div className="mt-auto" />}
        {slide.imageSrc && (
          <BlurFade delay={0.05} duration={0.4}>
            <Image
              src={slide.imageSrc}
              alt={slide.imageAlt ?? ""}
              width={120}
              height={120}
              className="mb-8 h-28 w-28 rounded-brand border-2 border-border object-cover"
            />
          </BlurFade>
        )}

        {slide.kicker && (
          <BlurFade delay={0.05} duration={0.4}>
            <p className="hw-label mb-8 [--hw-label-size:var(--text-base)]">{slide.kicker}</p>
          </BlurFade>
        )}

        <CenteredStatementHeadline slide={slide} />

        {slide.linkedImage && (
          <BlurFade delay={0.1 + slide.lines.length * 0.08} duration={0.4} className="w-full">
            <StatementLinkedPicture image={slide.linkedImage} />
          </BlurFade>
        )}

        <CenteredStatementSupport slide={slide} />

        <CenteredStatementFooter slide={slide} />
      </div>
    </SlideShell>
  );
}

function CenteredStatementFooter({
  slide,
}: {
  slide: Pick<StatementSlideType, "lines" | "points" | "closing" | "footer">;
}) {
  if (!slide.footer) return null;
  const { afterLines: pointBaseDelay, closing: closingDelay } = statementDelays(slide);
  return (
    <SlideFooter
      className="mt-auto w-full text-left"
      delay={(slide.closing ? closingDelay : pointBaseDelay) + 0.2}
    >
      {renderMarkdown(slide.footer)}
    </SlideFooter>
  );
}

function hasStatementSupport(slide: Pick<StatementSlideType, "points" | "closing">) {
  return Boolean(slide.points?.length || slide.closing);
}

function CenteredStatementHeadline({ slide }: Props) {
  const hasSupporting = hasStatementSupport(slide);
  const isSimple = !hasSupporting && !slide.subtitle && !slide.highlighted && !slide.crossedOut;
  return (
    <div className={`text-center ${hasSupporting ? "mb-2" : ""}`}>
      {slide.crossedOut && <StatementCrossedOut text={slide.crossedOut} />}
      <StatementLines slide={slide} size={isSimple ? "xl" : "lg"} />

      {slide.subtitle && (
        <BlurFade delay={0.1 + slide.lines.length * 0.08} duration={0.4}>
          {/* Sans: since font-heading became the mono face, a multi-line subtitle set in teal
              mono was the hardest text in a deck to read at a distance. */}
          <p className="mx-auto mt-8 max-w-5xl font-sans text-2xl leading-snug font-medium text-balance whitespace-pre-line text-text-muted sm:text-3xl md:text-4xl md:leading-snug">
            {renderMarkdown(slide.subtitle)}
          </p>
        </BlurFade>
      )}
    </div>
  );
}

function CenteredStatementSupport({ slide }: Props) {
  if (!hasStatementSupport(slide)) return null;
  const closing = closingLineOf(slide);
  const { afterLines: pointBaseDelay, closing: closingDelay } = statementDelays(slide);
  // The closing keeps its own gap only after the points: without them the box's gap stands alone,
  // so a subtitle running into the closing reads as one.
  const afterPoints = slide.points?.length ? "mt-10" : "";

  return (
    <div className="mt-10 w-full max-w-4xl">
      {slide.points && slide.points.length > 0 && (
        <div className="mx-auto mt-4 w-fit space-y-5">
          <StatementPoints points={slide.points} delay={pointBaseDelay} />
        </div>
      )}

      {closing && (
        <BlurFade delay={closingDelay} duration={0.4}>
          <StatementClosing closing={closing} gap={afterPoints} />
        </BlurFade>
      )}
    </div>
  );
}

const CLOSING_STYLES = {
  // At the subtitle's size: smaller, the payoff reads quieter than its grey setup.
  plain: {
    classes:
      "text-center text-2xl leading-snug font-semibold tracking-tight text-balance text-text sm:text-3xl md:text-4xl md:leading-snug",
    quoted: false,
  },
  quote: {
    classes:
      "text-center text-2xl font-semibold tracking-tight text-text-subtle italic md:text-3xl",
    quoted: true,
  },
} satisfies Record<
  NonNullable<ReturnType<typeof closingLineOf>>["kind"],
  { classes: string; quoted: boolean }
>;

function StatementClosing({
  closing,
  gap,
}: {
  closing: NonNullable<ReturnType<typeof closingLineOf>>;
  gap: string;
}) {
  const appearance = CLOSING_STYLES[closing.kind];
  return (
    <p className={`${gap} ${appearance.classes}`}>
      {appearance.quoted && <span className="text-primary/70">&ldquo;</span>}
      {renderMarkdown(closing.text)}
      {appearance.quoted && <span className="text-primary/70">&rdquo;</span>}
    </p>
  );
}
