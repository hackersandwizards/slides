"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "../ui/image";
import type { ContentBlock, GalleryItem } from "../../types/slide";
import { renderMarkdown } from "../../lib/markdown";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { isVideo } from "../../lib/gallery-media";
import { LinkCaption, PictureLink, SlideCard, VideoPlayer } from "./primitives";

/** An image, video or linked image: centred, and on a titled slide as large as the body's free
 *  height allows, never larger than its own file. */
function MediaFrame({
  children,
  below,
  boxClassName = "",
}: {
  children: ReactNode;
  below?: ReactNode;
  boxClassName?: string;
}) {
  return (
    <figure className="slide-media">
      <div className={`slide-media-box ${boxClassName}`}>{children}</div>
      {below}
    </figure>
  );
}

/** A picture in the media frame. Once its file has loaded, it may grow to fill the frame, up to
 *  twice its own pixel width on the 1920 px stage (90rem): a screenshot left at its file's size
 *  stands small in an empty body, and its text is unreadable in the room. */
function MediaPicture({ src, alt, className }: { src: string; alt?: string; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fill, setFill] = useState<string>();
  useLayoutEffect(() => {
    const img = ref.current?.querySelector("img");
    if (!img) return;
    const measure = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w && h) setFill(`min(100cqw, ${w / h} * 100cqh, ${(w * 2 * 90) / 1920}rem)`);
    };
    measure();
    img.addEventListener("load", measure);
    return () => img.removeEventListener("load", measure);
  }, [src]);
  return (
    <span
      ref={ref}
      className="contents"
      style={fill ? ({ "--media-fill": fill } as CSSProperties) : undefined}
    >
      <Image src={src} alt={alt || ""} width={1920} height={1080} className={className} />
    </span>
  );
}

export function ImageBlock({ block }: { block: Extract<ContentBlock, { type: "image" }> }) {
  return (
    <MediaFrame>
      <MediaPicture
        src={block.src}
        alt={block.alt}
        className="slide-media-item rounded-brand border border-border"
      />
    </MediaFrame>
  );
}

/** Pictures that replace each other in place, one per ArrowRight: a diagram built up step by step
 *  without a slide change. They share one cell, so the frame keeps the size of the largest and
 *  nothing moves between steps; no border, since a diagram's own ground is its edge. */
export function ImageStepsBlock({
  block,
}: {
  block: Extract<ContentBlock, { type: "image-steps" }>;
}) {
  const { revealedCount } = useProgressiveReveal({ totalSteps: block.steps.length - 1 });
  const caption = block.steps[revealedCount]?.caption;
  return (
    <MediaFrame
      boxClassName="slide-media-steps"
      below={
        caption && (
          <figcaption className="slide-media-caption">{renderMarkdown(caption)}</figcaption>
        )
      }
    >
      {block.steps.map((step, i) => (
        <MediaPicture
          key={step.src}
          src={step.src}
          alt={i === revealedCount ? `${block.alt}, ${i + 1}/${block.steps.length}` : ""}
          className={`slide-media-item ${i === revealedCount ? "visible" : "invisible"}`}
        />
      ))}
    </MediaFrame>
  );
}

export function VideoBlock({ block }: { block: Extract<ContentBlock, { type: "video" }> }) {
  return (
    <MediaFrame
      boxClassName="pb-10"
      below={
        block.caption && <figcaption className="slide-media-caption">{block.caption}</figcaption>
      }
    >
      <VideoPlayer
        src={block.src}
        poster={block.poster}
        alt={block.alt}
        className="slide-media-item"
      />
    </MediaFrame>
  );
}

export function LinkedImageBlock({
  block,
}: {
  block: Extract<ContentBlock, { type: "linked-image" }>;
}) {
  const picture = (
    <MediaPicture
      src={block.src}
      alt={block.alt}
      className="slide-media-item rounded-brand border border-border"
    />
  );
  return (
    <MediaFrame below={block.href && <LinkCaption href={block.href} />}>
      {block.href ? <PictureLink href={block.href}>{picture}</PictureLink> : picture}
    </MediaFrame>
  );
}

