"use client";

/** The engine's image, a plain `<img>` without an adapter: every call site passes an explicit
 *  width and height and a runtime `src` out of the deck data, so an optimizer has nothing to
 *  infer. */
import { useSlidesAdapter, type ImageProps } from "../../lib/adapter";
import { logoUrl } from "../../lib/brand-logos";
import { usePrintMode } from "../../lib/print-context";

export default function Image({ src, priority, unoptimized, alt, ...rest }: ImageProps) {
  const { Image: Framework } = useSlidesAdapter();
  // Print loads eagerly: the print route stacks every slide below the fold, where lazy images
  // leave the PDF's frames empty.
  const printMode = usePrintMode();
  const eager = priority || printMode;
  const shared = { ...rest, src: logoUrl(src), alt: alt ?? "" };
  if (Framework)
    return (
      <Framework
        {...shared}
        priority={priority}
        loading={eager ? "eager" : undefined}
        unoptimized={unoptimized}
      />
    );
  return (
    <img
      {...shared}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
