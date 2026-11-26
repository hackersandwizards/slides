import type { StatementSlide } from "../../../types/slide";
import type { Sheet } from "../sheet";
import { drawCentredStatement } from "./statement-centred";
import { drawQrStatement } from "./statement-qr";
import { drawSideStatement } from "./statement-side";

export type StatementKind = "centred" | "qr" | "side";

/** Picks the statement layout variant from its attribution, QR code, and side-media fields. */
export function statementKind(d: StatementSlide): StatementKind {
  // As the slide picks it: a quotation keeps its portrait and drops a QR code.
  if (d.attribution) return "side";
  if (d.qr) return "qr";
  return d.imageSrc || d.linkedImage ? "side" : "centred";
}

const STATEMENTS: Record<StatementKind, (sheet: Sheet, d: StatementSlide) => void> = {
  centred: drawCentredStatement,
  qr: drawQrStatement,
  side: drawSideStatement,
};

export function drawStatement(sheet: Sheet, d: StatementSlide): void {
  STATEMENTS[statementKind(d)](sheet, d);
}
