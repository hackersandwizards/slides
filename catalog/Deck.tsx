import brand from "@hackersandwizards/brand/tokens.json";
import type { CSSProperties } from "react";
import { DeckTile, type DeckTileProps } from "../components/deck/DeckTile";

// The story frame is on the stage scale, whose --radius-brand is the slide's corner: the sheet
// sets the card's corner back to the site's, which a deck list has.
const LIST = { "--hw-card-corner": brand.tokens["--radius-brand"] } as CSSProperties;

// Made-up decks; the hues are brand's category hues, day and night.
const TILES: DeckTileProps[] = [
  {
    href: "#",
    printHref: "#",
    title: "Shipping the Loop",
    blurb: "A keynote cut for an engineering conference, 40 minutes.",
    slideCount: 42,
    family: { label: "Talk", hue: ["var(--color-teal)", "var(--color-teal-night)"] },
    featured: true,
  },
  {
    href: "#",
    printHref: "#",
    title: "Three-Day Foundations",
    blurb: "The workshop's full run, one section per day.",
    slideCount: 118,
    family: { label: "Workshop", hue: ["var(--color-purple)", "var(--color-purple-night)"] },
    featured: true,
  },
  {
    href: "#",
    printHref: "#",
    title: "Slide Reference",
    blurb: "Every slide type once.",
    slideCount: 64,
    family: { label: "Reference", hue: ["var(--color-ampersand)", "var(--color-ampersand-light)"] },
  },
  {
    href: "#",
    title: "Kick-off Draft",
    slideCount: 9,
    family: { label: "Unsorted" },
  },
];

/** The deck tile on a deck list's two grounds, the dense scale both lists use: in use (featured)
 *  and archived, with a family's hue and without one, with a print view and without. */
export function DeckTileSheet() {
  const grid = (night: boolean) => (
    <div
      className="bg-background p-10 text-text"
      data-hw-scale="dense"
      style={LIST}
      {...(night && { "data-theme": "dark", "data-hw-night": "" })}
    >
      <div className="grid grid-cols-2 gap-3">
        {TILES.slice(0, 2).map((tile) => (
          <DeckTile key={tile.title} {...tile} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {TILES.slice(2).map((tile) => (
          <DeckTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  );
  return (
    <div className="min-h-screen">
      {grid(false)}
      {grid(true)}
    </div>
  );
}