function GalleryFigure({ item, row }: { item: GalleryItem; row: boolean }) {
  const caption = item.caption && (
    <figcaption className="slide-media-caption text-center">
      {renderMarkdown(item.caption)}
    </figcaption>
  );
  const frame = "rounded-brand border border-border";
  if (isVideo(item))
    return (
      <figure className="m-0 flex min-w-0 flex-col gap-(--slide-media-gap) pb-10">
        <VideoPlayer
          src={item.src}
          poster={item.poster}
          alt={item.alt}
          className="h-auto max-h-(--slide-picture-max-media) w-full object-contain"
        />
        {caption}
      </figure>
    );
  const height = item.height ?? 300;
  return (
    <figure className="m-0 flex min-w-0 shrink flex-col items-center gap-(--slide-media-gap)">
      {row ? (
        <Image
          src={item.src}
          alt={item.alt ?? ""}
          width={400}
          height={height}
          style={{ maxHeight: `min(${height / 16}rem, var(--slide-picture-max-media))` }}
          className={`h-auto w-auto min-w-0 object-contain object-top ${frame}`}
        />
      ) : (
        <Image
          src={item.src}
          alt={item.alt ?? ""}
          width={1920}
          height={1080}
          className={`h-auto max-h-(--slide-picture-max-media) w-auto max-w-full ${frame}`}
        />
      )}
      {caption}
    </figure>
  );
}

// Tailwind sees each class whole.
const GALLERY_COLUMNS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3" };

export function GalleryBlock({ block }: { block: Extract<ContentBlock, { type: "gallery" }> }) {
  const row = block.layout === "row";
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        data-hw-repeat={block.items.length > 1 ? "" : undefined}
        className={
          row
            ? // One bottom line, so the captions under pictures of different heights align; on a
              // phone the pictures stand one under another, as a grid's do.
              "flex items-end justify-center gap-3 max-md:flex-col max-md:items-center"
            : `grid w-full gap-6 ${GALLERY_COLUMNS[Math.min(block.items.length, 3)] ?? ""}`
        }
      >
        {block.items.map((item, i) => (
          <GalleryFigure key={i} item={item} row={row} />
        ))}
      </div>
      {block.tags && block.tags.length > 0 && (
        <div className="flex max-w-4xl flex-wrap justify-center gap-2">
          {block.tags.map((tag, i) => (
            <span key={i} className="hw-pill" data-variant="outline">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageAndGridBlock({
  block,
}: {
  block: Extract<ContentBlock, { type: "image-and-grid" }>;
}) {
  return (
    <div className="grid grid-cols-[2fr_3fr] items-center gap-10">
      {block.image.sketch ? (
        <div className="relative min-h-(--slide-picture-max) self-stretch">
          <Image
            src={block.image.src}
            alt={block.image.alt || ""}
            width={1200}
            height={1200}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <Image
            src={block.image.src}
            alt={block.image.alt || ""}
            width={1200}
            height={1500}
            className="h-auto max-h-(--slide-picture-max) w-auto rounded-brand border border-border"
          />
        </div>
      )}
      <div className="flex flex-col gap-4" data-hw-repeat={block.items.length > 1 ? "" : undefined}>
        {block.gridTitle && (
          <h2 className="hw-label mb-2 [--hw-label-size:var(--text-base)]" data-hue="purple">
            {renderMarkdown(block.gridTitle)}
          </h2>
        )}
        {block.items.map((item, i) => (
          <SlideCard key={i} tone="secondary" look="line" className="card-pad-4/6">
            <p className="mb-1 card-title text-xl text-text">{renderMarkdown(item.title)}</p>
            <p className="card-text-lg text-text">{renderMarkdown(item.subtitle)}</p>
          </SlideCard>
        ))}
      </div>
    </div>
  );
}
