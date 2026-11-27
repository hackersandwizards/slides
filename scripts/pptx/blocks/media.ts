import { existsSync, readFileSync } from "node:fs";
import { labeledGridAsCards } from "../../../lib/content-block-aliases";
import { isVideo } from "../../../lib/gallery-media";
import { linkLabel } from "../../../lib/link-labels";
import { chipArea, chipWidth, drawChip, type Chip } from "../chips";
import { assetFile } from "../images";
import type { Sheet } from "../sheet";
import { PT, type Area } from "../stage";
import { cards } from "./cards";
import { slotBodyO, type Block, type BlockKind, type Slot } from "./kind";

/** Draws one cell of a gallery: either a video block or a contained picture with its caption. */
export function galleryCell(
  sheet: Sheet,
  item: Block<"gallery">["items"][number],
  area: Area,
): void {
  if (isVideo(item)) {
    video.draw(
      sheet,
      { type: "video", src: item.src, alt: item.alt, caption: item.caption, poster: item.poster },
      { area, k: 1, centered: false },
    );
    return;
  }
  const capH = item.caption ? 0.3 : 0;
  sheet.picture(item.src, { x: area.x, y: area.y, w: area.w, h: area.h - capH }, { alt: item.alt });
  if (item.caption)
    sheet.box(
      item.caption,
      { x: area.x, y: area.y + area.h - capH + 0.05, w: area.w, h: capH - 0.05 },
      {
        size: PT.sm,
        color: sheet.c.muted,
        align: "center",
      },
    );
}

/** A gallery: its pictures and videos in a row or grid of equal cells, each over its caption, and
 *  its tags as chips under them. */
function drawGallery(sheet: Sheet, b: Block<"gallery">, area: Area) {
  const { c } = sheet;
  const tagH = b.tags?.length ? 0.4 : 0;
  const a = { ...area, h: area.h - tagH };
  const n = b.items.length;
  const cols = b.layout === "row" ? n : Math.min(n, 3);
  const rows = Math.ceil(n / cols);
  const cw = (a.w - (cols - 1) * 0.25) / cols;
  const rh = (a.h - (rows - 1) * 0.25) / rows;
  b.items.forEach((src, i) => {
    const x = a.x + (i % cols) * (cw + 0.25);
    const yy = a.y + Math.floor(i / cols) * (rh + 0.25);
    galleryCell(sheet, src, { x, y: yy, w: cw, h: rh });
  });
  if (!b.tags?.length) return;
  const tags = b.tags.map((text) => {
    const chip: Chip = { text, size: PT.label, fill: c.card, color: c.ink, mono: false };
    return { chip, w: chipWidth(chip) };
  });
  const gap = 0.1;
  const row = tags.reduce((sum, tag) => sum + tag.w + gap, -gap);
  let x = a.x + (a.w - row) / 2;
  for (const { chip, w } of tags) {
    drawChip(sheet, chip, chipArea(chip, { x, y: a.y + a.h + 0.1 }, w));
    x += w + gap;
  }
}

export const image: BlockKind<"image"> = {
  draw(sheet, b, { area: a }) {
    sheet.picture(b.src, a, { alt: b.alt, native: true });
  },
};

export const imageSteps: BlockKind<"image-steps"> = {
  draw(sheet, b, slot) {
    const { area: a } = slot;
    const { c } = sheet;
    const o = slotBodyO(c, slot);
    // A file has no arrow steps: the last picture, the one the slide ends on, as print shows it.
    const last = b.steps[b.steps.length - 1];
    const h = a.h - (last.caption ? 0.35 : 0);
    sheet.picture(last.src, { x: a.x, y: a.y, w: a.w, h }, { alt: b.alt, native: true });
    if (last.caption)
      sheet.box(
        last.caption,
        { x: a.x, y: a.y + h + 0.08, w: a.w, h: 0.27 },
        {
          ...o,
          size: PT.sm,
          color: c.muted,
          align: "center",
        },
      );
  },
};

export const gallery: BlockKind<"gallery"> = {
  draw(sheet, b, { area: a }) {
    return drawGallery(sheet, b, a);
  },
};

