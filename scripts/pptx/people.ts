import { profileLabel } from "../../lib/link-labels";
import type { Palette } from "./palette";
import type { Para } from "./text";

/** A person's LinkedIn or GitHub address in muted ink, linked: `LinkCaption`'s profile variants. */
export const profileLink = (url: string, c: Palette): Para => ({
  runs: [{ text: profileLabel(url), options: { color: c.muted, hyperlink: { url } } }],
});

/** A person's profiles, LinkedIn first, one line each. */
export const profileUrls = (p: { linkedIn?: string; github?: string }): string[] =>
  [p.linkedIn, p.github].filter((url): url is string => !!url);

/** A person's profiles in one line, as `ProfileLinks` sets them side by side. */
export const profileRow = (p: { linkedIn?: string; github?: string }, c: Palette): Para => ({
  runs: profileUrls(p).flatMap((url, i) => [
    ...(i ? [{ text: "    " }] : []),
    ...profileLink(url, c).runs,
  ]),
});
