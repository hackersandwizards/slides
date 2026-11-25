/** A figure the engine prints from a number: exact to two decimals, ungrouped. */
const FIGURE = { maximumFractionDigits: 2, useGrouping: false } as const;

/** The words the engine prints itself, in the deck's language. */
export const WORDS = {
  en: {
    here: "We are here",
    bad: "Bad",
    good: "Good",
    planned: "planned",
    discussion: "Discussion",
    printView: "Print view",
    milestones: "Milestones",
    slides: (n: number) => (n === 1 ? "1 slide" : `${n} slides`),
    figure: (n: number) => n.toLocaleString("en", FIGURE),
    // Team Topologies' own terms, which German decks keep but for the platform team.
    teams: {
      enabling: "Enabling team",
      stream: "Stream-aligned team",
      subsystem: "Complicated-subsystem team",
      platform: "Platform team",
    },
  },
  de: {
    here: "Wir sind hier",
    bad: "Schlecht",
    good: "Gut",
    planned: "geplant",
    discussion: "Diskussion",
    printView: "Druckansicht",
    milestones: "Meilensteine",
    slides: (n: number) => (n === 1 ? "1 Folie" : `${n} Folien`),
    figure: (n: number) => n.toLocaleString("de", FIGURE),
    teams: {
      enabling: "Enabling Team",
      stream: "Stream-aligned Team",
      subsystem: "Complicated-Subsystem-Team",
      platform: "Plattform-Team",
    },
  },
} as const;
