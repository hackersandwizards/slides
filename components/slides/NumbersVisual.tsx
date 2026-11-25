import type { CSSProperties } from "react";
import type { VisualBlock } from "../../types/slide";
import { renderMarkdown } from "../../lib/markdown";
import { numbersGrid } from "../../lib/slide-utils";
import { Figure, figureFit, loneFigureSize } from "./Figure";
import { VISUAL_CAPTION, VISUAL_COLUMNS, VisualSource, visualColumns } from "./DiagramVocabulary";

type NumbersBlock = Extract<VisualBlock, { type: "numbers" }>;
type NumberItem = NumbersBlock["items"][number];

const FIGURE = "font-heading leading-none font-bold tracking-tight whitespace-nowrap text-primary";

function LoneNumber({ item, source }: { item: NumberItem; source?: string }) {
  return (
    <div className="w-full">
      <div
        className="slide-figure-row flex flex-wrap items-center gap-16"
        style={{ ...figureFit([item.value]), ...loneFigureSize(item.value) }}
      >
        <span
          className={`${FIGURE} text-[length:min(var(--slide-figure-hero),var(--slide-figure-lone-size))]`}
        >
          <Figure value={item.value} />
        </span>
        {/* The label takes the room beside the figure, and stands below it where its longest
            word finds none. */}
        <span className="max-w-(--slide-measure-figure-label) flex-1 text-5xl leading-tight font-semibold text-balance text-text">
          {renderMarkdown(item.label)}
          {item.text && (
            <span className={`mt-4 block font-normal ${VISUAL_CAPTION} text-text-muted`}>
              {renderMarkdown(item.text)}
            </span>
          )}
        </span>
      </div>
      <VisualSource text={source} />
    </div>
  );
}

// Wrapped figures read as one grid at a glance: no rule, the label bold against its line, each
// pair close to its figure, and in three columns the rows far apart, so a note never reads as
// the next figure's. Open space groups them better than a card or a rule per figure, which crowd
// the slide. Four columns keep the closer rows, or two rows of notes run past the slide's foot.
const NUMBER_GRID_LOOK = {
  wrappedThree: {
    grid: "mt-8 gap-x-16 gap-y-28",
    label: "mt-4 leading-tight font-semibold",
    text: "mt-1 text-pretty",
    source: "mt-16",
  },
  wrappedFour: {
    grid: "gap-16",
    label: "mt-4 leading-tight font-semibold",
    text: "mt-1 text-pretty",
    source: "mt-16",
  },
  row: {
    grid: "gap-x-14 gap-y-12",
    label: "mt-6 border-t-4 border-border pt-6 leading-snug",
    text: "mt-3",
    source: undefined,
  },
} as const;

function NumberGrid({ items, source }: { items: NumberItem[]; source?: string }) {
  const { cols, wrapped, size } = numbersGrid(items.map((i) => i.value));
  const look = wrapped
    ? cols === 3
      ? NUMBER_GRID_LOOK.wrappedThree
      : NUMBER_GRID_LOOK.wrappedFour
    : NUMBER_GRID_LOOK.row;
  return (
    <div className="w-full">
      <div
        className={`grid w-full ${VISUAL_COLUMNS} ${look.grid}`}
        style={{ ...visualColumns(cols), ...figureFit(items.map((i) => i.value)) }}
      >
        {items.map((item, i) => (
          <div key={i} className="slide-figure-cell flex flex-col">
            <span
              className={`${FIGURE} text-(length:--slide-figure-grid-size)`}
              style={{ "--slide-figure-grid-size": `${size}rem` } as CSSProperties}
            >
              <Figure value={item.value} quiet={wrapped} />
            </span>
            <span className={`text-3xl text-text ${look.label}`}>{renderMarkdown(item.label)}</span>
            {item.text && (
              <span className={`${look.text} ${VISUAL_CAPTION} text-text-muted`}>
                {renderMarkdown(item.text)}
              </span>
            )}
          </div>
        ))}
      </div>
      <VisualSource text={source} gap={look.source} />
    </div>
  );
}

export function Numbers({ block }: { block: NumbersBlock }) {
  if (block.items.length === 1) {
    return <LoneNumber item={block.items[0]} source={block.source} />;
  }
  return <NumberGrid items={block.items} source={block.source} />;
}
