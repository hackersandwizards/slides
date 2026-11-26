"use client";

import type { ContentBlock } from "../../types/slide";
import { renderMarkdown } from "../../lib/markdown";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";

function TableHeader({ headers, compact }: { headers: string[]; compact?: boolean }) {
  return (
    <thead>
      <tr className="bg-primary/7">
        {headers.map((header, i) => (
          <th
            key={i}
            className={`hw-label border-b-2 border-border py-3 text-left leading-tight ${compact ? "px-4 [--hw-label-size:var(--text-base)]" : "px-6 [--hw-label-size:var(--text-lg)]"}`}
            data-tone="ink"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableBody({
  rows,
  compact,
  revealedCount,
}: {
  rows: string[][];
  compact?: boolean;
  revealedCount: number;
}) {
  return (
    <tbody>
      {rows.map((row, rowIndex) => (
        <tr
          key={rowIndex}
          className={`transition-colors hover:bg-primary/7 ${rowIndex % 2 === 1 ? "bg-primary/7" : ""}`}
        >
          {row.map((cell, cellIndex) => {
            const shown = cellIndex === 0 ? revealedCount > 0 : rowIndex < revealedCount - 1;
            return (
              <td
                key={cellIndex}
                className={`border-b border-border py-4 text-left text-text transition-opacity duration-300 ${compact ? "px-4" : "px-6"} ${cellIndex === 0 ? "font-bold" : ""} ${shown ? "opacity-100" : "opacity-0"}`}
              >
                {renderMarkdown(cell)}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
}

/** A table; with `reveal`, the first column comes on the first ArrowRight, then each row's
 *  remaining cells on the next, so the room reads the row the speaker talks about. */
export function TableBlock({ block }: { block: Extract<ContentBlock, { type: "table" }> }) {
  const { revealedCount } = useProgressiveReveal({
    totalSteps: block.rows.length + 1,
    startFull: !block.reveal,
  });
  return (
    <div
      className="overflow-x-auto rounded-brand border-2 border-border bg-white"
      data-hw-exception="slide-table"
    >
      {/* Automatic layout: `widths` are the columns' preferred shares, and no column ever gets
          narrower than its longest word. A fixed layout let a word run into the next cell. */}
      {/* The cells take the ink and the heads the step under the cells', set tight: in a lit
          hall and a 720p stream the label step and the muted grey wash out first, and the
          cells' own step for the heads widened a two-column table until its slide fell to
          0.79; the step under it holds 0.80. */}
      <table className={`w-full border-collapse ${block.compact ? "text-lg" : "text-xl"}`}>
        {block.widths && (
          <colgroup>
            {block.widths.map((w, i, widths) => (
              <col key={i} style={{ width: `${(w / widths.reduce((a, b) => a + b, 0)) * 100}%` }} />
            ))}
          </colgroup>
        )}
        {block.headers && <TableHeader headers={block.headers} compact={block.compact} />}
        <TableBody rows={block.rows} compact={block.compact} revealedCount={revealedCount} />
      </table>
    </div>
  );
}
