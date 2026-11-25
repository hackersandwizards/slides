import type { VisualBlock } from "../../types/slide";
import { BeforeAfterSides } from "./primitives";

export function Transform({ block }: { block: Extract<VisualBlock, { type: "transform" }> }) {
  return (
    <div className="flex w-full justify-center">
      <BeforeAfterSides left={block.before} right={block.after} after strike={false} />
    </div>
  );
}
