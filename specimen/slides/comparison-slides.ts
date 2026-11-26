import type { Slide } from "../../types/slide";
import { longBullets } from "./bullets";

export const comparisonAndGuidanceSlides: Slide[] = [
  {
    type: "comparison",
    variant: "vs",
    headline: "Prompting against a harness",
    left: {
      label: "Prompting",
      items: ["- Ad hoc", "- Hard to review", "- Knowledge in heads"],
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
    left: { label: "Before", items: ["Release every month", "Hotfix by hand"], highlight: "Slow" },
    right: {
      label: "After",
      items: ["Release on merge", "Rollback without a meeting"],
      highlight: "Routine",
    },
    punchline: "Same team, other habits.",
    notes: "comparison: before-after, highlights.",
  },
  {
    type: "comparison",
    variant: "split",
    left: { label: "Platform", items: longBullets.slice(0, 4), highlight: "Builds the road" },
    right: { label: "Teams", items: longBullets.slice(2, 6), highlight: "Drive on it" },
    notes: "comparison: split, no headline, long items, highlights.",
  },
  {
    type: "comparison",
    variant: "before-after",
    strike: false,
    headline: "How a change reaches production",
    left: { label: "By hand", items: ["Release on Friday", "Rollback with a meeting"] },
    right: { label: "On merge", items: ["Release on every merge", "Rollback with one command"] },
    notes: "comparison: before-after without strike: the left side turns into the right.",
  },
  {
    type: "comparison",
    variant: "before-after",
    strike: false,
    adds: true,
    sectionLabel: "Going unattended",
    headline: "What stays, what needs building",
    subtitle: "A small step for the process, a large one for the build.",
    left: { label: "Stays", items: ["Stations and contracts", "Repository documents"] },
    right: { label: "Needs building", items: ["Ticket intake", "Isolated environment", "Gates"] },
    punchline: "The build is transport and environment.",
    notes:
      "comparison: before-after without strike and with adds, for a before that stays and a right side added to it, with a section label, a lead and a punchline.",
  },
  {
    type: "comparison",
    variant: "guidance",
    headline: "Writing a check the agent can run",
    intro: "One bad and one good version.",
    points: ["Name the command", "Name what passes"],
    examples: [
      {
        title: "Check",
        bad: "Make sure it works.",
        good: "Run bun run test search.\nPasses when every umlaut query returns a result.",
      },
    ],
    notes: "comparison: guidance variant, intro, points, one example.",
  },
  {
    type: "comparison",
    variant: "positions",
    headline: "Two positions and a resolution",
    left: {
      name: "Mara Lindqvist",
      stance: "Shared",
      quote: "Every team should use the same harness.",
    },
    right: { name: "Jonas Okafor", stance: "Owned", quote: "Every team knows its own work best." },
    middle: "Both",
    resolution: "One harness, team rules on top.",
    notes: "comparison: positions variant with middle and resolution. Fictional people.",
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
        bad: "function f(a) { return a * 1.19 }",
        good: "const VAT = 0.19;\nexport const gross = (net: number) => net * (1 + VAT);",
      },
    ],
    notes: "guidance: no headline, code example.",
  },
];

export const decisionSlides: Slide[] = [
  {
    type: "decision",
    sectionLabel: "Routing a need",
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
    type: "decision",
    sectionLabel: "Stop 4: steering",
    headline: "Where a need goes",
    subtitle: "A stream team routes what it cannot do itself.",
    need: "The team needs something it cannot do itself today",
    question: "Can it be offered to the team as self-service?",
    yes: {
      label: "Yes",
      title: "Platform",
      text: "The team uses it without a ticket or a queue",
      team: "platform",
    },
    no: {
      label: "No",
      title: "Enabling",
      text: "Specialists enable for a while, until the team can do it itself",
      team: "enabling",
    },
    outcome: "The team delivers without waiting",
    caption:
      "Fictional routing rule. A need that fits neither branch goes to the next planning round.",
    notes: "decision: a section label, a hyphenated compound in the question, long branch texts.",
  },
];
