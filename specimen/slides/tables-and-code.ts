import type { Slide } from "../../types/slide";

export const structuredContentSlides: Slide[] = [
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
          ["Relative widths", "`widths: [2, 1]`"],
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
    headline: "Pipeline with a container",
    content: [
      {
        type: "pipeline",
        stages: [
          { title: "Refine", state: "active" },
          { title: "Implement", state: "new" },
          { title: "Review" },
          { title: "QA" },
        ],
        containerLabel: "Delivery harness",
        containerFooter: "One loop per ticket",
        containerSideNotes: ["Plans versioned", "Checks shared"],
      },
    ],
    notes:
      "content blocks: pipeline with states, container label, footer, side notes, drawn as flow.",
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
];

export const centredTerminalSlide: Slide = {
  type: "content",
  layout: "centered",
  sectionLabel: "Live demo",
  headline: "One ticket from plan to merge",
  subtitle: "Run it in your own checkout as we go.",
  content: [
    {
      type: "terminal",
      commands: [
        { prefix: "$", text: "harness plan --ticket LF-142" },
        { prefix: "$", text: "harness run plans/LF-142.md" },
        { prefix: ">", text: "Merged after 2 review rounds" },
      ],
    },
  ],
  notes: "content: centered layout holding a block a statement cannot carry.",
};

export const revealedTableSlide: Slide = {
  type: "content",
  sectionLabel: "Block: table",
  headline: "Table, revealed row by row",
  content: [
    {
      type: "table",
      reveal: true,
      headers: ["Team", "Lead time", "Change failure rate"],
      rows: [
        ["Checkout", "2 days", "4%"],
        ["Search", "5 days", "9%"],
        ["Billing", "11 days", "15%"],
      ],
    },
  ],
  notes: "content blocks: table with reveal, first the first column, then one row at a time.",
};
