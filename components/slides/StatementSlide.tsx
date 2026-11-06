"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "../ui/image";
import type { StatementSlide as StatementSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell, groundOf } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { DisplayHeading, LinkCaption, PictureLink, SlideFooter } from "./primitives";

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
      <span className="text-gradient-brand">{highlighted}</span>
      {after}
    </>
  );
}

/** A linked screenshot or QR code under the statement, at most 11/24 (46%) of the slide wide
 *  (blind review 02.11.: wider, it pushed the headline under the top strip), its link spelled out
 *  under it. Once the file has loaded, the frame takes the picture's own shape at the slide's
 *  picture height, so a square QR code stands in a square, not in a wide box. */
function LinkedPicture({ image }: { image: NonNullable<StatementSlideType["linkedImage"]> }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ratio, setRatio] = useState<number>();
  useLayoutEffect(() => {
    const img = ref.current?.querySelector("img");
    if (!img) return;
    const measure = () => {
      if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
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

export function StatementSlide({ slide }: Props) {
  const hasSupporting = (slide.points && slide.points.length > 0) || slide.closing;
  const isSimple = !hasSupporting && !slide.subtitle && !slide.highlighted && !slide.crossedOut;
  const pointBaseDelay = 0.1 + slide.lines.length * 0.08;
  // The closing keeps its own gap only after the points: without them the box's gap stands alone,
  // so a quotation running from the subtitle into the closing reads as one (blind panel 06.11.2026,
  // Claude and Codex: 7.75 of 10 against 5.75 for both gaps).
  const afterPoints = slide.points?.length ? "mt-10" : "";
  const closingDelay = pointBaseDelay + (slide.points?.length ?? 0) * 0.06 + 0.05;
  // The source of what the slide quotes: after the closing where there is one, since a quotation
  // may run from the subtitle into the closing.
  const attribution = slide.attribution && (
    <BlurFade delay={slide.closing ? closingDelay + 0.1 : pointBaseDelay} duration={0.4}>
      <p className="mt-8 text-xl text-text-muted md:text-2xl">— {slide.attribution}</p>
    </BlurFade>
  );

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
          {slide.crossedOut && (
            <BlurFade delay={0.05} duration={0.4}>
              <p className="mb-6 font-heading text-3xl text-text-subtle md:text-4xl">
                <s className="line-through decoration-text-subtle decoration-(length:--slide-rule-strong)">
                  {slide.crossedOut}
                </s>
              </p>
            </BlurFade>
          )}
          {/* A column of flex items, so one line's descender bleed never collapses into the next
              line's and opens a gap between them. */}
          <div className="flex flex-col">
            {slide.lines.map((line, index) => (
              <BlurFade key={index} delay={0.1 + index * 0.08} duration={0.4}>
                <DisplayHeading as="div" size={isSimple ? "xl" : "lg"}>
                  <HighlightedLine line={line} highlighted={slide.highlighted} />
                </DisplayHeading>
              </BlurFade>
            ))}
          </div>

          {slide.subtitle && (
            <BlurFade delay={0.1 + slide.lines.length * 0.08} duration={0.4}>
              {/* Sans in ink: since font-heading became the mono face, a multi-line subtitle set in
                  teal mono was the hardest text in a deck to read at a distance. */}
              <p className="mx-auto mt-8 max-w-5xl font-sans text-2xl leading-snug font-medium text-balance whitespace-pre-line text-text-muted sm:text-3xl md:text-4xl md:leading-snug">
                {renderMarkdown(slide.subtitle)}
              </p>
            </BlurFade>
          )}

          {!slide.closing && attribution}
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
                {slide.points.map((point, index) => (
                  <BlurFade key={index} delay={pointBaseDelay + index * 0.06} duration={0.4}>
                    <div className="flex items-baseline gap-5 text-left text-xl text-text-muted md:text-2xl">
                      <span className="shrink-0 font-heading text-2xl font-bold tracking-tight text-primary tabular-nums md:text-3xl">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-snug">{renderMarkdown(point)}</span>
                    </div>
                  </BlurFade>
                ))}
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
                  <p
                    className={`${afterPoints} text-center text-2xl font-semibold tracking-tight text-balance text-text md:text-3xl`}
                  >
                    {renderMarkdown(slide.closing)}
                  </p>
                )}
              </BlurFade>
            )}
            {slide.closing && <div className="text-center">{attribution}</div>}
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
