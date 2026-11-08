"use client";

import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Image from "../ui/image";
import type { StatementSlide as StatementSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { DeckLang, SlideShell, groundOf } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { qrAlt } from "../../lib/slide-utils";
import {
  DisplayHeading,
  LinkCaption,
  PictureLink,
  Portrait,
  SlideCard,
  SlideFooter,
  TitledContent,
} from "./primitives";

interface Props {
  slide: StatementSlideType;
}

function HighlightedLine({ line, highlighted }: { line: string; highlighted?: string }) {
  if (!highlighted || !line.includes(highlighted)) {
    return <>{line}</>;
  }

  const idx = line.indexOf(highlighted);
  const before = line.slice(0, idx);
  const after = line.slice(idx + highlighted.length);

  return (
    <>
      {before}
      <span className="text-primary">{highlighted}</span>
      {after}
    </>
  );
}

/** At most 11/24 (46%) of the slide wide: wider, it would push the headline under the top strip. */
function LinkedPicture({ image }: { image: NonNullable<StatementSlideType["linkedImage"]> }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Kept with the file it was measured on, so the next picture never takes the last one's shape.
  const [measured, setMeasured] = useState<{ src: string; ratio: number }>();
  const ratio = measured?.src === image.src ? measured.ratio : undefined;
  useLayoutEffect(() => {
    const img = ref.current?.querySelector("img");
    if (!img) return;
    const measure = () => {
      if (img.naturalWidth && img.naturalHeight)
        setMeasured({ src: image.src, ratio: img.naturalWidth / img.naturalHeight });
    };
    measure();
    img.addEventListener("load", measure);
    return () => img.removeEventListener("load", measure);
  }, [image.src]);
  const picture = (
    <span
      ref={ref}
      className="block w-full"
      style={ratio ? { width: `min(100%, ${ratio} * var(--slide-picture-max))` } : undefined}
    >
      <Image
        src={image.src}
        alt={image.alt ?? ""}
        width={1920}
        height={1080}
        className="h-auto max-h-(--slide-picture-max) w-full rounded-brand border border-border object-contain"
      />
    </span>
  );
  return (
    <figure className="mx-auto mt-10 flex w-11/24 flex-col items-center gap-4">
      {image.href ? <PictureLink href={image.href}>{picture}</PictureLink> : picture}
      {image.href && <LinkCaption href={image.href} />}
    </figure>
  );
}

function CrossedOut({ text }: { text: string }) {
  return (
    <BlurFade delay={0.05} duration={0.4}>
      <p className="mb-6 font-heading text-3xl text-text-subtle md:text-4xl">
        <s className="line-through decoration-text-subtle decoration-(length:--slide-rule-strong)">
          {text}
        </s>
      </p>
    </BlurFade>
  );
}

/** The statement's lines: a column of flex items, so one line's descender bleed never collapses
 *  into the next line's and opens a gap between them. */
function Lines({ slide, size }: { slide: StatementSlideType; size: "xl" | "lg" | "md" }) {
  return (
    <div className="flex flex-col">
      {slide.lines.map((line, index) => (
        <BlurFade key={index} delay={0.1 + index * 0.08} duration={0.4}>
          <DisplayHeading as="div" size={size}>
            <HighlightedLine line={line} highlighted={slide.highlighted} />
          </DisplayHeading>
        </BlurFade>
      ))}
    </div>
  );
}

function delaysOf(slide: StatementSlideType) {
  const afterLines = 0.1 + slide.lines.length * 0.08;
  return { afterLines, closing: afterLines + (slide.points?.length ?? 0) * 0.06 + 0.05 };
}

function Points({ points, delay }: { points: string[]; delay: number }) {
  return points.map((point, index) => (
    <BlurFade key={index} delay={delay + index * 0.06} duration={0.4}>
      <div className="flex items-baseline gap-5 text-left text-xl text-text-muted md:text-2xl">
        <span className="shrink-0 font-heading text-2xl font-bold tracking-tight text-primary tabular-nums md:text-3xl">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="leading-snug">{renderMarkdown(point)}</span>
      </div>
    </BlurFade>
  ));
}

function LeftLines({ slide, size }: { slide: StatementSlideType; size: "lg" | "md" }) {
  return (
    <>
      {slide.kicker && (
        <BlurFade delay={0.05} duration={0.4}>
          <p className="hw-label mb-6 [--hw-label-size:var(--text-base)]">{slide.kicker}</p>
        </BlurFade>
      )}
      {slide.crossedOut && <CrossedOut text={slide.crossedOut} />}
      <Lines slide={slide} size={size} />
    </>
  );
}

function LeftClosing({ slide, delay }: { slide: StatementSlideType; delay: number }) {
  const quoted = slide.closingStyle === "quote";
  return (
    <BlurFade delay={delay} duration={0.4}>
      <p className="mt-6 text-4xl leading-snug font-semibold text-text">
        {quoted && <span className="text-primary">&ldquo;</span>}
        {renderMarkdown(slide.closing!)}
        {quoted && <span className="text-primary">&rdquo;</span>}
      </p>
    </BlurFade>
  );
}

/** What a statement says under its lines, at the left edge, entering `shift` seconds later than
 *  after its lines; `closing: false` leaves the closing to the caller. */
function LeftSupport({
  slide,
  closing = true,
  shift = 0,
}: {
  slide: StatementSlideType;
  closing?: boolean;
  shift?: number;
}) {
  const delays = delaysOf(slide);
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
      {slide.linkedImage && <LinkedPicture image={slide.linkedImage} />}
      {slide.points && slide.points.length > 0 && (
        <div className="mt-8 space-y-5">
          <Points points={slide.points} delay={start} />
        </div>
      )}
      {closing && slide.closing && <LeftClosing slide={slide} delay={delays.closing + shift} />}
    </>
  );
}

