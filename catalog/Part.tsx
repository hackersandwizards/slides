import { PARTS } from "./parts";

export function Part({ name }: { name: string }) {
  return (
    <div className="min-h-screen bg-background p-24 text-text" data-hw-scale="stage">
      {PARTS[name]()}
    </div>
  );
}
