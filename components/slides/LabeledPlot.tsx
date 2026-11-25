import type { ReactNode, Ref } from "react";
import { ResponsiveContainer } from "recharts";

/** The value axis's name above the plot, a note beside it, the category axis's name below. On a
 *  phone, where the frame grows with its text, the note stands below the chart and the plot keeps
 *  its height: beside the axis's name it took seven lines and left 88 px of plot. */
export function LabeledPlot({
  xLabel,
  yLabel,
  note,
  rows,
  plotRef,
  children,
}: {
  xLabel?: string;
  yLabel?: string;
  note?: string;
  rows?: boolean;
  plotRef: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {(yLabel || note) && (
        <div className="mb-2 flex justify-between gap-8 text-base text-text-muted max-md:contents">
          <p className="max-md:mb-2 max-md:empty:hidden">{yLabel}</p>
          {note && (
            <p className="text-right max-md:order-last max-md:mt-2 max-md:text-left">{note}</p>
          )}
        </div>
      )}
      <div className={`min-h-0 flex-1 max-md:flex-none ${rows ? "" : "max-md:h-82"}`}>
        <div ref={plotRef} className={rows ? undefined : "h-full"}>
          {rows ? (
            children
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {xLabel && <p className="mt-1 text-center text-base text-text-muted">{xLabel}</p>}
    </div>
  );
}
