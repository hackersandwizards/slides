import type { CSSProperties } from "react";
import { WORDS } from "../../lib/slide-utils";

const ARROW = (
  <span className="hw-arrow" aria-hidden="true">
    &nbsp;<span>&rarr;</span>
  </span>
);

export interface DeckTileProps {
  /** Where the tile opens the deck: its first slide, or the slide its day starts on. */
  href: string;
  /** The deck's print view, a link of its own above the tile's. */
  printHref?: string;
  title: string;
  blurb?: string;
  slideCount: number;
  /** The deck's family on brand's pill, in its hue by day and by night (brand's category rule);
   *  without a hue the pill is neutral. */
  family: { label: string; hue?: readonly [day: string, night: string] };
  /** A deck in use: more room and a larger title. */
  featured?: boolean;
  /** The language of the tile's own words, the slide count and the print link: the list's. */
  lang?: "en" | "de";
}

/** One deck on a deck list, brand's linked card: the title link stretches over the whole tile, so
 *  the tile answers the pointer as one target, and the print view sits above it as its own link.
 *  The deck list itself, its groups and its order, stays each site's. */
export function DeckTile({
  href,
  printHref,
  title,
  blurb,
  slideCount,
  family,
  featured = false,
  lang = "en",
}: DeckTileProps) {
  const words = WORDS[lang];
  const [day, night] = family.hue ?? [];
  // Settings of brand's elements rather than utilities: a hub page renders the tile without
  // slides.css, so neither its card-pad-* utility nor its muted text role reaches it there, and
  // the grey is the inherited text at 70 %, which holds on day, night and the hub's dark theme.
  // Labels set in Inter, as on the apps' pills.
  const style = {
    "--hw-pill-hue": day,
    "--hw-pill-hue-night": night,
    "--hw-card-pad": featured ? "calc(var(--spacing) * 5)" : undefined,
    "--hw-label-family": "var(--font-sans)",
  } as CSSProperties;
  return (
    <article className="hw-card" style={style}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="hw-pill" data-caps data-tone={day ? undefined : "neutral"}>
          {family.label}
        </span>
        <span className="shrink-0 text-small text-current/70 tabular-nums">
          {words.slides(slideCount)}
        </span>
      </div>
      <h3 className={`mt-2 font-heading font-bold ${featured ? "text-body" : "text-small"}`}>
        <a href={href} className="hw-card-link">
          {title}
          {ARROW}
        </a>
      </h3>
      {blurb && <p className="mt-1 text-small text-current/70">{blurb}</p>}
      {printHref && (
        <a href={printHref} className="hw-arrow-link inline-block text-small">
          {words.printView}
          {ARROW}
        </a>
      )}
    </article>
  );
}
