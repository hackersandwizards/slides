"use client";

/** The engine's image, a plain `<img>`: every call site passes an explicit width and height and a
 *  runtime `src` out of the deck data, so an optimizer has nothing to infer. */
import type { CSSProperties } from "react";
import { logoUrl } from "../../lib/brand-logos";
import { usePrintMode } from "../../lib/print-context";

export interface ImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  /** Above the fold: loads eagerly at high priority. */
  priority?: boolean;
}

export default function Image({ src, priority, alt, ...rest }: ImageProps) {
  // Print loads eagerly: the print route stacks every slide below the fold, where lazy images
  // leave the PDF's frames empty.
  const printMode = usePrintMode();
  const eager = priority || printMode;
  return (
    <img
      {...rest}
      src={logoUrl(src)}
      alt={alt ?? ""}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
