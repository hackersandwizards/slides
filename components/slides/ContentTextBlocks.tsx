"use client";

import type { ContentBlock, SectionTheme } from "../../types/slide";
import { renderMarkdown } from "../../lib/markdown";
import { getSectionStyle } from "../../lib/section-styles";
import { TWO_COLUMN_TONES, type SideTone } from "../../lib/slide-utils";
import { FencedColumnCode } from "./ContentCodeBlocks";
import { SlideCard, type CardTone } from "./primitives";

/** How a two-column side draws its tone (`TWO_COLUMN_TONES`). */
const SIDE_STYLES: Record<SideTone, { card: CardTone; title: string; dot: string }> = {
  success: { card: "success", title: "text-green-dark", dot: "bg-green-dark" },
  error: { card: "error", title: "text-red", dot: "bg-red" },
  neutral: { card: "neutral", title: "text-text", dot: "" },
};

/** The info callout is the brand's purple callout; warning and success are the slide's own
 *  (exception `callout-status` in brand-elements.json). */
const CALLOUT_VARIANTS = {
  info: "hw-callout text-text",
  // On their tint the brand amber and green drop under 4.5:1 (4.29 and 4.27), so the text mixes
  // them 40% with ink, as the website's chips do.
  warning:
    "rounded-brand border-2 px-8 py-6 border-slide-accent/25 bg-slide-accent/7 text-(--slide-insight-ink)",
  success:
    "rounded-brand border-2 px-8 py-6 border-green-dark/25 bg-green-dark/7 text-(--slide-success-ink)",
};

export function ParagraphBlock({
  block,
  centered,
  sectionTheme,
}: {
  block: Extract<ContentBlock, { type: "paragraph" }>;
  centered?: boolean;
  sectionTheme?: SectionTheme;
}) {
  if (centered) {
    return (
      <p className="mx-auto max-w-3xl text-xl leading-relaxed text-text-muted sm:text-2xl md:text-3xl">
        {renderMarkdown(block.text)}
      </p>
    );
  }
  if (block.centered) {
    // Set off by the same rule as the slide's footer, the one separator a slide carries.
    return (
      <div className={`mt-8 border-t-2 pt-6 ${getSectionStyle(sectionTheme).border}`}>
        <p className="mx-auto max-w-4xl text-center text-2xl leading-snug font-semibold tracking-tight text-balance text-text md:text-3xl">
          {renderMarkdown(block.text)}
        </p>
      </div>
    );
  }
  // Body text at the list's size and measure, in ink, not a smaller muted paragraph.
  return (
    <p className="max-w-(--slide-measure-list) text-2xl leading-snug text-text">
      {renderMarkdown(block.text)}
    </p>
  );
}

export function BulletsBlock({ block }: { block: Extract<ContentBlock, { type: "bullets" }> }) {
  const List = block.ordered ? "ol" : "ul";
  return (
    <List className="max-w-(--slide-measure-list) space-y-4">
      {block.items.map((item, i) => {
        const isNested = typeof item === "object";
        const text = isNested ? item.text : item;
        return (
          <li key={i}>
            <div className="flex items-baseline gap-4 text-2xl text-text">
              {block.ordered ? (
                <span className="w-8 shrink-0 font-semibold text-primary tabular-nums">
                  {i + 1}.
                </span>
              ) : (
                <span className="hw-marker" />
              )}
              <span>{renderMarkdown(text)}</span>
            </div>
            {isNested && item.children.length > 0 && (
              <ul className="mt-3 ml-10 space-y-3">
                {item.children.map((child, j) => (
                  <li key={j} className="flex items-baseline gap-3 text-xl text-text-muted">
                    <span className="hw-marker slide-marker-nested" />
                    <span>{renderMarkdown(child)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </List>
  );
}

function ColumnContent({ text }: { text: string }) {
  if (text.startsWith("```") && text.endsWith("```")) return <FencedColumnCode text={text} />;
  return text.split("\n\n").map((paragraph, i) => {
    if (paragraph.startsWith("•")) {
      const items = paragraph.split("\n").filter((line) => line.startsWith("•"));
      return (
        <ul key={i} className="space-y-3">
          {items.map((item, j) => (
            <li key={j} className="flex items-baseline gap-3 text-xl text-text-muted">
              <span className="hw-marker" />
              <span>{renderMarkdown(item.slice(2))}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="mb-4 text-xl text-text-muted">
        {renderMarkdown(paragraph)}
      </p>
    );
  });
}

export function TwoColumnBlock({
  block,
}: {
  block: Extract<ContentBlock, { type: "two-column" }>;
}) {
  const variant = block.variant ?? "neutral";
  const [left, right] = Object.hasOwn(TWO_COLUMN_TONES, variant)
    ? TWO_COLUMN_TONES[variant]
    : TWO_COLUMN_TONES.neutral;
  const sides = [
    { data: block.left, style: SIDE_STYLES[left] },
    { data: block.right, style: SIDE_STYLES[right] },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-10">
      {sides.map(({ data, style }, i) => (
        <SlideCard key={i} tone={style.card} look="line" className="card-pad-7">
          {data.title && (
            <h2 className={`mb-5 card-title text-2xl ${style.title}`}>
              {renderMarkdown(data.title)}
            </h2>
          )}
          {data.text && <ColumnContent text={data.text} />}
          {data.items && (
            <ul className="space-y-4">
              {data.items.map((item, j) => (
                <li key={j} className="flex items-baseline gap-3 text-xl text-text">
                  <span className={`hw-marker ${style.dot}`} />
                  <span>{renderMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          )}
        </SlideCard>
      ))}
    </div>
  );
}

export function HooksBlock({ block }: { block: Extract<ContentBlock, { type: "hooks" }> }) {
  return (
    <div className="space-y-2.5">
      {block.items.map((hook, i) => (
        <SlideCard key={i} className="flex items-baseline gap-4 text-base card-pad-3">
          <code className="hw-inline-code text-text">{hook.name}</code>
          <span className="text-lg text-text-muted">{hook.description}</span>
        </SlideCard>
      ))}
    </div>
  );
}

export function CalloutBlock({
  block,
  centered,
}: {
  block: Extract<ContentBlock, { type: "callout" }>;
  centered?: boolean;
}) {
  if (centered) {
    return (
      <SlideCard className="mx-auto max-w-3xl card-pad-5/8">
        <p className="text-lg leading-relaxed text-text-muted sm:text-xl md:text-2xl">
          {renderMarkdown(block.text)}
        </p>
      </SlideCard>
    );
  }
  const variant = block.variant ?? "info";
  const style = Object.hasOwn(CALLOUT_VARIANTS, variant) ? CALLOUT_VARIANTS[variant] : undefined;
  return (
    <div
      className={`max-w-full ${block.fullWidth ? "w-full" : "w-fit"} ${style}`}
      data-hue={variant === "info" ? "purple" : undefined}
      data-hw-exception={variant === "info" ? undefined : "callout-status"}
    >
      <p className="text-xl leading-snug font-medium">{renderMarkdown(block.text)}</p>
    </div>
  );
}
