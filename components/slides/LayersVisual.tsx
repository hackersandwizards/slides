import type { VisualBlock } from "../../types/slide";
import { renderMarkdown } from "../../lib/markdown";
import { NumberTile } from "./primitives";
import { VISUAL_CAPTION, VISUAL_CARD, VISUAL_LABEL } from "./DiagramVocabulary";

export function Layers({ block }: { block: Extract<VisualBlock, { type: "layers" }> }) {
  return (
    <div className="flex w-full flex-col gap-5">
      {block.layers.map((layer, i) => {
        const on = block.highlight === i;
        return (
          <div
            key={i}
            className={`flex items-center gap-10 border-4 bg-white px-10 py-7 max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-3 max-md:px-6 max-md:py-5 ${VISUAL_CARD} ${on ? "border-primary" : "border-border"}`}
          >
            {block.ordered && (
              <NumberTile size="lg" tone={on ? "solid" : "ink"}>
                {i + 1}
              </NumberTile>
            )}
            <h2
              className={`min-w-0 flex-1 md:w-96 md:flex-none ${VISUAL_LABEL} ${on ? "text-primary" : "text-text"}`}
            >
              {renderMarkdown(layer.title)}
            </h2>
            {layer.text && (
              <p className={`flex-1 max-md:basis-full ${VISUAL_CAPTION} text-text`}>
                {renderMarkdown(layer.text)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
