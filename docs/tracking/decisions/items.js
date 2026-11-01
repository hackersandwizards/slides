window.DECISION_REPOS = window.DECISION_REPOS || {};
window.DECISION_REPOS["slides"] = [
  {
    id: "catalogue-grouping",
    title: "Wie soll die Katalogseite Folien ordnen, damit man eine Folie für X findet?",
    area: "slides",
    priority: 2,
    order: 350,
    status: "open",
    context:
      "Die Specimen-Seite zeigt heute 26 Kacheln, je Typ die erste Folie, ohne Beschreibung, mit nur zwei der 26 Blöcke und ohne Varianten. Phase 3 baut sie neu, mit Suche, je Eintrag einer Detailansicht (Wann, Varianten, Do und Don't, Zahl der Deckfolien). Offen ist die Ordnung links. Mockup und Begründung: docs/tracking/2026-11-01-catalogue-program.md, Abschnitt Katalogseite.",
    options: [
      {
        key: "job",
        label: "Nach Kommunikationsaufgabe",
        detail:
          "13 Aufgaben wie Vergleichen, Ablauf, Zeitplan, Daten, Übung. Ein Eintrag darf in zwei Aufgaben stehen. Die Suche findet zusätzlich jeden Typnamen.",
      },
      {
        key: "shape",
        label: "Nach Form",
        detail:
          "Text, Karten, Diagramm, Daten, Bild, Code, Gerüst. Näher an der Engine, weiter weg von der Frage, die man beim Bauen hat.",
      },
      {
        key: "alpha",
        label: "Alphabetisch nach Typ, mit Suche",
        detail: "Wie heute, nur mit allen Blöcken, Varianten und einer Suche.",
      },
    ],
    recommended: "job",
    images: { job: "docs/tracking/2026-11-01-catalogue-program/katalog-mockup.jpg" },
  },
  {
    id: "merge-cards",
    title:
      "Sollen fünf Kartenformen eine werden: grid pillars, labeled-grid, four-column und hooks in cards?",
    area: "slides",
    priority: 3,
    order: 1002,
    status: "open",
    context:
      "Fünf Einträge zeigen parallele Punkte als Karten: cards (100 Deckfolien), grid pillars (45), labeled-grid (16), four-column (11), hooks (5). Unterschiede: Nummernkacheln mit Farbe je Karte, eine hervorgehobene Zelle, eine Liste je Spalte, Name in Mono. cards bekäme Hervorhebung, Liste und Aufdecken, die Farbe je Karte fällt weg. Gilt erst, wenn cards auf echten Deckfolien im Blind-Panel mindestens gleichauf liegt. Phase 4 stellt 77 Folien um. Bericht, Gruppe 1.",
    options: [
      {
        key: "merge",
        label: "Zusammenlegen in cards",
        detail: "Nach Blind-Panel-Gleichstand. grid bleibt nur mit quotes (2 Folien).",
      },
      {
        key: "keep",
        label: "So lassen",
        detail: "Alle fünf bleiben, Phase 2 optimiert jede Form für sich.",
      },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-karten.jpg" },
  },
  {
    id: "merge-comparison",
    title: "Sollen transform, guidance und positions Varianten von comparison werden?",
    area: "slides",
    priority: 3,
    order: 1003,
    status: "open",
    context:
      "Vier ganzseitige Vergleiche: comparison (21 Deckfolien), transform (6, Vorher und Nachher, dasselbe wie comparison before-after), guidance (2, schlecht und gut, Wertung 6,50), positions (1, zwei Haltungen und eine Auflösung). Der Block two-column (105) bleibt, weil er sich die Folie mit anderen Blöcken teilt. Gilt erst nach Blind-Panel-Gleichstand. Bericht, Gruppe 2.",
    options: [
      {
        key: "merge",
        label: "Zusammenlegen in comparison",
        detail: "transform wird before-after, guidance und positions werden eigene Varianten.",
      },
      { key: "keep", label: "So lassen", detail: "Alle vier bleiben." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-vergleich.jpg" },
  },
  {
    id: "merge-flow",
    title: "Sollen evolution und pipeline in flow aufgehen?",
    area: "slides",
    priority: 3,
    order: 1004,
    status: "open",
    context:
      "Drei lineare Abläufe: flow (17 Deckfolien), evolution (24, Stufen mit Multiplikator und Badge), pipeline (37, Stufen mit Status, Logos, Schleifen und Rahmen). flow bekäme Badge je Schritt und einen optionalen Rahmen. process (Kreis, Wertung 7,75), lanes und layers bleiben als eigene Formen. Gilt erst nach Blind-Panel-Gleichstand. Phase 4 stellt 61 Folien um. Bericht, Gruppe 3.",
    options: [
      {
        key: "merge",
        label: "Zusammenlegen in flow",
        detail: "evolution und pipeline werden Optionen von flow.",
      },
      { key: "keep", label: "So lassen", detail: "Alle drei bleiben." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-ablauf.jpg" },
  },
  {
    id: "merge-phased-pills",
    title: "Sollen dual-pill-overview und roadmap in phased-pills aufgehen?",
    area: "slides",
    priority: 3,
    order: 1005,
    status: "open",
    context:
      "Drei Deck-Übersichten, alle schwach im Typen-Panel von tm-: phased-pills 5,58 (43 Deckfolien), dual-pill-overview 4,92 (1), roadmap 6,50 (5). dual-pill-overview ist zwei phased-pills-Spalten, roadmap zwei Spalten mit Beschreibung. phased-pills bekäme eine optionale zweite Spalte. Wartet auf dd- (Deep-Dive-Look), das die Spaltenakzente entscheidet. overview bleibt vorerst und wird überarbeitet. Bericht, Gruppe 4.",
    options: [
      {
        key: "merge",
        label: "Zusammenlegen in phased-pills",
        detail: "Nach dd- und nach Blind-Panel-Gleichstand.",
      },
      {
        key: "keep",
        label: "So lassen",
        detail: "Alle drei bleiben, dd- und Phase 2 überarbeiten jede für sich.",
      },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-uebersicht.jpg" },
  },
  {
    id: "merge-numbers",
    title: "Soll grid stats in numbers aufgehen?",
    area: "slides",
    priority: 3,
    order: 1006,
    status: "open",
    context:
      "Zwei Zahlenformen: numbers (9 Deckfolien, Wert, Bezeichnung, Quelle) und grid stats (7, dieselben Werte in Karten mit Icon und Beschreibung, ohne Quelle). Gilt erst nach Blind-Panel-Gleichstand. Bericht, Gruppe 5.",
    options: [
      { key: "merge", label: "Zusammenlegen in numbers", detail: "grid stats fällt weg." },
      { key: "keep", label: "So lassen", detail: "Beide Zahlenformen bleiben." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-zahlen.jpg" },
  },
  {
    id: "merge-content",
    title: "Soll regular in content aufgehen?",
    area: "slides",
    priority: 3,
    order: 1007,
    status: "open",
    context:
      "regular (60 Deckfolien, 54 davon in talks) setzt Abschnitte mit Titel, Liste, Text, Link und Icon, optional eine Profil-Seitenleiste. content (1.033) setzt dasselbe aus Blöcken. Die Seitenleiste würde eine Option von content. Größte Umstellung in Phase 4, vor allem Pitch- und Kundendecks in talks. Gilt erst nach Blind-Panel-Gleichstand. Bericht, Gruppe 6.",
    options: [
      {
        key: "merge",
        label: "Zusammenlegen in content",
        detail: "Ein Codemod stellt die 60 Folien um, verschickte PDFs bleiben, wie sie sind.",
      },
      { key: "keep", label: "So lassen", detail: "regular bleibt als eigener Typ." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-textfolie.jpg" },
  },
  {
    id: "merge-statement",
    title: "Soll content centered in statement aufgehen?",
    area: "slides",
    priority: 3,
    order: 1008,
    status: "open",
    context:
      "Zwei Formen für eine Einzelaussage: statement (96 Deckfolien, Wertung 5,75) und content mit layout centered (7). Vier der sieben centered-Folien tragen einen verlinkten QR-Code, dafür bekommt statement ein verlinktes Bild; die eine positions-Folie geht mit merge-comparison, die eine terminal-Folie bleibt content ohne Zentrierung. statement wird in Phase 2 ohnehin überarbeitet: die Reviewer rügten das Leuchten hinter dem Inhalt und das durchgestrichene Wort. Gilt erst nach Blind-Panel-Gleichstand. Bericht, Gruppe 7.",
    options: [
      { key: "merge", label: "Zusammenlegen in statement", detail: "layout centered fällt weg." },
      { key: "keep", label: "So lassen", detail: "Beide bleiben." },
    ],
    recommended: "merge",
    images: { merge: "docs/tracking/2026-11-01-catalogue-program/merge-aussage.jpg" },
  },
  {
    id: "catalogue-migration-scope",
    title: "Phase 4 stellt alle Decks um, auch die schon ausgelieferten",
    area: "slides",
    priority: 2,
    order: 9,
    status: "assumed",
    context:
      "Ein Typ, der aus der Engine fällt, bricht den Typecheck jedes Decks, das ihn nutzt. Deshalb zieht Phase 4 alle 52 Decks in talks, trainer-hub und hycle um, Lieferungen und Kundendecks eingeschlossen, so wie seit slides v0.4.6 ausgelieferte Decks der Engine folgen. Verschickte PDFs bleiben, wie sie sind.",
    assumption: "Alle Decks, per Codemod je Repo, nach den Entscheidungen der merge-Zeilen.",
  },
  {
    id: "team-topology-grammar",
    title: "team-topology bekommt die Formen der Team Topologies, in Markenfarben",
    area: "slides",
    priority: 3,
    order: 10,
    status: "assumed",
    context:
      "Ausgeliefert in v0.12.0: Stream-Teams waagerecht in Teal, Enabling senkrecht links in Purple, Subsystem als Achteck in Neutral, Plattform über die volle Breite mit gepunktetem Teal-Rand, kein Rot, kein Fußband. Blind-Panel: heute 5,90, neu 7,51, Rauschen je Bild 0,29; Runde 2 ohne Gewinner über dem Rauschen (Plateau). Abweichung von den Templates: die Plattform trägt die Markenecke statt eckiger Ecken (7,51 gegen 7,26). Vorher und nachher: docs/tracking/2026-11-01-catalogue-program/phase2-team-topology.jpg.",
    assumption: "Formensprache der Templates, Farben aus der Marke, entschieden im Blind-Panel.",
  },
];
