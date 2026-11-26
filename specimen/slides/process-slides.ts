import type { Slide } from "../../types/slide";

export const stepSlides: Slide[] = [
  {
    type: "process",
    sectionLabel: "Stop 2: tooling",
    headline: "From autocomplete to delivery harness",
    loop: false,
    highlightPhase: "Harness",
    nodes: [
      {
        label: "1x",
        title: "Autocomplete",
        subtitle: "Line by line",
        description: "Faster typing.",
        dimmed: true,
      },
      { label: "3x", title: "Chat", subtitle: "Task by task", description: "Copy and paste." },
      {
        label: "10x",
        title: "Harness",
        subtitle: "Ticket by ticket",
        description: "Plans, checks, review.",
        badge: "You are here",
      },
    ],
    footer: "Each stage changes what a person reviews.",
    notes:
      "process, loop false: stages that run once, a label in each tile, dimmed, highlighted with badge, footer. Replaces the evolution type.",
  },
  {
    type: "process",
    ground: "accent",
    headline: "Six stages, static",
    loop: false,
    static: true,
    nodes: [
      { label: "1x", title: "Manual", description: "Hand work." },
      { label: "2x", title: "Scripts", description: "Some automation." },
      { label: "3x", title: "CI", description: "Checks on push." },
      { label: "5x", title: "CD", description: "Release on merge." },
      { label: "8x", title: "Agents", description: "Code from plans." },
      { label: "12x", title: "Harness", description: "Plans reviewed." },
    ],
    notes: "process, loop false: six stages (dense), static, accent background.",
  },
  {
    type: "process",
    headline: "Stage names above the titles",
    loop: false,
    static: true,
    highlightPhase: "Rollout",
    nodes: [
      { label: "Stage 1", title: "Pilot", subtitle: "One team", description: "Learn the loop." },
      {
        label: "Stage 2",
        title: "Rollout",
        subtitle: "Every team",
        description: "Same checks everywhere.",
      },
      { label: "Stage 3", title: "Continuous", description: "Teams own it." },
    ],
    notes:
      "process, loop false: labels longer than four characters sit above the titles, the tiles stay empty where a label carries a number.",
  },
];

export const workflowSlides: Slide[] = [
  {
    type: "overview",
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
    notes: "overview: three by three, one stage new.",
  },
  {
    type: "overview",
    foundations: ["Tools", "Environment", "Tracking", "Knowledge", "Automation", "Guardrails"].map(
      (title) => ({ title, description: "Foundation", state: "active" as const }),
    ),
    pipeline: ["Ideate", "Refine", "Implement", "Review", "QA", "Codify"].map((title) => ({
      title,
      description: "Stage",
      state: "active" as const,
    })),
    notes: "overview: six by six, every stage active.",
  },

  {
    type: "process",
    sectionLabel: "Stop 3: rhythm",
    headline: "The weekly loop",
    highlightPhase: "Review",
    nodes: [
      { title: "Plan", description: "Pick the tickets", icon: "compass" },
      { title: "Build", description: "Agent works from plans", icon: "code" },
      { title: "Review", description: "Read plan and diff", icon: "eye" },
    ],
    footer: "Review on Friday decides what Monday plans.",
    notes: "process: three nodes, highlight, footer.",
  },
  {
    type: "process",
    ground: "success",
    headline: "Six-step loop",
    nodes: ["Ideate", "Refine", "Implement", "Review", "QA", "Codify"].map((title) => ({
      title,
      description: `What happens in ${title.toLowerCase()}`,
    })),
    notes: "process: six nodes (dense), success background.",
  },
  {
    type: "process",
    headline: "A request through three teams",
    loop: false,
    nodes: [
      { title: "Customer", description: "Raises the request.", numbered: false },
      { title: "Intake", description: "Sizes and plans it." },
      { title: "Build", description: "Ships it behind a flag." },
      { title: "Operate", description: "Turns the flag on." },
      { title: "Customer", description: "Uses the result.", numbered: false },
    ],
    notes:
      "process, loop false: the outside party's tiles stay empty, the three teams number 1 to 3.",
  },

  {
    type: "phased-pills",
    title: "Pipeline stages",
    phases: [
      {
        label: "Plan",
        theme: "primary",
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
        theme: "primary",
        items: [
          { number: 5, title: "Review" },
          { number: 6, title: "Deploy" },
        ],
      },
    ],
    notes: "phased-pills: three phases, new and active states.",
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
          { title: "Shared checks", tone: "accent" },
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
    notes: "roadmap: two columns, with and without descriptions, one row marked in its own tone.",
  },
  {
    type: "roadmap",
    preText: "Programme",
    headline: "Two parts side by side",
    subtitle: "Ingredients on the left, deep dive on the right.",
    columns: [
      {
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
      {
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
    ],
    notes:
      "roadmap with phased columns (replaces dual-pill-overview): groups of numbered rows, ingredients and deepdive accents.",
  },

  {
    type: "lanes",
    sectionLabel: "Lanes",
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
];

export const programmeGantt: Slide = {
  type: "gantt",
  sectionLabel: "Plan",
  principle: "A month is a planning unit",
  headline: "The programme at a glance",
  columns: ["M1", "M2", "M3", "M4", "M5", "M6"],
  rows: [
    {
      label: "Assessment",
      sublabel: "Baseline",
      bars: [{ label: "Six areas", start: 1, span: 1 }],
    },
    {
      label: "Training",
      sublabel: "Per cohort",
      bars: [{ label: "Cohorts", start: 2, span: 2 }],
    },
    {
      label: "Mentoring",
      bars: [{ label: "Weekly", start: 3, span: 4, continuous: true }],
    },
  ],
  milestones: [
    { label: "Baseline", column: 1 },
    { label: "Handover", column: 6 },
  ],
  milestonesLabel: "Milestones",
  footer: "Fictional plan.",
  notes: "gantt: kicker, principle, sublabels, continuous bar, milestones, footer.",
};
