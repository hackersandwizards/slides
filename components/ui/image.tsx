"use client";

/** The engine's image. A consumer's adapter can put its framework's component behind it (talks
 *  puts `next/image`); without one it is a plain `<img>`: every call site passes an explicit width
 *  and height and a runtime `src` string out of the deck data, so there is nothing for an
 *  optimizer to infer at build time. */
import { useSlidesAdapter, type ImageProps } from "../../lib/adapter";
import { usePrintMode } from "../../lib/print-context";

export default function Image({ priority, unoptimized, alt, ...rest }: ImageProps) {
  const { Image: Framework } = useSlidesAdapter();
  // The print route stacks every slide of a deck, so all but the first screen are below the fold.
  // Lazy there means the PDF exports empty image frames, and each element screenshot scrolls a new
  // batch into view and waits for it. Print always loads eagerly.
  const printMode = usePrintMode();
  const eager = priority || printMode;
  if (Framework)
    return (
      <Framework
        {...rest}
        alt={alt ?? ""}
        priority={priority}
        loading={eager ? "eager" : undefined}
        unoptimized={unoptimized}
      />
    );
  return (
    <img
      {...rest}
      alt={alt ?? ""}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
