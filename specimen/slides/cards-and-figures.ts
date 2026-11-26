import type { Slide } from "../../types/slide";
import { specimenImages } from "../images";

export const cardAndFigureSlides: Slide[] = [
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
          { value: "up to +70%", label: "fewer handoffs" },
        ],
        source: "Fictional figures",
      },
    ],
    notes: "visual blocks: numbers with a source, one figure with leading words.",
  },
  {
    type: "content",
    sectionLabel: "Visual: annotated image",
    headline: "Annotated screenshot",
    content: [
      {
        type: "annotated",
        src: specimenImages["screen-code.png"],
        alt: "Fictional code view",
        size: [1600, 1000],
        crop: { top: 0.08, bottom: 0.52 },
        notes: [
          { y: 0.134, text: "The plan's title" },
          { y: 0.346, text: "The changed call" },
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
          // One word wider than its card, which hyphenates rather than run out of it.
          {
            title: "Internationalization",
            text: "Every screen in four languages",
            icon: "browser",
          },
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
    type: "content",
    sectionLabel: "Visual: cards, four columns",
    headline: "Four cards, one highlighted, each with a list",
    content: [
      {
        type: "cards",
        columns: 4,
        highlight: 1,
        reveal: true,
        items: [
          { title: "Intake", text: "Tickets", items: ["Template", "Owner"] },
          { title: "Plan", text: "Before code", items: ["Steps", "Checks", "Risks"] },
          { title: "Build", text: "In the loop", items: ["Tests first", "Small commits"] },
          { title: "Ship", text: "Behind a flag", items: ["Review", "Rollout"] },
        ],
      },
    ],
    notes: "visual blocks: cards with columns, highlight, a list per card, revealed one by one.",
  },
  {
    type: "content",
    sectionLabel: "Visual: numbers, six figures",
    headline: "Six figures wrap into three columns",
    content: [
      {
        type: "numbers",
        items: [
          { value: "12", label: "teams", text: "Across three sites" },
          { value: "3x", label: "faster review", text: "Median, first pass" },
          { value: "-40%", label: "rework", text: "Tickets reopened" },
          { value: "up to +70%", label: "fewer handoffs", text: "Per ticket" },
          { value: "98%", label: "green builds", text: "On the main branch" },
          { value: "about 4", label: "weeks to first win", text: "Per team" },
        ],
        source: "Fictional figures",
      },
    ],
    notes: "visual blocks: numbers wrapping after four figures, each with a description line.",
  },
  {
    type: "content",
    sectionLabel: "Visual: numbers, one figure",
    headline: "One figure carries the slide",
    content: [
      {
        type: "numbers",
        items: [
          {
            value: "87,3 %",
            label: "of teams review every plan",
            text: "A decimal comma and a spaced unit, as a German deck writes them",
          },
        ],
        source: "Fictional figures",
      },
    ],
    notes: "visual blocks: one figure beside its label, with a description line.",
  },
  {
    type: "content",
    sectionLabel: "Visual: flow, framed",
    headline: "A flow in a frame, a badge under a step",
    content: [
      {
        type: "flow",
        highlight: 1,
        steps: [
          { title: "Ticket" },
          { title: "Plan", text: "`.claude/plans/my-ticket.md`", badge: "You are here" },
          { title: "Build" },
          { title: "Review" },
        ],
        frame: {
          label: "Delivery harness",
          notes: ["Plans versioned", "Checks shared"],
          footer: "One loop per ticket",
        },
      },
    ],
    notes:
      "visual blocks: flow with a badge per step, a path that breaks only after a slash or before a dot, and a frame with label, notes and footer.",
  },
  {
    type: "content",
    sectionLabel: "Visual: cards, dense",
    headline: "Seven cards with a sentence each, at the density of the grids they replace",
    content: [
      {
        type: "paragraph",
        text: "Dense cards carry more text: no mark above the title, a smaller title, muted body.",
      },
      {
        type: "cards",
        dense: true,
        columns: 4,
        items: [
          { title: "Shared stance", text: "A written policy gives teams room to try things." },
          { title: "Version control", text: "The safety net once the pace goes up." },
          { title: "Reachable docs", text: "Documents and code the agent can find on its own." },
          { title: "Small batches", text: "Speed turns into value only in small steps." },
          { title: "User focus", text: "Without it, more output helps nobody." },
          { title: "Internal platform", text: "Paved paths let the gains spread." },
          { title: "Clean data", text: "One reachable source amplifies every team." },
        ],
      },
    ],
    notes: "visual blocks: cards with dense, four columns, a sentence per card.",
  },
];

export const largeFigureSlides: Slide[] = [
  {
    type: "content",
    headline: "Seven digits and a spaced unit",
    content: [
      {
        type: "numbers",
        items: [{ value: "1.234.567 €", label: "revenue", text: "In the pilot's first year" }],
        source: "Fictional figures",
      },
    ],
    notes:
      "visual blocks: one figure of seven digits and a spaced unit, sized to leave its label a column.",
  },
  {
    type: "content",
    headline: "One figure and one long word",
    content: [
      {
        type: "numbers",
        items: [{ value: "87,3 %", label: "Mitarbeiterzufriedenheit" }],
        source: "Fictional figures",
      },
    ],
    notes:
      "visual blocks: one figure whose label's one word is too long to stand beside it, so the label stands below.",
  },
  {
    type: "content",
    headline: "Five digits and a unit in each column",
    content: [
      {
        type: "numbers",
        items: [
          { value: "12.345 €", label: "saved per team" },
          { value: "-12.345 h", label: "waiting time" },
          { value: "up to 12.345 %", label: "more deploys" },
        ],
        source: "Fictional figures",
      },
    ],
    notes: "visual blocks: numbers of five digits with a spaced unit, a minus and leading words.",
  },
];
