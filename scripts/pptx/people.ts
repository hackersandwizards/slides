import { profileLabel, profileUrls } from "../../lib/link-labels";
import type { Palette } from "./palette";
import type { Para } from "./text";

/** A person's LinkedIn or GitHub address in muted ink, linked: `LinkCaption`'s profile variants. */
export const profileLink = (url: string, c: Palette): Para => ({
  runs: [{ text: profileLabel(url), options: { color: c.muted, hyperlink: { url } } }],
});

/** A person's profiles on one line in PowerPoint. */
export const profileRow = (p: { linkedIn?: string; github?: string }, c: Palette): Para => ({
  runs: profileUrls(p).flatMap((url, i) => [
    ...(i ? [{ text: "    " }] : []),
    ...profileLink(url, c).runs,
  ]),
});