export const linkedImage: BlockKind<"linked-image"> = {
  draw(sheet, b, slot) {
    const { area: a } = slot;
    const { c } = sheet;
    const o = slotBodyO(c, slot);
    // The link spelled out under the picture, as on the slide.
    const line = b.href ? 0.42 : 0;
    const p = sheet.picture(
      b.src,
      { x: a.x, y: a.y, w: a.w, h: a.h - line },
      {
        alt: b.alt,
        href: b.href,
        native: true,
      },
    );
    if (b.href)
      sheet.box(
        { runs: [{ text: `↗ ${linkLabel(b.href)}`, options: { hyperlink: { url: b.href } } }] },
        { x: a.x, y: p.y + p.h + 0.08, w: a.w, h: 0.32 },
        { ...o, size: PT.base, mono: true, color: c.teal, align: "center" },
      );
  },
};

/** Embeds a video asset inside `area`, attaching its PNG poster cover when present and valid. */
export function videoCover(
  sheet: Sheet,
  b: Block<"video">,
  { area, path }: { area: Area; path: string },
): void {
  const w = Math.min(area.w, (area.h * 16) / 9);
  // pptxgenjs stores the cover as a PNG part whatever its bytes: anything else stays out.
  let cover: string | undefined;
  if (b.poster) {
    const poster = assetFile(sheet.out.assets, b.poster);
    const bytes = existsSync(poster) ? readFileSync(poster) : undefined;
    if (bytes?.toString("latin1", 1, 4) === "PNG")
      cover = `data:image/png;base64,${bytes.toString("base64")}`;
    else sheet.warn(`video ${b.src}: poster ${b.poster} is no PNG under ${sheet.out.assets}`);
  }
  sheet.slide.addMedia({
    type: "video",
    path,
    x: area.x + (area.w - w) / 2,
    y: area.y,
    w,
    h: area.h,
    ...(cover ? { cover } : {}),
  });
}

export function videoMissing(sheet: Sheet, b: Block<"video">, slot: Slot): void {
  const { c } = sheet;
  const { area: a } = slot;
  const o = slotBodyO(c, slot);
  sheet.warn(`video ${b.src}: not found under ${sheet.out.assets}`);
  sheet.card(a, { fill: c.tint, line: c.border });
  sheet.box(b.alt || b.src, a, {
    ...o,
    align: "center",
    valign: "middle",
    color: c.muted,
  });
}

export const video: BlockKind<"video"> = {
  draw(sheet, b, slot) {
    const { area: a } = slot;
    const h = a.h - (b.caption ? 0.35 : 0);
    const frame: Area = { x: a.x, y: a.y, w: a.w, h };
    const path = assetFile(sheet.out.assets, b.src);
    if (existsSync(path)) videoCover(sheet, b, { area: frame, path });
    else videoMissing(sheet, b, { ...slot, area: frame });
    if (b.caption) {
      const o = slotBodyO(sheet.c, slot);
      sheet.box(
        b.caption,
        { x: a.x, y: a.y + h + 0.08, w: a.w, h: 0.27 },
        {
          ...o,
          size: PT.sm,
          color: sheet.c.muted,
          align: "center",
        },
      );
    }
  },
};

export const imageAndGrid: BlockKind<"image-and-grid"> = {
  draw(sheet, b, slot) {
    const { area: a } = slot;
    const iw = a.w * 0.42;
    sheet.picture(b.image.src, { x: a.x, y: a.y, w: iw, h: a.h }, { alt: b.image.alt });
    let y = a.y;
    if (b.gridTitle) {
      sheet.box(
        b.gridTitle,
        { x: a.x + iw + 0.3, y, w: a.w - iw - 0.3, h: 0.3 },
        {
          ...slotBodyO(sheet.c, slot),
          mono: true,
          bold: true,
        },
      );
      y += 0.4;
    }
    cards.draw(sheet, labeledGridAsCards({ type: "labeled-grid", columns: 1, items: b.items }), {
      ...slot,
      centered: false,
      area: {
        x: a.x + iw + 0.3,
        y,
        w: a.w - iw - 0.3,
        h: Math.max(0, Math.min(a.y + a.h - y, b.items.length * 1.2)),
      },
    });
  },
};
