import { contentRedrawnAs } from "../../lib/content-redraw";
import {
  deepDiveAsTransition,
  dualPillAsRoadmap,
  evolutionAsProcess,
  gridAsContent,
  overviewAsPhases,
} from "../../lib/slide-aliases";
import { mediaAsContent } from "../../lib/gallery-media";
import { regularAsContent } from "../../lib/regular-sections";
import type { ComparisonSlide, GridSlide, Slide } from "../../types/slide";

// Pillars and stats are a content slide's cards or numbers, as on the web (`gridAsContent`).
function gridRedrawnAs(d: GridSlide): Slide | undefined {
  return d.variant === "quotes" ? undefined : gridAsContent(d);
}

function comparisonRedrawnAs(d: ComparisonSlide): Slide | undefined {
  if (d.variant === "guidance") return { ...d, type: "guidance" };
  if (d.variant !== "positions") return;
  const { left, right, middle, resolution } = d;
  return {
    type: "content",
    sectionLabel: d.sectionLabel,
    headline: d.headline ?? "",
    subtitle: d.subtitle,
    content: [{ type: "positions", left, right, middle, resolution }],
  };
}

const REDRAWN: {
  [K in Slide["type"]]?: (d: Extract<Slide, { type: K }>) => Slide | undefined;
} = {
  content: contentRedrawnAs,
  // As on the web, a regular slide is the content or agenda slide that replaces it
  // (`regularAsContent`); one with a profile keeps its sidebar.
  regular: regularAsContent,
  evolution: evolutionAsProcess,
  grid: gridRedrawnAs,
  comparison: comparisonRedrawnAs,
  media: mediaAsContent,
  overview: overviewAsPhases,
  // Drawn as the night transition that replaces it, as on the web; `isDeepDive` gives it night.
  "deep-dive-divider": deepDiveAsTransition,
  "dual-pill-overview": dualPillAsRoadmap,
};

export function slideDrawn(slide: Slide): Slide {
  let drawn = slide;
  while (Object.hasOwn(REDRAWN, drawn.type)) {
    const replacement = REDRAWN[drawn.type]?.(drawn as never);
    if (!replacement) break;
    drawn = replacement;
  }
  return drawn;
}
