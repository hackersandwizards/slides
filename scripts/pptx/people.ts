import { profileLabel } from "../../lib/link-labels";
import type { Palette } from "./palette";
import type { Para } from "./text";

/** A person's LinkedIn address in muted ink, linked: `LinkCaption`'s linkedin variant. */
export const profileLink = (url: string, c: Palette): Para => ({
  runs: [{ text: profileLabel(url), options: { color: c.muted, hyperlink: { url } } }],
});
