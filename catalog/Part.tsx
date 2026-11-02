import { PARTS } from "./parts";

/** A part's sheet of variants on the stage, as the print page draws it. */
export function Part({ name }: { name: string }) {
  return (
    <div className="min-h-screen bg-background p-24 text-text" data-hw-scale="stage">
      {PARTS[name]()}
    </div>
  );
}
