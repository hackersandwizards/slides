import type { Presentation, Slide } from "../types/slide";

// The specimen deck: every slide type the engine registers, each in the variants that change its
// layout (theme, density, with and without media, the longest content a slide is built to hold).
// All names, companies and figures are fictional: this repo is public. talks shows it as
// `slide-catalogue`, and its `test/slide-catalogue.test.ts` fails when a slide type, content block
// or variant has no slide here. Each slide's `notes` name the variant it shows. The images are in
// `slide-catalogue/` next to this file, at `/slide-catalogue/` in a consumer's `public/`.

const IMG = "/slide-catalogue";

const longBullets = [
  "Every pull request runs the same checks the agent ran locally, so review starts from green",
  "The harness writes its own plan before it writes code, and the plan is reviewed first",
  "Flaky tests are quarantined within a day and fixed by the team that owns them",
  "Each team keeps one page of conventions the agent reads before every task",
  "A failed deployment rolls back without a person deciding it",
  "Metrics are read every Monday and decide what the team stops doing",
];

const slides: Slide[] = [
  {
    type: "title",
    title: "Slide Catalogue",
    subtitle: "Every slide type and its variants, with fictional content",
    notes: "title: with subtitle.",
  },
  {
    type: "title",
    title: "How Lumen Freight moved four hundred engineers onto one delivery harness in a year",
    notes: "title: no subtitle, longest title.",
  },

  {
    type: "agenda",
    headline: "Agenda",
    items: ["Where we stand", "How the loop works", "What changes for the team"],
    notes: "agenda: three items.",
  },
  {
    type: "agenda",
    headline: "Agenda for the two-day workshop",
    items: [
      "Where the organisation stands today",
      "How the delivery loop works end to end",
      "Plans before code: the execution plan",
      "Review that starts from green",
      "Knowledge the agent reads first",
      "What changes for the team on Monday",
      "Questions and next steps",
    ],
    notes: "agenda: seven items, the most it holds.",
  },

  // ─── content: section themes and header furniture ───────────────────────
  {
    type: "content",
    sectionLabel: "Primary theme",
    sectionTheme: "primary",
    principle: "One loop per team",
    headline: "Content slide with kicker, principle pill and footer",
    subtitle: "A subtitle states the slide's claim in one sentence.",
    content: [
      { type: "paragraph", text: "A paragraph carries **one thought** with an optional link." },
      {
        type: "bullets",
        items: ["Short bullets read faster", { text: "Nested items", children: ["One level"] }],
      },
    ],
    footer: "Footer line: the take-away the speaker repeats.",
    notes: "content: primary theme, principle, subtitle, paragraph, nested bullets, footer.",
  },
  {
    type: "content",
    sectionLabel: "Secondary theme",
    sectionTheme: "secondary",
    headline: "Numbered steps and a badge",
    badge: "New",
    content: [
      {
        type: "bullets",
        ordered: true,
        items: ["Write the plan", "Review the plan", "Let the agent build", "Review the result"],
      },
    ],
    notes: "content: secondary theme, badge, ordered bullets.",
  },
  {
    type: "content",
    sectionLabel: "Accent theme",
    sectionTheme: "accent",
    stageMarker: ["Implement", "Review"],
    headline: "Stage strip marks where in the pipeline we are",
    content: [{ type: "callout", text: "Two stages are active on this slide.", variant: "info" }],
    notes: "content: accent theme, stage strip with two active stages, info callout.",
  },
  {
    type: "content",
    sectionLabel: "Warning theme",
    sectionTheme: "warning",
    stagePrefix: "Stage 2",
    stageMarker: ["QA"],
    headline: "Stage prefix before the strip",
    content: [
      { type: "callout", text: "A warning callout names a risk.", variant: "warning" },
      { type: "callout", text: "A success callout names a result.", variant: "success" },
      {
        type: "callout",
        text: "A full-width callout spans the column so stacked callouts line up.",
        fullWidth: true,
      },
    ],
    notes: "content: warning theme, stage prefix, warning, success and full-width callouts.",
  },
  {
    type: "content",
    sectionLabel: "Success theme",
    sectionTheme: "success",
    headline: "Success theme",
    content: [{ type: "paragraph", text: "The kicker takes the green of the success theme." }],
    notes: "content: success theme, sparse.",
  },
  {
    type: "content",
    sectionLabel: "Deep-dive theme",
    sectionTheme: "deepdive",
    headline: "Deep-dive theme",
    content: [{ type: "paragraph", text: "The kicker takes the deep-dive purple." }],
    notes: "content: deepdive theme, sparse.",
  },
  {
    type: "content",
    layout: "centered",
    sectionLabel: "Centered layout",
    headline: "A centered hero for a question or a demo moment",
    subtitle: "Centered content blocks over the particle background.",
    content: [{ type: "paragraph", text: "One line under the hero.", centered: true }],
    notes: "content: centered layout.",
  },
  {
    type: "content",
    sectionLabel: "Density",
    sectionTheme: "primary",
    headline: "The longest bullet list a content slide is built to hold before it shrinks",
    content: [{ type: "bullets", items: longBullets }],
    footer: "Six long bullets: the fit guard's limit.",
    notes: "content: max-length bullets.",
  },

  {
    type: "content",
    sectionLabel: "Block: table",
    headline: "Table, full and compact",
    content: [
      {
        type: "table",
        headers: ["Team", "Lead time", "Change failure rate"],
        rows: [
          ["Checkout", "2 days", "4%"],
          ["Search", "5 days", "9%"],
          ["Billing", "11 days", "15%"],
        ],
      },
      {
        type: "table",
        compact: true,
        widths: [2, 1],
        rows: [
          ["Compact rows, no header", "Yes"],
          ["Relative widths", "2 : 1"],
        ],
      },
    ],
    notes: "content blocks: table with headers, compact table with widths.",
  },
  {
    type: "content",
    sectionLabel: "Block: two-column",
    headline: "Two columns: success against error",
    content: [
      {
        type: "two-column",
        variant: "success-error",
        left: { title: "Works", items: ["Plan reviewed first", "Small pull requests"] },
        right: { title: "Fails", items: ["Prompt and hope", "One giant change"] },
      },
      {
        type: "two-column",
        variant: "neutral",
        left: { title: "Text left", text: "A column can hold text instead of items." },
        right: { title: "Text right", text: "Neutral columns carry no judgement." },
      },
      {
        type: "two-column",
        variant: "error-success",
        left: { title: "Before", items: ["Manual release"] },
        right: { title: "After", items: ["Release on merge"] },
      },
    ],
    notes: "content blocks: two-column success-error, neutral and error-success.",
  },
  {
    type: "content",
    sectionLabel: "Block: two-column",
    headline: "Two columns: the other variants",
    content: [
      {
        type: "two-column",
        variant: "error-neutral",
        left: { title: "Risk", items: ["Untested migrations"] },
        right: { title: "Context", items: ["Two teams share the schema"] },
      },
      {
        type: "two-column",
        variant: "error",
        left: { title: "Smell", items: ["Tests skipped"] },
        right: { title: "Smell", items: ["Review rubber-stamped"] },
      },
      {
        type: "two-column",
        variant: "success",
        left: { title: "Habit", items: ["Plan first"] },
        right: { title: "Habit", items: ["Read the diff"] },
      },
    ],
    notes: "content blocks: two-column error-neutral, error, success.",
  },
  {
    type: "content",
    sectionLabel: "Block: code",
    headline: "Code, and code beside text",
    content: [
      {
        type: "code",
        language: "typescript",
        code: "export function leadTime(pr: PullRequest): number {\n  return pr.mergedAt - pr.openedAt;\n}",
      },
      {
        type: "code-and-text",
        language: "bash",
        code: "bun run check\nbun run test",
        sections: [
          { title: "Check", text: "Lint and types." },
          { title: "Test", text: "Every slide renders." },
        ],
      },
    ],
    notes: "content blocks: code, code-and-text.",
  },
  {
    type: "content",
    sectionLabel: "Block: terminal and hooks",
    headline: "Terminal session and hook list",
    content: [
      {
        type: "terminal",
        commands: [
          { prefix: "$", text: "harness plan --ticket LF-142" },
          { prefix: ">", text: "Plan written to plans/LF-142.md" },
        ],
      },
      {
        type: "hooks",
        items: [
          { name: "pre-commit", description: "Formats and lints the staged files" },
          { name: "pre-push", description: "Runs the full test suite" },
        ],
      },
    ],
    notes: "content blocks: terminal, hooks.",
  },
  {
    type: "content",
    sectionLabel: "Block: annotated code",
    headline: "Annotated code marks the lines that matter",
    content: [
      {
        type: "annotated-code",
        language: "typescript",
        code: "const plan = await agent.plan(ticket);\nawait review(plan);\nconst diff = await agent.build(plan);\nawait review(diff);",
        notes: [
          { line: 2, text: "A person reads the plan first" },
          { line: 4, text: "and the diff last" },
        ],
      },
    ],
    notes: "content blocks: annotated-code.",
  },
  {
    type: "content",
    sectionLabel: "Block: pipeline",
    headline: "Pipeline with loops and a container",
    content: [
      {
        type: "pipeline",
        stages: [
          { title: "Refine", state: "active" },
          { title: "Implement", state: "new" },
          { title: "Review" },
          { title: "QA" },
        ],
        showLoops: true,
        showArrows: true,
        containerLabel: "Delivery harness",
        containerFooter: "One loop per ticket",
        containerSideNotes: ["Plans versioned", "Checks shared"],
      },
    ],
    notes:
      "content blocks: pipeline with states, loops, arrows, container label, footer, side notes.",
  },
  {
    type: "content",
    sectionLabel: "Block: four-column",
    headline: "Four columns",
    content: [
      {
        type: "four-column",
        columns: [
          { title: "Plan", subtitle: "Day 1", items: ["Ticket", "Plan"] },
          { title: "Build", subtitle: "Day 2", items: ["Code", "Tests"] },
          { title: "Review", subtitle: "Day 3", items: ["Diff", "Notes"] },
          { title: "Ship", subtitle: "Day 4", items: ["Merge", "Deploy"] },
        ],
      },
    ],
    notes: "content blocks: four-column.",
  },
  {
    type: "content",
    sectionLabel: "Block: labeled grid",
    headline: "Labeled grid with one highlighted cell",
    content: [
      {
        type: "labeled-grid",
        items: [
          { title: "Tools", subtitle: "What the agent uses" },
          { title: "Knowledge", subtitle: "What the agent reads", highlighted: true },
          { title: "Guardrails", subtitle: "What is enforced" },
        ],
      },
    ],
    notes: "content blocks: labeled-grid, three columns, one highlighted.",
  },
  {
    type: "content",
    sectionLabel: "Block: image",
    headline: "A screenshot at its full size",
    content: [{ type: "image", src: `${IMG}/screen-team-board.png`, alt: "Fictional team board" }],
    notes: "content blocks: image.",
  },
  {
    type: "content",
    sectionLabel: "Block: video",
    headline: "A screen recording, ready to play",
    content: [
      {
        type: "video",
        src: `${IMG}/agent-session.mp4`,
        poster: `${IMG}/agent-session-poster.png`,
        alt: "Fictional agent session",
        caption: "The agent session on a fictional repository, 10 seconds",
      },
    ],
    notes: "content blocks: video with poster and caption.",
  },
  {
    type: "content",
    sectionLabel: "Block: linked image",
    headline: "A screenshot with its link spelled out",
    content: [
      {
        type: "linked-image",
        src: `${IMG}/screen-pull-request.png`,
        alt: "Fictional pull request",
        href: "https://forge.example.com/acme/payments/pull/128",
      },
    ],
    notes: "content blocks: linked-image.",
  },
  {
    type: "content",
    sectionLabel: "Block: image and grid",
    headline: "Image beside a grid",
    content: [
      {
        type: "image-and-grid",
        image: { src: `${IMG}/screen-code.png`, alt: "Fictional code view" },
        gridTitle: "What the screen shows",
        items: [
          { title: "Plan", subtitle: "Top line" },
          { title: "Diff", subtitle: "Middle" },
          { title: "Tests", subtitle: "Green line" },
        ],
      },
    ],
    notes: "content blocks: image-and-grid.",
  },
  {
    type: "content",
    sectionLabel: "Block: image and grid, sketch",
    headline: "LLMs complete text",
    content: [
      {
        type: "image-and-grid",
        // A copy of the brand repository's slide sketch example,
        // applications/slide-visuals/sketch-example-next-token.png at brand v0.20.0: the package
        // does not export it, and a consumer serves the specimen images from its own public/.
        image: {
          src: `${IMG}/sketch-next-token.png`,
          alt: "Marker sketch: next token",
          sketch: true,
        },
        items: [
          { title: "The line so far", subtitle: "The model reads everything before the gap." },
          { title: "Candidate words", subtitle: "Each next word gets a probability." },
          { title: "Next token", subtitle: "The likeliest word is written, then it repeats." },
        ],
      },
    ],
    notes: "content blocks: image-and-grid with a painted sketch (sketch: true), no frame.",
  },
  {
    type: "content",
    sectionLabel: "Block: positions",
    headline: "Two positions and a resolution",
    content: [
      {
        type: "positions",
        left: {
          name: "Mara Lindqvist",
          stance: "Shared",
          quote: "Every team should use the same harness.",
        },
        right: {
          name: "Jonas Okafor",
          stance: "Owned",
          quote: "Every team knows its own work best.",
        },
        middle: "Both",
        resolution: "One harness, team rules on top.",
      },
    ],
    notes: "content blocks: positions with middle and resolution. Fictional people.",
  },
  {
    type: "content",
    sectionLabel: "Visual: flow",
    headline: "Flow with a loop back",
    content: [
      {
        type: "flow",
        steps: [
          { title: "Red", text: "Failing test", tone: "red" },
          { title: "Green", text: "Make it pass", tone: "green" },
          { title: "Refactor", text: "Clean up" },
        ],
        highlight: 2,
        loop: "next test",
      },
    ],
    notes: "visual blocks: flow with tones, highlight, loop.",
  },
  {
    type: "content",
    sectionLabel: "Visual: layers",
    headline: "Layers, numbered",
    content: [
      {
        type: "layers",
        ordered: true,
        highlight: 1,
        layers: [
          { title: "Conventions", text: "Team page" },
          { title: "Harness", text: "Plans and checks" },
          { title: "Platform", text: "Pipelines" },
        ],
      },
    ],
    notes: "visual blocks: layers, ordered, highlight.",
  },
  {
    type: "content",
    sectionLabel: "Visual: timeline",
    headline: "Timeline with a now marker and row labels",
    content: [
      {
        type: "timeline",
        now: 1,
        highlight: 1,
        labels: { when: "When", title: "What", text: "Output" },
        events: [
          { when: "Q1", title: "Assess", text: "Baseline" },
          { when: "Q2", title: "Train", text: "Cohort 1" },
          { when: "Q3", title: "Mentor", text: "Habits" },
          { when: "Q4", title: "Hand over", text: "Own team" },
        ],
      },
    ],
    notes: "visual blocks: timeline with now, highlight and labels.",
  },
  {
    type: "content",
    sectionLabel: "Visual: transform",
    headline: "Transform: before into after",
    content: [
      {
        type: "transform",
        before: { label: "Today", items: ["Ticket", "Code", "Hope"] },
        after: { label: "Tomorrow", items: ["Ticket", "Plan", "Code", "Review"] },
      },
    ],
    notes: "visual blocks: transform.",
  },
  {
    type: "content",
    sectionLabel: "Visual: bars",
    headline: "Bars with a track",
    content: [
      {
        type: "bars",
        max: 100,
        bars: [
          { label: "Checkout", value: 82, display: "82%", highlight: true },
          { label: "Search", value: 61, display: "61%" },
          { label: "Billing", value: 40, display: "40%" },
        ],
        source: "Fictional survey, 2026",
      },
    ],
    notes: "visual blocks: bars with max and highlight.",
  },
  {
    type: "content",
    sectionLabel: "Visual: numbers",
    headline: "Numbers with a source",
    content: [
      {
        type: "numbers",
        items: [
          { value: "3x", label: "faster review" },
          { value: "-40%", label: "rework" },
        ],
        source: "Fictional figures",
      },
    ],
    notes: "visual blocks: numbers with a source.",
  },
  {
    type: "content",
    sectionLabel: "Visual: annotated image",
    headline: "Annotated screenshot",
    content: [
      {
        type: "annotated",
        src: `${IMG}/screen-code.png`,
        alt: "Fictional code view",
        size: [1600, 1000],
        crop: { top: 0.08, bottom: 0.52 },
        notes: [
          { y: 0.13, text: "The plan's title" },
          { y: 0.34, h: 0.04, text: "The changed call" },
        ],
      },
    ],
    notes: "visual blocks: annotated image with crop.",
  },
  {
    type: "content",
    sectionLabel: "Visual: cards",
    headline: "Cards with icons, and numbered cards",
    content: [
      {
        type: "cards",
        items: [
          { title: "Plan", text: "Written before code", icon: "compass" },
          { title: "Check", text: "Same checks everywhere", icon: "shield" },
          { title: "Learn", text: "Conventions grow", icon: "book" },
        ],
      },
      {
        type: "cards",
        numbered: true,
        items: [{ text: "What would you stop doing?" }, { text: "What would you start?" }],
      },
    ],
    notes: "visual blocks: cards with icons, numbered cards.",
  },

  {
    type: "regular",
    headline: "Regular slide with a profile sidebar",
    profile: {
      name: "Mara Lindqvist",
      title: "Platform lead, Lumen Freight",
      imageSrc: `${IMG}/portrait-a.png`,
    },
    sections: [
      { title: "What she built", items: ["One harness", "Shared checks"] },
      {
        title: "Why",
        text: "Teams kept solving the same problem.",
        link: { url: "https://example.com", label: "Read more" },
      },
    ],
    notes: "regular: default layout with profile and image.",
  },
  {
    type: "regular",
    headline: "Regular slide, cards layout",
    layout: "cards",
    activeSection: 1,
    sections: [
      { title: "Foundations", icon: "layers", items: ["Tools and environment"] },
      { title: "Delivery", icon: "workflow", items: ["Plan, build, review"] },
      { title: "Learning", icon: "book", items: ["Conventions and metrics"] },
    ],
    notes: "regular: cards layout, second section active.",
  },
  {
    type: "regular",
    headline: "Regular slide, centered, no profile",
    align: "center",
    sections: [{ title: "One section", items: ["Centered heading", "No sidebar"] }],
    notes: "regular: centered alignment, no profile.",
  },

  {
    type: "statement",
    lines: ["Plans before code"],
    highlighted: "Plans",
    crossedOut: "Code first, plan later",
    subtitle: "Review reads the plan before anyone writes a line.",
    points: ["The plan is reviewed", "Code follows the plan", "Review reads both"],
    closing: "That is the whole method.",
    notes: "statement: highlight, crossed-out, points, plain closing.",
  },
  {
    type: "statement",
    background: "bg-section-secondary",
    lines: ["We stopped asking how fast the agent types", "and started asking what it reads."],
    closing: "The best harness is the one nobody notices.",
    closingStyle: "quote",
    imageSrc: `${IMG}/portrait-b.png`,
    imageAlt: "Fictional speaker",
    attribution: "Jonas Okafor, Lumen Freight (fictional)",
    notes: "statement: secondary background, image, quote closing, attribution.",
  },

  {
    type: "evolution",
    headline: "From autocomplete to delivery harness",
    stages: [
      {
        multiplier: "1x",
        title: "Autocomplete",
        subtitle: "Line by line",
        description: "Faster typing.",
        isDimmed: true,
      },
      { multiplier: "3x", title: "Chat", subtitle: "Task by task", description: "Copy and paste." },
      {
        multiplier: "10x",
        title: "Harness",
        subtitle: "Ticket by ticket",
        description: "Plans, checks, review.",
        isHighlighted: true,
        badge: "You are here",
      },
    ],
    footer: "Each stage changes what a person reviews.",
    notes: "evolution: three stages, dimmed, highlighted with badge, footer.",
  },
  {
    type: "evolution",
    background: "bg-section-accent",
    headline: "Six stages, static",
    static: true,
    stages: [
      { multiplier: "1x", title: "Manual", subtitle: "", description: "Hand work." },
      { multiplier: "2x", title: "Scripts", subtitle: "", description: "Some automation." },
      { multiplier: "3x", title: "CI", subtitle: "", description: "Checks on push." },
      { multiplier: "5x", title: "CD", subtitle: "", description: "Release on merge." },
      { multiplier: "8x", title: "Agents", subtitle: "", description: "Code from plans." },
      { multiplier: "12x", title: "Harness", subtitle: "", description: "Plans reviewed." },
    ],
    notes: "evolution: six stages (dense), static, accent background.",
  },
  {
    type: "evolution",
    headline: "Stage names above the titles",
    static: true,
    stages: [
      {
        multiplier: "Stage 1",
        title: "Pilot",
        subtitle: "One team",
        description: "Learn the loop.",
      },
      {
        multiplier: "Stage 2",
        title: "Rollout",
        subtitle: "Every team",
        description: "Same checks everywhere.",
        isHighlighted: true,
      },
      { multiplier: "Stage 3", title: "Continuous", subtitle: "", description: "Teams own it." },
    ],
    notes:
      "evolution: labels longer than four characters sit above the titles, numbers in the tiles.",
  },

  {
    type: "grid",
    variant: "pillars",
    sectionLabel: "Grid",
    sectionTheme: "primary",
    headline: "Four pillars",
    columns: 4,
    cards: [
      {
        title: "Tools",
        description: "What the agent uses.",
        icon: "wrench",
        accentColor: "primary",
      },
      { title: "Knowledge", description: "What it reads.", icon: "book", accentColor: "secondary" },
      { title: "Checks", description: "What is enforced.", icon: "shield", accentColor: "accent" },
      {
        title: "Metrics",
        description: "What we learn.",
        icon: "bar-chart",
        accentColor: "success",
      },
    ],
    notes: "grid: pillars, four columns, four accents.",
  },
  {
    type: "grid",
    variant: "pillars",
    headline: "Pillars continued, all active",
    columns: 2,
    allActive: true,
    numberFrom: 5,
    cards: [
      { title: "Ownership", description: "One team per service.", highlight: true },
      { title: "Cadence", description: "A weekly review.", accentColor: "neutral" },
    ],
    notes: "grid: pillars, two columns, allActive, numberFrom 5, highlight.",
  },
  {
    type: "grid",
    variant: "stats",
    background: "bg-section-primary",
    headline: "Numbers after six months",
    columns: 3,
    cards: [
      { title: "Lead time", value: "2d", label: "from 9d", description: "Median, all teams." },
      { title: "Rework", value: "-40%", label: "per ticket", description: "Fictional." },
      { title: "Teams", value: "38", label: "on the harness", description: "Of 40." },
    ],
    notes: "grid: stats, three columns, primary background.",
  },
  {
    type: "grid",
    variant: "quotes",
    headline: "What participants said",
    columns: 3,
    cards: [
      { title: "I review plans now, not just diffs.", author: "Engineer, fictional" },
      {
        title: "The checks caught what I missed.",
        author: "Team lead, fictional",
        imageSrc: `${IMG}/portrait-a.png`,
      },
      { title: "Monday metrics changed our backlog.", author: "Product lead, fictional" },
    ],
    notes: "grid: quotes, one with an image.",
  },

  {
    type: "comparison",
    variant: "vs",
    headline: "Prompting against a harness",
    left: {
      label: "Prompting",
      items: ["Ad hoc", "Hard to review", "Knowledge in heads"],
      highlight: "Fast to start",
    },
    right: {
      label: "Harness",
      items: ["Planned", "Reviewed twice", "Knowledge in files"],
      highlight: "Fast to sustain",
    },
    punchline: "Pick the one you can still run next year.",
    revealPunchline: true,
    footnotes: ["Fictional comparison."],
    notes: "comparison: vs, highlights, revealed punchline, footnote.",
  },
  {
    type: "comparison",
    variant: "before-after",
    headline: "Before and after",
    left: { label: "Before", items: ["Release every month", "Hotfix by hand"] },
    right: { label: "After", items: ["Release on merge", "Rollback without a meeting"] },
    punchline: "Same team, other habits.",
    notes: "comparison: before-after.",
  },
  {
    type: "comparison",
    variant: "split",
    left: { label: "Platform", items: longBullets.slice(0, 4) },
    right: { label: "Teams", items: longBullets.slice(2, 6) },
    notes: "comparison: split, no headline, long items.",
  },

  {
    type: "guidance",
    headline: "Writing a ticket the agent can work from",
    intro: "One bad and one good version.",
    points: ["Name the outcome", "Name the check"],
    examples: [
      {
        title: "Ticket",
        bad: "Fix the search.",
        good: "Search returns results for umlauts.\nCheck: test/search.test.ts passes.",
      },
    ],
    notes: "guidance: intro, points, one plain-text example.",
  },
  {
    type: "guidance",
    examples: [
      {
        title: "Code",
        language: "typescript",
        bad: "function f(a) { return a * 1.19 }",
        good: "const VAT = 0.19;\nexport const gross = (net: number) => net * (1 + VAT);",
      },
    ],
    notes: "guidance: no headline, code example.",
  },

  {
    type: "media",
    sectionLabel: "Media",
    sectionTheme: "accent",
    headline: "One screenshot",
    sources: [
      { src: `${IMG}/screen-board.png`, alt: "Fictional board", caption: "The team board" },
    ],
    notes: "media: single image with caption.",
  },
  {
    type: "media",
    layout: "grid",
    headline: "Gallery of three",
    sources: [
      { src: `${IMG}/screen-board.png`, alt: "Board" },
      { src: `${IMG}/screen-chart.png`, alt: "Chart" },
      { src: `${IMG}/screen-code.png`, alt: "Code" },
    ],
    notes: "media: grid layout, three images.",
  },
  {
    type: "media",
    layout: "row",
    headline: "Row with tags",
    tags: ["Plan", "Build", "Review"],
    sources: [
      { src: `${IMG}/screen-board.png`, alt: "Plan", height: 280 },
      { src: `${IMG}/screen-code.png`, alt: "Build", height: 320 },
      { src: `${IMG}/screen-chart.png`, alt: "Review", height: 280 },
    ],
    notes: "media: row layout with tags and heights.",
  },
  {
    type: "media",
    sources: [{ src: `${IMG}/demo.mp4`, kind: "video", alt: "Fictional demo" }],
    notes: "media: video, no headline.",
  },

  {
    type: "profiles",
    headline: "Your trainers",
    profiles: [
      {
        name: "Mara Lindqvist",
        title: "Platform lead",
        company: "Lumen Freight",
        imageSrc: `${IMG}/portrait-a.png`,
        bullets: ["Built the harness", "Ten years of platform work"],
      },
      {
        name: "Jonas Okafor",
        title: "Team lead",
        company: "Lumen Freight",
        imageSrc: `${IMG}/portrait-b.png`,
        bullets: ["Runs the weekly review", "Coaches new teams"],
      },
    ],
    footer: "Both fictional.",
    notes: "profiles: two with images and footer.",
  },
  {
    type: "profiles",
    headline: "Profiles without photos",
    profiles: [
      {
        name: "Ada Brenner",
        title: "Engineer",
        company: "Lumen Freight",
        bullets: ["Owns search"],
      },
      {
        name: "Kai Moreau",
        title: "Engineer",
        company: "Lumen Freight",
        bullets: ["Owns billing"],
      },
      {
        name: "Lena Sato",
        title: "QA lead",
        company: "Lumen Freight",
        bullets: ["Owns the checks"],
      },
    ],
    notes: "profiles: three, no images.",
  },

  {
    type: "overview",
    foundationsActive: true,
    pipelineActive: false,
    foundations: [
      { title: "Tools", description: "What it uses", state: "active" },
      { title: "Knowledge", description: "What it reads", state: "new" },
      { title: "Checks", description: "What is enforced" },
    ],
    pipeline: [
      { title: "Plan", description: "Before code" },
      { title: "Build", description: "From the plan" },
      { title: "Review", description: "Plan and diff" },
    ],
    notes: "overview: three by three, foundations active, pipeline idle.",
  },
  {
    type: "overview",
    foundationsActive: true,
    pipelineActive: true,
    ideateExternal: true,
    parallelLanes: 3,
    foundations: ["Tools", "Environment", "Tracking", "Knowledge", "Automation", "Guardrails"].map(
      (title) => ({ title, description: "Foundation", state: "active" as const }),
    ),
    pipeline: ["Ideate", "Refine", "Implement", "Review", "QA", "Codify"].map((title) => ({
      title,
      description: "Stage",
      state: "active" as const,
    })),
    notes: "overview: six by six, external ideate, three parallel lanes.",
  },

  {
    type: "process",
    headline: "The weekly loop",
    highlightPhase: "Review",
    nodes: [
      { title: "Plan", description: "Pick the tickets", icon: "compass" },
      { title: "Build", description: "Agent works from plans", icon: "code" },
      { title: "Review", description: "Read plan and diff", icon: "eye" },
    ],
    footer: "Three nodes, one highlighted.",
    notes: "process: three nodes, highlight, footer.",
  },
  {
    type: "process",
    background: "bg-section-success",
    headline: "Six-step loop",
    nodes: ["Ideate", "Refine", "Implement", "Review", "QA", "Codify"].map((title) => ({
      title,
      description: `What happens in ${title.toLowerCase()}`,
    })),
    notes: "process: six nodes (dense), success background.",
  },

  {
    type: "phased-pills",
    title: "Pipeline stages",
    phases: [
      {
        label: "Plan",
        theme: "accent",
        items: [
          { number: 1, title: "Ideate", state: "new" },
          { number: 2, title: "Refine", state: "active" },
        ],
      },
      {
        label: "Build",
        theme: "primary",
        items: [
          { number: 3, title: "Implement" },
          { number: 4, title: "Test" },
        ],
      },
      {
        label: "Ship",
        theme: "success",
        items: [
          { number: 5, title: "Review" },
          { number: 6, title: "Deploy" },
        ],
      },
    ],
    notes: "phased-pills: three phases, new and active states.",
  },

  {
    type: "dual-pill-overview",
    preText: "Programme",
    headline: "Two parts side by side",
    subtitle: "Ingredients on the left, deep dive on the right.",
    left: {
      label: "Part one",
      title: "Ingredients",
      accent: "ingredients",
      phases: [
        {
          label: "Mindset",
          theme: "accent",
          items: [
            { number: 1, title: "Long-term thinking" },
            { number: 2, title: "Know the limits" },
          ],
        },
      ],
    },
    right: {
      label: "Part two",
      title: "Tactics",
      accent: "deepdive",
      phases: [
        {
          label: "Operational",
          theme: "deepdive",
          items: [
            { number: 1, title: "Execution plans" },
            { number: 2, title: "Determinism", state: "active" },
          ],
        },
      ],
    },
    notes: "dual-pill-overview: ingredients and deepdive accents.",
  },

  {
    type: "roadmap",
    preText: "Roadmap",
    headline: "Two staged columns",
    subtitle: "What comes first, what comes after.",
    columns: [
      {
        label: "Part one",
        title: "Ingredients",
        subtitle: "Non-negotiables",
        accent: "ingredients",
        items: [
          { title: "Plans first", description: "Reviewed before code" },
          { title: "Shared checks" },
        ],
      },
      {
        label: "Part two",
        title: "Tactics",
        accent: "deepdive",
        items: [
          { title: "Determinism", description: "Same input, same output" },
          { title: "Learning", description: "Conventions grow" },
        ],
      },
    ],
    notes: "roadmap: two columns, with and without descriptions.",
  },

  {
    type: "lanes",
    sectionLabel: "Lanes",
    sectionTheme: "secondary",
    principle: "In parallel",
    headline: "Three tickets at once",
    lanes: [
      { label: "LF-142", stages: ["Plan", "Build", "Review"] },
      { label: "LF-143", stages: ["Plan", "Build"] },
      { label: "LF-144", stages: ["Plan"] },
    ],
    footer: "Each lane is one agent.",
    notes: "lanes: three lanes, kicker, principle, footer.",
  },
  {
    type: "lanes",
    headline: "Lanes under a code snippet",
    codeSnippet: { language: "bash", code: "harness run LF-142 LF-143 --parallel" },
    lanes: [
      { label: "LF-142", stages: ["Plan", "Build", "Review", "QA"] },
      { label: "LF-143", stages: ["Plan", "Build", "Review", "QA"] },
    ],
    notes: "lanes: with code snippet.",
  },

  {
    type: "chart",
    variant: "cycle",
    headline: "Adoption cycle",
    segments: [
      { label: "Pilots", percentage: 15 },
      { label: "Early teams", percentage: 35 },
      { label: "Majority", percentage: 35 },
      { label: "Late teams", percentage: 15 },
    ],
    currentSegmentIndex: 1,
    notes: "chart: cycle, second segment current.",
  },
  {
    type: "chart",
    variant: "graph",
    headline: "Value over time",
    currentMarker: "Today",
    futureNote: "Fictional projection",
    xLabel: "Time",
    yLabel: "Value",
    notes: "chart: graph.",
  },
  {
    type: "chart",
    variant: "trend",
    headline: "Lead time fell, review wait did not",
    data: [
      { name: "Jan", value: 9, value2: 3 },
      { name: "Mar", value: 7, value2: 3 },
      { name: "May", value: 5, value2: 2.5 },
      { name: "Jul", value: 3, value2: 2.5 },
      { name: "Sep", value: 2, value2: 2 },
    ],
    seriesLabel: "Lead time",
    series2Label: "Review wait",
    yLabel: "Days",
    annotation: "By September, review wait is the whole lead time. Fictional figures.",
    notes: "chart: trend with two series.",
  },
  {
    type: "chart",
    variant: "bar",
    headline: "Build holds the most tickets",
    data: [
      { name: "Plan", value: 12 },
      { name: "Build", value: 30 },
      { name: "Review", value: 18 },
      { name: "QA", value: 9 },
    ],
    annotation: "Two in five tickets sit in Build. Fictional figures.",
    notes: "chart: bar.",
  },

  {
    type: "question",
    headline: "Where does your team review today?",
    storageKey: "slide-catalogue-question",
    options: [
      { label: "A", text: "Only the diff" },
      { label: "B", text: "The plan and the diff" },
      { label: "C", text: "Nobody reviews agent work" },
      { label: "D", text: "We do not use agents yet" },
    ],
    notes: "question: four options.",
  },

  {
    type: "transition",
    preText: "Part two",
    headline: "Review that starts from green",
    subtitle: "Why the checks run before a person looks",
    speakerName: "Mara Lindqvist",
    speakerCompany: "Lumen Freight",
    notes: "transition: pre-text, subtitle, speaker.",
  },
  {
    type: "transition",
    background: "bg-section-secondary",
    headline: "Break",
    notes: "transition: headline only, secondary background.",
  },

  {
    type: "deep-dive-divider",
    partLabel: "Part two",
    kicker: "Going deeper",
    headline: "The operational\ntactics",
    subtitle: "Where each tactic sits in the pipeline.",
    notes: "deep-dive-divider: all fields.",
  },

  {
    type: "gantt",
    sectionLabel: "Plan",
    sectionTheme: "primary",
    principle: "A month is a planning unit",
    headline: "The programme at a glance",
    columns: ["M1", "M2", "M3", "M4", "M5", "M6"],
    rows: [
      {
        label: "Assessment",
        sublabel: "Baseline",
        bars: [{ label: "Six areas", start: 1, span: 1, theme: "primary" }],
      },
      {
        label: "Training",
        sublabel: "Per cohort",
        bars: [{ label: "Cohorts", start: 2, span: 2, theme: "secondary" }],
      },
      {
        label: "Mentoring",
        bars: [{ label: "Weekly", start: 3, span: 4, theme: "success", continuous: true }],
      },
    ],
    milestones: [
      { label: "Baseline", column: 1 },
      { label: "Handover", column: 6 },
    ],
    footer: "Fictional plan.",
    notes: "gantt: kicker, principle, sublabels, continuous bar, milestones, footer.",
  },

  {
    type: "team-topology",
    headline: "Four team types",
    subtitle: "Stream-aligned teams deliver, the other three make them faster.",
    streamAligned: [
      { name: "Stream team: Checkout", roles: ["Product lead", "Engineers"] },
      { name: "Stream team: Search", roles: ["Product lead", "Engineers"] },
    ],
    complicatedSubsystem: [{ name: "Routing engine", description: "Route optimisation" }],
    platform: [
      { name: "Platform team", description: "Pipelines and harness", roles: ["Harness engineers"] },
    ],
    enabling: [{ name: "Enabling: Quality", experts: ["Testing", "Review"] }],
    caption: "Fictional organisation.",
    notes: "team-topology: with complicated subsystem and caption.",
  },
  {
    type: "team-topology",
    headline: "Without a subsystem team",
    streamAligned: [{ name: "Stream team: Payments", roles: ["Engineers"] }],
    platform: [{ name: "Platform team" }],
    enabling: [{ name: "Enabling: Data", experts: ["Analytics"] }],
    notes: "team-topology: minimal.",
  },

  {
    type: "wheel",
    headline: "Six areas of autonomy",
    subtitle: "Each area is a decision the team makes itself.",
    center: "Autonomous team",
    segments: [
      { title: "Business model", text: "How it earns" },
      { title: "Service", text: "What, for whom" },
      { title: "Organisation", text: "Who decides" },
      { title: "Controlling", text: "Outcome over hours" },
      { title: "Architecture", text: "Readable systems" },
      { title: "Steering", text: "Goals and approvals" },
    ],
    caption: "Fictional operating model.",
    notes: "wheel: six segments, subtitle, caption.",
  },
  {
    type: "wheel",
    headline: "Four areas the team owns",
    center: "Team",
    segments: [
      { title: "Plan", text: "Before code" },
      { title: "Build", text: "From the plan" },
      { title: "Review", text: "Plan and diff" },
      { title: "Learn", text: "Conventions" },
    ],
    notes: "wheel: four segments.",
  },

  {
    type: "decision",
    headline: "Service or enablement",
    subtitle: "Where a stream team's need goes.",
    need: "The team needs what it cannot do today",
    question: "Can it be offered as a service?",
    yes: {
      label: "Yes",
      title: "Platform team",
      text: "Built once, used by every team",
      team: "platform",
    },
    no: {
      label: "No",
      title: "Enabling team",
      text: "Teaches until the team can do it",
      team: "enabling",
    },
    outcome: "The stream team keeps delivering",
    caption: "Fictional example.",
    notes: "decision: platform and enabling branches.",
  },
  {
    type: "decision",
    headline: "Subsystem or enablement",
    need: "Route optimisation is too deep for one team",
    question: "Does it need specialists full time?",
    yes: {
      label: "Yes",
      title: "Subsystem team",
      text: "Owns the engine",
      team: "complicated-subsystem",
    },
    no: { label: "No", title: "Enabling team", text: "Coaches the stream team", team: "enabling" },
    outcome: "Routes ship weekly",
    notes: "decision: complicated-subsystem branch.",
  },

  {
    type: "closing",
    variant: "contact",
    line1: "Thank you.",
    speakers: [
      {
        name: "Mara Lindqvist",
        contact: "mara@example.com",
        company: "Lumen Freight",
        imageSrc: `${IMG}/portrait-a.png`,
      },
      {
        name: "Jonas Okafor",
        contact: "jonas@example.com",
        company: "Lumen Freight",
        imageSrc: `${IMG}/portrait-b.png`,
      },
    ],
    closingQuote: "The best harness is the one nobody notices.",
    notes: "closing: contact with two speakers and images, quote.",
  },
  {
    type: "closing",
    variant: "contact",
    line1: "Questions?",
    speakers: [{ name: "Mara Lindqvist", company: "Lumen Freight" }],
    notes: "closing: contact, one speaker, no image.",
  },
  {
    type: "closing",
    variant: "discussion",
    headline: "Let's discuss",
    background: "bg-section-primary",
    seedQuestions: [
      "Which check would you add first?",
      "Who reads the plans in your team?",
      "What would you stop doing on Monday?",
    ],
    notes: "closing: discussion with seed questions, primary background.",
  },

  // ─── max-length kickers: a long section label beside a principle or a stage strip ───
  {
    type: "content",
    sectionLabel: "Platform engineering and developer experience",
    sectionTheme: "primary",
    principle: "Every team ships through the same harness, every day",
    headline: "Longest kicker: label and principle",
    content: [{ type: "paragraph", text: "The kicker wraps and pushes the headline down." }],
    notes: "content: max-length section label and principle.",
  },
  {
    type: "content",
    sectionLabel: "Platform engineering and developer experience",
    sectionTheme: "warning",
    stagePrefix: "Stage 2",
    stageMarker: ["Implement", "Review"],
    headline: "Longest kicker: label, stage prefix and strip",
    content: [{ type: "paragraph", text: "Label and strip wrap, and the headline moves down." }],
    notes: "content: max-length section label with stage prefix and strip.",
  },
  {
    type: "grid",
    variant: "pillars",
    sectionLabel: "Platform engineering and developer experience",
    sectionTheme: "secondary",
    headline: "Grid with the longest section label",
    columns: 3,
    cards: [
      { title: "Tools", description: "What the agent uses.", icon: "wrench" },
      { title: "Knowledge", description: "What it reads.", icon: "book" },
      { title: "Checks", description: "What is enforced.", icon: "shield" },
    ],
    notes: "grid: max-length section label.",
  },
  {
    type: "media",
    sectionLabel: "Platform engineering and developer experience",
    sectionTheme: "accent",
    principle: "Every team ships through the same harness, every day",
    headline: "Media with the longest kicker",
    sources: [{ src: `${IMG}/screen-board.png`, alt: "Fictional board" }],
    notes: "media: max-length section label and principle.",
  },
  {
    type: "lanes",
    sectionLabel: "Platform engineering and developer experience",
    sectionTheme: "secondary",
    principle: "Every team ships through the same harness, every day",
    headline: "Lanes with the longest kicker",
    lanes: [
      { label: "LF-142", stages: ["Plan", "Build", "Review"] },
      { label: "LF-143", stages: ["Plan", "Build"] },
    ],
    notes: "lanes: max-length section label and principle.",
  },
  {
    type: "gantt",
    sectionLabel: "Platform engineering and developer experience",
    sectionTheme: "primary",
    principle: "Every team ships through the same harness, every day",
    headline: "Gantt with the longest kicker",
    columns: ["M1", "M2", "M3", "M4"],
    rows: [
      { label: "Training", bars: [{ label: "Cohorts", start: 1, span: 3, theme: "secondary" }] },
    ],
    notes: "gantt: max-length section label and principle.",
  },
];

export const slideCatalogue: Presentation = {
  name: "Slide Catalogue",
  subtitle: "Every slide type and its variants",
  speakers: ["hackers&wizards"],
  slides,
};

/** A proposal: the same slides in the engine's brand dark theme, on the website's night tokens.
 *  On no live deck. */
export const slideCatalogueBrandDark: Presentation = {
  ...slideCatalogue,
  name: "Slide Catalogue, brand dark (proposal)",
  theme: "brand-dark",
};
