import type { ContentBlock, GalleryItem, MediaSlide, ContentSlide } from "../types/slide";

export const isVideo = (item: GalleryItem) =>
  item.kind === "video" || /\.(mp4|webm|mov)$/i.test(item.src);

/** A `media` slide as the content slide that replaces it: one picture or video as its own block,
 *  several, or one with a caption or tags, as a `gallery`. */
export function mediaAsContent({
  sources,
  layout,
  tags,
  sectionLabel,
  sectionTheme,
  principle,
  headline,
}: MediaSlide): ContentSlide {
  const [one] = sources;
  const block: ContentBlock =
    sources.length === 1 && layout !== "row" && !one.caption && !tags?.length
      ? isVideo(one)
        ? { type: "video", src: one.src, alt: one.alt, poster: one.poster }
        : { type: "image", src: one.src, alt: one.alt }
      : { type: "gallery", items: sources, layout, tags };
  return {
    type: "content",
    sectionLabel,
    sectionTheme,
    principle,
    headline: headline ?? "",
    content: [block],
  };
}
