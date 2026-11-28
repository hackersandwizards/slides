import type { VisualBlock } from "../../types/slide";
import type { IconName } from "../../lib/icons";
import { renderMarkdown } from "../../lib/markdown";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { NumberTile, SlideCard } from "./primitives";
import {
  VISUAL_CAPTION,
  VISUAL_COLUMNS,
  VISUAL_LABEL,
  VisualIcon,
  visualColumns,
} from "./DiagramVocabulary";

type CardsBlock = Extract<VisualBlock, { type: "cards" }>;
type CardItem = CardsBlock["items"][number];

// Four columns leave a card about a quarter of the slide: the title steps down one size. Dense
// cards keep the sizes of the four-column and labeled-grid blocks they replace.
const CARD_LOOK = {
  regular: {
    mark: true,
    label: VISUAL_LABEL,
    text: `${VISUAL_CAPTION} text-text`,
    entry: `${VISUAL_CAPTION} text-text`,
    pad: "card-pad-8/9",
    gridGap: "gap-6",
    cardGap: "gap-5",
    listGap: "gap-3",
  },
  wide: {
    mark: true,
    label: VISUAL_LABEL.replace("text-4xl", "text-3xl"),
    text: `${VISUAL_CAPTION} text-text`,
    entry: `${VISUAL_CAPTION} text-text`,
    pad: "card-pad-6",
    gridGap: "gap-6",
    cardGap: "gap-5",
    listGap: "gap-3",
  },
  dense: {
    mark: false,
    label: "card-title text-xl",
    text: "card-text-lg text-text-muted",
    entry: "card-text-base text-text-muted",
    pad: "card-pad-6",
    gridGap: "gap-5",
    cardGap: "gap-1",
    listGap: "mt-2 gap-2",
  },
  denseWide: {
    mark: false,
    label: "card-title text-lg",
    text: "card-text-lg text-text-muted",
    entry: "card-text-base text-text-muted",
    pad: "card-pad-5",
    gridGap: "gap-5",
    cardGap: "gap-1",
    listGap: "mt-2 gap-2",
  },
} as const;

type CardLook = (typeof CARD_LOOK)[keyof typeof CARD_LOOK];

export function cardLook(dense: boolean, wide: boolean): CardLook {
  if (dense) return wide ? CARD_LOOK.denseWide : CARD_LOOK.dense;
  return wide ? CARD_LOOK.wide : CARD_LOOK.regular;
}

function CardMark({
  number,
  icon,
  highlighted,
  mark,
}: {
  number?: number;
  icon?: IconName;
  highlighted: boolean;
  mark: boolean;
}) {
  if (number !== undefined) return <NumberTile size="lg">{number}</NumberTile>;
  if (icon) {
    return (
      <NumberTile size="lg" tone={highlighted ? "solid" : "soft"}>
        <VisualIcon name={icon} className="h-9 w-9" />
      </NumberTile>
    );
  }
  return mark ? <span className="h-1.5 w-16 bg-primary" aria-hidden /> : null;
}

function VisualCard({
  item,
  look,
  number,
  highlighted,
  shown,
}: {
  item: CardItem;
  look: CardLook;
  number?: number;
  highlighted: boolean;
  shown: boolean;
}) {
  return (
    <SlideCard
      inert={!shown}
      tone={highlighted ? "primary" : "neutral"}
      className={`flex flex-col transition-all duration-500 ${look.cardGap} ${look.pad} ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      <CardMark number={number} icon={item.icon} highlighted={highlighted} mark={look.mark} />
      {item.title && (
        <h2 className={`${look.label} ${highlighted ? "text-primary" : "text-text"}`}>
          {renderMarkdown(item.title)}
        </h2>
      )}
      {item.text && (
        <p className={`${look.text} [&_strong]:text-text`}>{renderMarkdown(item.text)}</p>
      )}
      {item.items && (
        <ul className={`flex flex-col ${look.listGap}`}>
          {item.items.map((line, j) => (
            <li key={j} className={`flex items-baseline gap-3 ${look.entry}`}>
              <span className="hw-marker" />
              <span>{renderMarkdown(line)}</span>
            </li>
          ))}
        </ul>
      )}
    </SlideCard>
  );
}

export function Cards({ block }: { block: CardsBlock }) {
  const n = block.items.length;
  const cols = block.columns ?? (n === 4 ? 2 : Math.min(n, 3));
  const dense = !!block.dense;
  const look = cardLook(dense, cols >= 4);
  const { revealedCount } = useProgressiveReveal({ totalSteps: n, startFull: !block.reveal });
  const from = block.numberFrom ?? 1;
  return (
    <div
      className={`grid w-full ${VISUAL_COLUMNS} ${look.gridGap}`}
      style={visualColumns(cols)}
      data-hw-repeat={n > 1 ? "" : undefined}
    >
      {block.items.map((item, i) => (
        <VisualCard
          key={i}
          item={item}
          look={look}
          number={block.numbered ? i + from : undefined}
          highlighted={block.highlight === i}
          shown={i < revealedCount}
        />
      ))}
    </div>
  );
}
