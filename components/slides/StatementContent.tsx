"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "../ui/image";
import type { StatementSlide as StatementSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { renderMarkdown } from "../../lib/markdown";
import { DisplayHeading, LinkCaption, PictureLink } from "./primitives";

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
export function StatementLinkedPicture({
  image,
}: {
  image: NonNullable<StatementSlideType["linkedImage"]>;
}) {
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

export function StatementCrossedOut({ text }: { text: string }) {
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
export function StatementLines({
  slide,
  size,
}: {
  slide: StatementSlideType;
  size: "xl" | "lg" | "md";
}) {
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

export function StatementPoints({ points, delay }: { points: string[]; delay: number }) {
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
