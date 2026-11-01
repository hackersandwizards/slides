window.DECISION_REPOS = window.DECISION_REPOS || {};
window.DECISION_REPOS["slides"] = [
  {
    id: "catalogue-grouping",
    title: "How should the catalogue page order slides, so you can find a slide for X?",
    area: "slides",
    priority: 2,
    order: 350,
    status: "open",
    context:
      "Today the specimen page shows 26 tiles, the first slide of each type, with no description, only two of the 26 blocks and no variants. Phase 3 rebuilds it, with search and a detail view per entry (when to use, variants, do and don't, number of deck slides). Still open is the order in the left column. Mockup and reasoning: docs/tracking/2026-11-01-catalogue-program.md, section Katalogseite (catalogue page).",
    options: [
      {
        key: "job",
        label: "By communication job",
        detail:
          "13 jobs such as compare, process, schedule, data, exercise. An entry may sit under two jobs. Search also finds every type name.",
      },
      {
        key: "shape",
        label: "By shape",
        detail:
          "Text, cards, diagram, data, image, code, scaffold. Closer to the engine, further from the question you have while building.",
      },
      {
        key: "alpha",
        label: "Alphabetical by type, with search",
        detail: "As today, but with every block, every variant and a search.",
      },
    ],
    recommended: "job",
    images: { job: "docs/tracking/2026-11-01-catalogue-program/katalog-mockup.jpg" },
  },
  {
    id: "merge-cards",
    title:
      "Should five card shapes become one: grid pillars, labeled-grid, four-column and hooks into cards?",
    area: "slides",
    priority: 3,
    order: 1002,
    status: "open",
    context:
      "Five entries show parallel points as cards: cards (100 deck slides), grid pillars (45), labeled-grid (16), four-column (11), hooks (5). Differences: number tiles with a colour per card, one highlighted cell, a list per column, the name in mono. cards would gain highlighting, a list and reveal; the colour per card goes. Applies only once cards scores at least level on real deck slides in the blind panel. Phase 4 converts 77 slides. Report, group 1.",
    options: [
      {
        key: "merge",
        label: "Merge into cards",
        detail: "After a tie in the blind panel. grid stays only with quotes (2 slides).",
      },
      {
        key: "keep",
        label: "Leave it",
        detail: "All five stay; phase 2 optimises each shape on its own.",
      },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-karten.jpg" },
  },
  {
    id: "merge-comparison",
    title: "Should transform, guidance and positions become variants of comparison?",
    area: "slides",
    priority: 3,
    order: 1003,
    status: "open",
    context:
      "Four full-page comparisons: comparison (21 deck slides), transform (6, before and after, the same as comparison before-after), guidance (2, bad and good, score 6.50), positions (1, two stances and a resolution). The two-column block (105) stays, because it shares the slide with other blocks. Applies only after a tie in the blind panel. Report, group 2.",
    options: [
      {
        key: "merge",
        label: "Merge into comparison",
        detail:
          "transform becomes before-after; guidance and positions become variants of their own.",
      },
      { key: "keep", label: "Leave it", detail: "All four stay." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-vergleich.jpg" },
  },
  {
    id: "merge-flow",
    title: "Should evolution and pipeline merge into flow?",
    area: "slides",
    priority: 3,
    order: 1004,
    status: "open",
    context:
      "Three linear processes: flow (17 deck slides), evolution (24, stages with multiplier and badge), pipeline (37, stages with status, logos, loops and frame). flow would gain a badge per step and an optional frame. process (circle, score 7.75), lanes and layers stay as shapes of their own. Applies only after a tie in the blind panel. Phase 4 converts 61 slides. Report, group 3.",
    options: [
      {
        key: "merge",
        label: "Merge into flow",
        detail: "evolution and pipeline become options of flow.",
      },
      { key: "keep", label: "Leave it", detail: "All three stay." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-ablauf.jpg" },
  },
  {
    id: "merge-phased-pills",
    title: "Should dual-pill-overview and roadmap merge into phased-pills?",
    area: "slides",
    priority: 3,
    order: 1005,
    status: "open",
    context:
      "Three deck overviews, all weak in the type panel of tm-: phased-pills 5.58 (43 deck slides), dual-pill-overview 4.92 (1), roadmap 6.50 (5). dual-pill-overview is two phased-pills columns, roadmap two columns with a description. phased-pills would gain an optional second column. Waits on dd- (deep-dive look), which decides the column accents. overview stays for now and gets reworked. Report, group 4.",
    options: [
      {
        key: "merge",
        label: "Merge into phased-pills",
        detail: "After dd- and after a tie in the blind panel.",
      },
      {
        key: "keep",
        label: "Leave it",
        detail: "All three stay; dd- and phase 2 rework each on its own.",
      },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-uebersicht.jpg" },
  },
  {
    id: "merge-numbers",
    title: "Should grid stats merge into numbers?",
    area: "slides",
    priority: 3,
    order: 1006,
    status: "open",
    context:
      "Two number shapes: numbers (9 deck slides; value, label, source) and grid stats (7; the same values in cards with icon and description, without a source). Applies only after a tie in the blind panel. Report, group 5.",
    options: [
      { key: "merge", label: "Merge into numbers", detail: "grid stats goes." },
      { key: "keep", label: "Leave it", detail: "Both number shapes stay." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-zahlen.jpg" },
  },
  {
    id: "merge-content",
    title: "Should regular merge into content?",
    area: "slides",
    priority: 3,
    order: 1007,
    status: "open",
    context:
      "regular (60 deck slides, 54 of them in talks) sets sections with title, list, text, link and icon, optionally a profile sidebar. content (1,033) builds the same from blocks. The sidebar would become an option of content. The biggest conversion in phase 4, mainly pitch and client decks in talks. Applies only after a tie in the blind panel. Report, group 6.",
    options: [
      {
        key: "merge",
        label: "Merge into content",
        detail: "A codemod converts the 60 slides; PDFs already sent stay as they are.",
      },
      { key: "keep", label: "Leave it", detail: "regular stays a type of its own." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-textfolie.jpg" },
  },
  {
    id: "merge-statement",
    title: "Should content centered merge into statement?",
    area: "slides",
    priority: 3,
    order: 1008,
    status: "open",
    context:
      "Two shapes for a single statement: statement (96 deck slides, score 5.75) and content with layout centered (7). Four of the seven centered slides carry a linked QR code, so statement gets a linked image; the one positions slide goes with merge-comparison, and the one terminal slide stays content without centring. statement gets reworked in phase 2 anyway: the reviewers faulted the glow behind the content and the struck-through word. Applies only after a tie in the blind panel. Report, group 7.",
    options: [
      { key: "merge", label: "Merge into statement", detail: "layout centered goes." },
      { key: "keep", label: "Leave it", detail: "Both stay." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-aussage.jpg" },
  },
  {
    id: "catalogue-migration-scope",
    title: "Phase 4 converts every deck, including those already delivered",
    area: "slides",
    priority: 2,
    order: 9,
    status: "assumed",
    context:
      "A type that drops out of the engine breaks the typecheck of every deck that uses it. So phase 4 moves all 52 decks in talks, trainer-hub and hycle, deliveries and client decks included, just as delivered decks have followed the engine since slides v0.4.6. PDFs already sent stay as they are.",
    assumption: "Every deck, by a codemod per repo, following the decisions in the merge rows.",
  },
  {
    id: "team-topology-grammar",
    title: "team-topology gets the shapes of Team Topologies, in brand colours",
    area: "slides",
    priority: 3,
    order: 10,
    status: "assumed",
    context:
      "Shipped in v0.12.0: stream-aligned teams horizontal in teal, enabling vertical on the left in purple, subsystem as an octagon in neutral, platform across the full width with a dotted teal border, no red, no footer band. Blind panel: today 5.90, new 7.51, noise per image 0.29; round 2 had no winner above the noise (plateau). Departure from the templates: the platform carries the brand corner instead of square corners (7.51 against 7.26). Before and after: docs/tracking/2026-11-01-catalogue-program/phase2-team-topology.jpg.",
    assumption:
      "Shape language from the templates, colours from the brand, decided in the blind panel.",
  },
];
