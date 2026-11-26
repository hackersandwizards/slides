"use client";

import { type ReactNode } from "react";
import ArrowUpRight from "lucide-react/icons/arrow-up-right";
import { linkLabel, profileLabel } from "../../lib/link-labels";
import { Linkedin } from "../../lib/icons";

/** A link spelled out under a picture or a QR code: the address's one link for the keyboard and
 *  screen readers. `linkedin`: a profile card's short address (`in/name`) behind the LinkedIn
 *  glyph, not the word "LinkedIn" in teal or an outlined button. */
export function LinkCaption({ href, variant }: { href: string; variant?: "linkedin" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        variant
          ? "inline-flex items-center gap-2 text-lg text-text-muted md:whitespace-nowrap"
          : "slide-media-caption slide-media-link"
      }
    >
      {variant ? (
        <Linkedin className="size-5 shrink-0" />
      ) : (
        <ArrowUpRight className="size-(--slide-link-icon) shrink-0" strokeWidth={2.25} />
      )}
      {variant ? profileLabel(href) : linkLabel(href)}
    </a>
  );
}

/** A picture linked to the address its `LinkCaption` spells out: out of the tab order, so the
 *  keyboard reaches the address once; a screen reader still reads the picture's alt text. */
export function PictureLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="contents" tabIndex={-1}>
      {children}
    </a>
  );
}
