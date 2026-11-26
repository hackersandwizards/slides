import type { IconName } from "../lib/icons";
import type { SectionTheme, Grounded } from "./slide-theme";
import type { VisualBlock } from "./visual-block";
import type { PositionSide } from "./comparison-slides";
import type { StageState } from "./planning-slides";

export type ContentBlock =
  | { type: "paragraph"; text: string; centered?: boolean }
  | {
      type: "bullets";
      items: (string | { text: string; children: string[] })[];
      /** Numbers the top-level items, for steps that happen in order. */
      ordered?: boolean;
    }
  | {
      type: "table";
      headers?: string[];
      rows: string[][];
      compact?: boolean;
      /** Per ArrowRight: the first column, then one row's remaining cells at a time. */
      reveal?: boolean;
      /** Relative column widths. A table split across two slides sets the same on both halves,
       *  so its columns start at the same place on each. */
      widths?: number[];
    }
  | {
      type: "two-column";
      variant?:
        "success-error" | "error-success" | "error" | "error-neutral" | "success" | "neutral";
      left: { title?: string; items?: string[]; text?: string };
      right: { title?: string; items?: string[]; text?: string };
    }
  | { type: "code"; language: string; code: string }
  | {
      type: "code-and-text";
      language?: string;
      code: string;
      sections: { title: string; text: string }[];
    }
  | { type: "hooks"; items: { name: string; description: string }[] }
  | {
      /** @deprecated A `flow` block, which draws it: the container is its `frame`, the first new
       *  stage its `highlight`, else the first active one. Stage logos, `showLoops` and
       *  `showArrows` are not read. */
      type: "pipeline";
      stages: { title: string; state?: StageState; logo?: string }[];
      showLoops?: boolean;
      showArrows?: boolean;
      containerLabel?: string;
      containerLogos?: { src: string; alt: string }[];
      containerFooter?: string;
      containerSideNotes?: string[];
    }
  | { type: "image"; src: string; alt?: string }
  /** One picture per ArrowRight, each replacing the last in place: a diagram built up step by
   *  step on one slide. The caption under it names the step on screen; print shows the last. */
  | { type: "image-steps"; alt: string; steps: { src: string; caption?: string }[] }
  | {
      /** The image block's gallery form: pictures and videos side by side, a `row` at each
       *  picture's own `height` (a 300 px default on the 1920 stage) or a `grid` of equal cells,
       *  the default for two and more. A `caption` names its own picture; `tags`, a row of pills
       *  under the gallery, name what the pictures share. */
      type: "gallery";
      items: GalleryItem[];
      layout?: "grid" | "row";
      tags?: string[];
    }
  | {
      type: "video";
      src: string;
      alt?: string;
      caption?: string;
      /** The frame shown before the video plays and in the PDF and PPTX export. */
      poster?: string;
    }
  | {
      /** @deprecated A `cards` block with `columns: 4` and `items` per card, which draws it:
       *  `subtitle` is a card's `text`. */
      type: "four-column";
      columns: { title: string; subtitle?: string; items: string[] }[];
    }
  | {
      /** Someone else's words on a content slide, behind brand's quote rule; `source`, who said
       *  or wrote them, in Markdown, so it may link the place. */
      type: "quote";
      text: string;
      source?: string;
    }
  | {
      type: "callout";
      text: string;
      variant?: "info" | "warning" | "success";
      /** Spans the content width instead of fitting its text, so stacked callouts match. */
      fullWidth?: boolean;
    }
  | {
      /** @deprecated A `cards` block, which draws it: `subtitle` is a card's `text`, the
       *  `highlighted` item the block's `highlight`. */
      type: "labeled-grid";
      columns?: number;
      reveal?: boolean;
      items: { title: string; subtitle: string; highlighted?: boolean; fragment?: boolean }[];
    }
  | { type: "terminal"; commands: { prefix: string; text: string }[] }
  | { type: "linked-image"; src: string; alt?: string; href?: string }
  | {
      type: "image-and-grid";
      /** `sketch`: a drawing on a transparent or plain ground, such as a marker sketch, which
       *  stands without a frame. A screenshot or photo, which needs an edge, leaves it out. */
      image: { src: string; alt?: string; sketch?: boolean };
      gridTitle?: string;
      items: { title: string; subtitle: string }[];
    }
  | {
      /** @deprecated A `comparison` slide with `variant: "positions"`, which draws it the same
       *  way. */
      type: "positions";
      left: PositionSide;
      right: PositionSide;
      middle?: string;
      resolution: string;
    }
  | VisualBlock;
export interface ContentSlide extends Grounded {
  type: "content";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline: string;
  subtitle?: string;
  /** `centered` renders as a statement slide where its blocks fit one (`centeredAsStatement` in
   *  `lib/content-redraw.ts`): the section label as its kicker, up to two paragraphs or a paragraph
   *  and a callout as subtitle and closing, one linked image. */
  layout?: "default" | "centered";
  content: ContentBlock[];
  footer?: string;
  badge?: string;
  stageMarker?: string[];
  stagePrefix?: string;
}

export interface ContentSection {
  title?: string;
  items?: string[];
  text?: string;
  link?: { url: string; label: string };
  icon?: IconName;
}

export interface ProfileInfo {
  name: string;
  title: string;
  imageSrc?: string;
  linkedIn?: string;
}

/** Renders through the content blocks (`regularAsContent` in `lib/regular-sections.ts`): two titled
 *  sections as a two-column block, three and more as cards, an untitled last section as the
 *  callout, the cards layout as an agenda. With a `profile` it keeps its own drawing. */
export interface RegularSlide {
  type: "regular";
  headline: string;
  sections: ContentSection[];
  profile?: ProfileInfo;
  layout?: "default" | "cards";
}
/** One picture or video of a `gallery` block. */
export interface GalleryItem {
  src: string;
  alt?: string;
  kind?: "image" | "video";
  /** A video's frame before it plays and in the PDF and PPTX export. */
  poster?: string;
  caption?: string;
  height?: number;
}

/** @deprecated A `content` slide with an `image`, `video` or `gallery` block, which draws it
 *  (`mediaAsContent` in `lib/gallery-media.ts`). */
export interface MediaSlide {
  type: "media";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline?: string;
  layout?: "grid" | "row";
  tags?: string[];
  sources: GalleryItem[];
}
