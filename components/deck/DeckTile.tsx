import type { CSSProperties } from "react";

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
}: DeckTileProps) {
  const [day, night] = family.hue ?? [];
  const style = {
    ...(day && { "--hw-pill-hue": day, "--hw-pill-hue-night": night }),
    ...(featured && { "--hw-card-pad": "calc(var(--spacing) * 5)" }),
  } as CSSProperties;
  return (
    <article className="hw-card" style={style}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="hw-pill" data-caps data-tone={day ? undefined : "neutral"}>
          {family.label}
        </span>
        <span className="shrink-0 text-small text-current/70 tabular-nums">
          {slideCount} slides
        </span>
      </div>
      <h3 className={`mt-2 font-heading font-bold ${featured ? "text-body" : "text-small"}`}>
        <a href={href} className="hw-card-link">
          {title}
          <span className="hw-arrow" aria-hidden="true">
            &nbsp;<span>&rarr;</span>
          </span>
        </a>
      </h3>
      {blurb && <p className="mt-1 text-small text-current/70">{blurb}</p>}
      {printHref && (
        <a href={printHref} className="hw-arrow-link inline-block text-small">
          Print view
          <span className="hw-arrow" aria-hidden="true">
            &nbsp;<span>&rarr;</span>
          </span>
        </a>
      )}
    </article>
  );
}
