import Image from "../ui/image";
import type { VisualBlock } from "../../types/slide";
import { useHighlightLines } from "../../lib/use-code-highlight";
import { renderMarkdown } from "../../lib/markdown";
import { CodePanel, NumberTile } from "./primitives";
import { VISUAL_CARD } from "./DiagramVocabulary";

const BESIDE_NOTES = "flex w-full items-center gap-12 max-md:flex-col max-md:items-stretch";

/** The numbered notes beside an annotated picture or code. A note of one line centres on its tile,
 *  a longer one starts level with it. */
function AnnotationNotes({ notes }: { notes: { text: string }[] }) {
  return (
    <ol className="flex min-w-0 flex-1 flex-col gap-9">
      {notes.map((n, i) => (
        <li key={i} className="flex items-start gap-5">
          <NumberTile size="lg">{i + 1}</NumberTile>
          <p className="flex min-h-16 flex-col justify-center text-3xl leading-snug text-text [&_strong]:block [&_strong]:text-4xl">
            <span>{renderMarkdown(n.text)}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Annotated({ block }: { block: Extract<VisualBlock, { type: "annotated" }> }) {
  const [w, h] = block.size;
  const top = block.crop?.top ?? 0;
  // A right crop drops an editor's minimap and scrollbar: the image is set wider than the frame.
  const right = block.crop?.right ?? 1;
  const span = (block.crop?.bottom ?? 1) - top;
  // A note's y is a fraction of the whole image; inside the crop it is a fraction of the window.
  const at = (y: number) => `${((y - top) / span) * 100}%`;
  return (
    <div className={BESIDE_NOTES}>
      {/* The numbers stand in a gutter left of the frame, level with their bands, off the code. */}
      <div className="relative flex shrink-0 pl-16 max-md:pl-9">
        {/* The frame takes the crop's shape at the largest size that fits 50rem by 38rem, which
            leaves the notes room for a line of a few words. */}
        <div
          className={`relative max-w-full shrink-0 overflow-hidden border-4 border-text bg-text ${VISUAL_CARD}`}
          style={{
            width: `${Math.min(50, (38 * w * right) / (h * span))}rem`,
            aspectRatio: `${w * right} / ${h * span}`,
          }}
        >
          <Image
            src={block.src}
            alt={block.alt ?? ""}
            width={w}
            height={h}
            className="absolute left-0 h-auto max-w-none"
            style={{ top: `${(-top / span) * 100}%`, width: `${100 / right}%` }}
          />
          {block.notes.map((n, i) => (
            <div
              key={i}
              className="absolute inset-x-2 -translate-y-1/2 rounded-brand-sm border-(length:--slide-rule-strong) border-primary bg-primary/25"
              style={{ top: at(n.y), height: `${((n.h ?? 0.03) / span) * 100}%` }}
            />
          ))}
        </div>
        {block.notes.map((n, i) => (
          <span key={i} className="absolute left-0 -translate-y-1/2" style={{ top: at(n.y) }}>
            <NumberTile size="gutter">{i + 1}</NumberTile>
          </span>
        ))}
      </div>
      <AnnotationNotes notes={block.notes} />
    </div>
  );
}

// A wrapped code line continues two characters right of its own indent, never at column 0.
const hang = (line: string) => {
  const ch = line.length - line.trimStart().length + 2;
  return { paddingLeft: `${ch}ch`, textIndent: `-${ch}ch` };
};

export function AnnotatedCode({
  block,
}: {
  block: Extract<VisualBlock, { type: "annotated-code" }>;
}) {
  const marked = new Map(block.notes.map((n, i) => [n.line, i + 1]));
  // An excerpt cut from deeper in a file keeps its indent; drop the indent every line shares.
  const lines = block.code.split("\n");
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length),
  );
  const highlightLines = useHighlightLines();
  const tokens = highlightLines(lines.map((l) => l.slice(indent)).join("\n"), block.language);
  return (
    <div className={BESIDE_NOTES}>
      <CodePanel as="pre" className="min-w-0 flex-[1.4] overflow-hidden py-6">
        <code className="block font-code text-xl leading-snug max-md:text-(length:--type-small-size)">
          {lines.map((line, i) => {
            const n = marked.get(i + 1);
            // Under a marked line's teal a comment in night-subtle falls to 4.3:1 (dark theme):
            // there it takes the grey halfway to night-muted, 5.6:1, still below the code's. The
            // badge's numeral stands on the line's first baseline, so a wrapped line keeps it there.
            return (
              <div
                key={i}
                className={`flex items-baseline gap-4 border-l-(length:--slide-rule-accent) pr-6 pl-4 ${n ? "border-primary bg-primary/25 [--code-comment:var(--slide-code-comment-lit)]" : "border-transparent"}`}
              >
                {marked.size > 0 && (
                  <span className="flex w-10 shrink-0 justify-center">
                    {n && <NumberTile size="sm">{n}</NumberTile>}
                  </span>
                )}
                <span
                  className="min-w-0 break-words whitespace-pre-wrap"
                  style={hang(line.slice(indent))}
                >
                  {tokens[i]}
                </span>
              </div>
            );
          })}
        </code>
      </CodePanel>
      {block.notes.length > 0 && <AnnotationNotes notes={block.notes} />}
    </div>
  );
}
