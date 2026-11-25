import type {
  AgendaSlide,
  ContentBlock,
  ContentSection,
  ContentSlide,
  RegularSlide,
} from "../types/slide";

/** A section's text with its link set as a markdown link after it. */
const sectionText = (s: ContentSection) =>
  [s.text, s.link && `[${s.link.label}](${s.link.url})`].filter(Boolean).join(" ") || undefined;

/** Groups the titled sections in source order. Untitled sections are placed independently. */
export function titledSectionsAsBlocks(titled: ContentSection[]): ContentBlock[] {
  if (titled.length >= 3) {
    return [
      {
        type: "cards",
        items: titled.map((s) => ({
          title: s.title,
          text: sectionText(s),
          icon: s.icon,
          items: s.items,
        })),
        // Five and six sections stand in three columns, so their columns never narrow to a
        // quarter.
        columns: titled.length === 4 || titled.length > 6 ? 4 : 3,
        dense: true,
      },
    ];
  }
  if (titled.length === 2) {
    return [
      {
        type: "two-column",
        left: {
          title: titled[0].title,
          items: titled[0].items,
          text: sectionText(titled[0]),
        },
        right: {
          title: titled[1].title,
          items: titled[1].items,
          text: sectionText(titled[1]),
        },
      },
    ];
  }
  return titled.flatMap((s): ContentBlock[] => [
    {
      type: "paragraph",
      text: [`**${s.title}**`, sectionText(s)].filter(Boolean).join(" "),
    },
    ...(s.items ? [{ type: "bullets" as const, items: s.items }] : []),
  ]);
}

/** A `regular` slide as the slide that replaces it, or undefined for one with a profile, which
 *  keeps its own drawing. The cards layout is an agenda; otherwise two titled sections become a
 *  two-column block, one a lead line over its list, three and more a cards block with a list per
 *  card; an untitled section is a list, a paragraph, or the closing
 *  callout where it comes last. */
export function regularAsContent(slide: RegularSlide): ContentSlide | AgendaSlide | undefined {
  if (slide.profile) return;
  if (slide.layout === "cards")
    return {
      type: "agenda",
      headline: slide.headline,
      items: slide.sections.map((s) => ({
        title: s.title ?? sectionText(s) ?? "",
        text: s.title ? (sectionText(s) ?? s.items?.join(", ")) : undefined,
      })),
    };
  const titled = slide.sections.filter((s) => s.title);
  const grouped = titledSectionsAsBlocks(titled);
  const content: ContentBlock[] = [];
  slide.sections.forEach((s, i) => {
    if (s.title) {
      if (s === titled[0]) content.push(...grouped);
      return;
    }
    const text = sectionText(s);
    if (text)
      content.push(
        i === slide.sections.length - 1 && i > 0
          ? { type: "callout", text }
          : { type: "paragraph", text },
      );
    if (s.items) content.push({ type: "bullets", items: s.items });
  });
  return { type: "content", headline: slide.headline, content };
}
