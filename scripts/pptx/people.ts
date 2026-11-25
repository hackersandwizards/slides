import { profileLabel } from "../../lib/slide-utils";
import { hex, type Palette } from "./palette";
import type { Sheet } from "./sheet";
import type { Disc } from "./stage";
import type { Para } from "./text";

export interface PersonPicture {
  image?: string;
  name: string;
  tone: string;
}

export function portrait(sheet: Sheet, { image, name, tone }: PersonPicture, disc: Disc): void {
  const { x, y, d } = disc;
  const { slide: s } = sheet;
  // Round, as the web's hw-avatar.
  if (image) sheet.avatar(image, disc, { alt: name });
  else {
    s.addShape("ellipse", { x, y, w: d, h: d, fill: { color: tone }, line: { type: "none" } });
    sheet.box(
      {
        runs: [
          {
            text: name
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2),
          },
        ],
      },
      { x, y, w: d, h: d },
      {
        size: d * 24,
        mono: true,
        bold: true,
        color: hex("--color-white"),
        align: "center",
        valign: "middle",
      },
    );
  }
}

/** A person's LinkedIn address in muted ink, linked: `LinkCaption`'s linkedin variant. */
export const profileLink = (url: string, c: Palette): Para => ({
  runs: [{ text: profileLabel(url), options: { color: c.muted, hyperlink: { url } } }],
});
