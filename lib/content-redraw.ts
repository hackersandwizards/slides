import { hasMarkdown } from "./markdown";
import type {
  ComparisonSide,
  ComparisonSidesSlide,
  ContentBlock,
  ContentSlide,
  StatementSlide,
} from "../types/slide";

type TwoColumnBlock = Extract<ContentBlock, { type: "two-column" }>;

const NEUTRAL_TWO_COLUMN_VARIANTS = new Set<TwoColumnBlock["variant"] | null>([
  undefined,
  null,
  "neutral",
]);

const SPLIT_DISQUALIFYING_FIELDS: readonly (keyof ContentSlide)[] = [
  "sectionLabel",
  "sectionTheme",
  "subtitle",
  "principle",
  "badge",
  "stageMarker",
  "stagePrefix",
  "ground",
  "background",
];

const BULLETS_DISQUALIFYING_FIELDS: readonly (keyof ContentSlide)[] = [
  "subtitle",
  "footer",
  "badge",
  "principle",
  "stageMarker",
];

const MAX_STATEMENT_BULLET_LENGTH = 90;

/** A comparison side prints a label and list. Prose beside the list would be lost. */
export function listColumnAsComparisonSide({
  title,
  items,
  text,
}: TwoColumnBlock["left"]): ComparisonSide | undefined {
  if (!title || !items?.length || text) return undefined;
  return { label: title, items };
}

function singleContentBlock(content: ContentBlock[]): ContentBlock | undefined {
  if (content.length !== 1) return;
  const [block] = content;
  return block;
}

/** Split comparisons render the headline and punchline verbatim and have no section frame. */
export function hasPlainSplitFrame(slide: ContentSlide): boolean {
  if (slide.layout === "centered" || SPLIT_DISQUALIFYING_FIELDS.some((key) => Boolean(slide[key])))
    return false;
  return ![slide.headline, slide.footer ?? ""].some(hasMarkdown);
}

/** A content slide whose one block is a neutral `two-column` of two lists as the comparison's
 *  `split` that replaces it, its footer the punchline; undefined for any other content slide. */
export function twoColumnAsSplit(slide: ContentSlide): ComparisonSidesSlide | undefined {
  const block = singleContentBlock(slide.content);
  if (block?.type !== "two-column" || !NEUTRAL_TWO_COLUMN_VARIANTS.has(block.variant)) return;
  if (!hasPlainSplitFrame(slide)) return;
  const left = listColumnAsComparisonSide(block.left);
  const right = listColumnAsComparisonSide(block.right);
  if (!left || !right) return;
  return {
    type: "comparison",
    variant: "split",
    headline: slide.headline,
    left,
    right,
    ...(slide.footer ? { punchline: slide.footer } : {}),
  };
}

type StatementBlock = Extract<ContentBlock, { type: "paragraph" | "callout" | "linked-image" }>;
type StatementBlocks = {
  paragraphs: string[];
  callout?: string;
  linkedImage?: StatementSlide["linkedImage"];
};

const STATEMENT_BLOCK_READERS: {
  [Kind in StatementBlock["type"]]: (
    parsed: StatementBlocks,
    block: Extract<StatementBlock, { type: Kind }>,
  ) => boolean;
} = {
  paragraph(parsed, block) {
    parsed.paragraphs.push(block.text);
    return true;
  },
  callout(parsed, block) {
    if (parsed.callout !== undefined) return false;
    parsed.callout = block.text;
    return true;
  },
  "linked-image"(parsed, block) {
    if (parsed.linkedImage) return false;
    parsed.linkedImage = { src: block.src, alt: block.alt, href: block.href };
    return true;
  },
};

/** Reads statement blocks in deck order. An omitted callout text leaves the closing slot open. */
export function parseStatementBlocks(blocks: ContentBlock[]): StatementBlocks | undefined {
  const parsed: StatementBlocks = { paragraphs: [], callout: undefined, linkedImage: undefined };
  for (const block of blocks) {
    const type = block.type;
    if (typeof type !== "string" || !Object.hasOwn(STATEMENT_BLOCK_READERS, type)) return;
    const read = STATEMENT_BLOCK_READERS[type as StatementBlock["type"]] as (
      parsed: StatementBlocks,
      block: ContentBlock,
    ) => boolean;
    if (!read(parsed, block)) return;
  }
  return parsed;
}

/** A supplied subtitle or callout reserves its slot even when its text is empty. */
export function statementText(
  parsed: Readonly<Omit<StatementBlocks, "paragraphs">> & {
    readonly paragraphs: readonly string[];
  },
  subtitle: ContentSlide["subtitle"],
) {
  const { paragraphs, callout, linkedImage } = parsed;
  const lead = subtitle ?? paragraphs[0];
  const firstUnused = subtitle === undefined || subtitle === null ? 1 : 0;
  const unused = paragraphs.length - firstUnused;
  if (unused > 1 || (unused > 0 && callout !== undefined)) return;

  let closing = callout;
  if (unused === 1) closing = paragraphs[firstUnused];
  return { subtitle: lead, closing, linkedImage };
}

/** A centered content slide as the statement slide that replaces it, or undefined where it is not
 *  centered or its blocks do not fit one: more than a subtitle and a closing of text, a block other than a
 *  paragraph, callout or linked image, a footer, markdown in the headline, or a deep-dive part. */
export function centeredAsStatement(slide: ContentSlide): StatementSlide | undefined {
  if (
    slide.layout !== "centered" ||
    slide.footer ||
    slide.sectionTheme === "deepdive" ||
    hasMarkdown(slide.headline)
  )
    return;
  const parsed = parseStatementBlocks(slide.content);
  if (!parsed) return;
  const text = statementText(parsed, slide.subtitle);
  if (!text) return;
  return {
    type: "statement",
    ground: slide.ground,
    background: slide.background,
    kicker: slide.sectionLabel,
    lines: [slide.headline],
    ...text,
  };
}

/** The other slide type a content slide draws as, on the web and in the export, or undefined
 *  where it draws as content. */
export function contentRedrawnAs(slide: ContentSlide) {
  return twoColumnAsSplit(slide) ?? centeredAsStatement(slide);
}

/** A content slide holding nothing but one or two short bullets as the statement that carries
 *  them, or undefined: as bullets they leave the slide empty around them. Short is one line at
 *  body size. */
export function bulletsAsStatement(slide: ContentSlide): StatementSlide | undefined {
  const block = singleContentBlock(slide.content);
  if (block?.type !== "bullets" || block.ordered) return;
  if (
    slide.sectionTheme === "deepdive" ||
    BULLETS_DISQUALIFYING_FIELDS.some((key) => Boolean(slide[key]))
  )
    return;
  // A statement's lines print as typed, as centeredAsStatement knows.
  if (hasMarkdown(slide.headline)) return;
  const { items } = block;
  if (items.length === 0 || items.length > 2) return;
  if (
    !items.every(
      (item): item is string =>
        typeof item === "string" && item.length <= MAX_STATEMENT_BULLET_LENGTH,
    )
  )
    return;
  const [subtitle, closing] = items;
  return {
    type: "statement",
    ground: slide.ground,
    background: slide.background,
    kicker: slide.sectionLabel,
    lines: [slide.headline],
    subtitle,
    closing,
  };
}