function LeftStatement({ slide, children }: { slide: StatementSlideType; children: ReactNode }) {
  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)}>
      <TitledContent>
        <div className="my-auto">{children}</div>
        {slide.footer && (
          <SlideFooter className="w-full" delay={delaysOf(slide).closing + 0.2}>
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
function QrStatement({
  slide,
  qr,
}: {
  slide: StatementSlideType;
  qr: NonNullable<StatementSlideType["qr"]>;
}) {
  const alt = qrAlt(qr.href, useContext(DeckLang));
  return (
    <LeftStatement slide={slide}>
      <div className="flex items-start gap-20">
        <div className="min-w-0 flex-1">
          <LeftLines slide={slide} size="lg" />
          <LeftSupport slide={slide} />
        </div>
        <BlurFade delay={delaysOf(slide).afterLines} duration={0.4}>
          <figure className="slide-qr flex shrink-0 flex-col items-center gap-4">
            <SlideCard className="size-(--slide-qr) bg-white card-pad-10">
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
function Quotation({ slide, attribution }: { slide: StatementSlideType; attribution: string }) {
  const quotedClosing = !!slide.closing && slide.closingStyle === "quote";
  const { afterLines } = delaysOf(slide);
  const lead = quotedClosing ? 0.1 : 0.05;
  const said = (
    <>
      <LeftLines slide={slide} size={slide.imageSrc ? "md" : "lg"} />
      {quotedClosing && <LeftClosing slide={slide} delay={afterLines} />}
      <BlurFade delay={afterLines + lead} duration={0.4}>
        <Attribution text={attribution} />
      </BlurFade>
    </>
  );
  // The slide's own words, kept apart from the name, so they never read as part of what was said;
  // without any, the empty box takes no space.
  const own = (
    <div className="mt-10 empty:hidden">
      <LeftSupport slide={slide} closing={!quotedClosing} shift={lead + 0.1} />
    </div>
  );
  return (
    <LeftStatement slide={slide}>
      {slide.imageSrc ? (
        <div className="flex items-center gap-16">
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

export function StatementSlide({ slide }: Props) {
  if (slide.attribution) return <Quotation slide={slide} attribution={slide.attribution} />;
  if (slide.qr) return <QrStatement slide={slide} qr={slide.qr} />;
  const hasSupporting = (slide.points && slide.points.length > 0) || slide.closing;
  const isSimple = !hasSupporting && !slide.subtitle && !slide.highlighted && !slide.crossedOut;
  const { afterLines: pointBaseDelay, closing: closingDelay } = delaysOf(slide);
  // The closing keeps its own gap only after the points: without them the box's gap stands alone,
  // so a subtitle running into the closing reads as one.
  const afterPoints = slide.points?.length ? "mt-10" : "";
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

        <div className={`text-center ${hasSupporting ? "mb-2" : ""}`}>
          {slide.crossedOut && <CrossedOut text={slide.crossedOut} />}
          <Lines slide={slide} size={isSimple ? "xl" : "lg"} />

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

        {slide.linkedImage && (
          <BlurFade delay={0.1 + slide.lines.length * 0.08} duration={0.4} className="w-full">
            <LinkedPicture image={slide.linkedImage} />
          </BlurFade>
        )}

        {hasSupporting && (
          <div className="mt-10 w-full max-w-4xl">
            {slide.points && slide.points.length > 0 && (
              <div className="mx-auto mt-4 w-fit space-y-5">
                <Points points={slide.points} delay={pointBaseDelay} />
              </div>
            )}

            {slide.closing && (
              <BlurFade delay={closingDelay} duration={0.4}>
                {slide.closingStyle === "quote" ? (
                  <p
                    className={`${afterPoints} text-center text-2xl font-semibold tracking-tight text-text-subtle italic md:text-3xl`}
                  >
                    <span className="text-primary/70">&ldquo;</span>
                    {renderMarkdown(slide.closing)}
                    <span className="text-primary/70">&rdquo;</span>
                  </p>
                ) : (
                  // At the subtitle's size: smaller, the payoff reads quieter than its grey setup.
                  <p
                    className={`${afterPoints} text-center text-2xl leading-snug font-semibold tracking-tight text-balance text-text sm:text-3xl md:text-4xl md:leading-snug`}
                  >
                    {renderMarkdown(slide.closing)}
                  </p>
                )}
              </BlurFade>
            )}
          </div>
        )}

        {slide.footer && (
          <SlideFooter
            className="mt-auto w-full text-left"
            delay={(slide.closing ? closingDelay : pointBaseDelay) + 0.2}
          >
            {renderMarkdown(slide.footer)}
          </SlideFooter>
        )}
      </div>
    </SlideShell>
  );
}
