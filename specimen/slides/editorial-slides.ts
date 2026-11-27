import type { Slide } from "../../types/slide";
import { specimenImages } from "../images";

export const profileAndStatementSlides: Slide[] = [
  {
    type: "regular",
    headline: "Regular slide with a profile sidebar",
    profile: {
      name: "Mara Lindqvist",
      title: "Platform lead, Lumen Freight",
      imageSrc: specimenImages["portrait-a.png"],
      linkedIn: "https://www.linkedin.com/in/example-profile-name",
      github: "https://github.com/example-profile-name",
    },
    sections: [
      { title: "What she built", items: ["One harness", "Shared checks"] },
      {
        title: "Why",
        text: "Teams kept solving the same problem.",
        link: { url: "https://example.com", label: "Read more" },
      },
    ],
    notes: "regular: default layout with profile, image and LinkedIn link.",
  },
  {
    type: "regular",
    headline: "Regular slide, cards layout",
    layout: "cards",
    sections: [
      { title: "Foundations", icon: "layers", items: ["Tools and environment"] },
      { title: "Delivery", icon: "workflow", items: ["Plan, build, review"] },
      { title: "Learning", icon: "book", items: ["Conventions and metrics"] },
    ],
    notes: "regular: cards layout.",
  },
  {
    type: "regular",
    headline: "Regular slide, one section, no profile",
    sections: [{ title: "One section", items: ["Drawn as a content slide", "No sidebar"] }],
    notes: "regular: one section, no profile.",
  },

  {
    type: "statement",
    lines: ["Plans before code"],
    highlighted: "Plans",
    crossedOut: "Code first, plan later",
    subtitle: "Review reads the plan before anyone writes a line.",
    points: ["The plan is reviewed", "Code follows the plan", "Review reads both"],
    closing: "The plan comes first.\nThat is the whole method.",
    notes: "statement: highlight, crossed-out, points, plain closing in two lines.",
  },
  {
    type: "statement",
    ground: "secondary",
    lines: ["We stopped asking how fast the agent types", "and started asking what it reads."],
    closing: "The best harness is the one nobody notices.",
    closingStyle: "quote",
    imageSrc: specimenImages["portrait-b.png"],
    imageAlt: "Fictional speaker",
    attribution: "Jonas Okafor, Lumen Freight (fictional)",
    notes: "statement: secondary background, image, quote closing, attribution.",
  },
  {
    type: "statement",
    kicker: "Live demo",
    lines: ["The agent opened its own pull request"],
    linkedImage: {
      src: specimenImages["screen-pull-request.png"],
      alt: "Fictional pull request",
      href: "https://example.com/pull/42",
    },
    notes: "statement: kicker and a linked image.",
  },
];

export const gridSlides: Slide[] = [
  {
    type: "grid",
    variant: "pillars",
    sectionLabel: "Grid",
    headline: "Four pillars",
    columns: 4,
    cards: [
      {
        title: "Tools",
        description: "What the agent uses.",
        icon: "wrench",
      },
      { title: "Knowledge", description: "What it reads.", icon: "book" },
      { title: "Checks", description: "What is enforced.", icon: "shield" },
      {
        title: "Metrics",
        description: "What we learn.",
        icon: "bar-chart",
      },
    ],
    notes: "grid: pillars, four columns.",
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
      { title: "Cadence", description: "A weekly review." },
    ],
    notes: "grid: pillars, two columns, allActive, numberFrom 5, highlight.",
  },
  {
    type: "grid",
    variant: "stats",
    ground: "primary",
    headline: "Numbers after six months",
    cards: [
      { title: "Lead time", value: "2d", label: "from 9d", description: "Median, all teams." },
      { title: "Rework", value: "-40%", label: "per ticket", description: "Fictional." },
      { title: "Teams", value: "38", label: "on the harness", description: "Of 40." },
    ],
    notes: "grid: stats, primary background.",
  },
  {
    type: "grid",
    variant: "quotes",
    sectionLabel: "Voices",
    headline: "What participants said",
    columns: 3,
    cards: [
      { title: "I review plans now, not just diffs.", author: "Engineer, fictional" },
      { title: "The checks caught what I missed.", author: "Team lead, fictional" },
      { title: "Monday metrics changed our backlog.", author: "Product lead, fictional" },
    ],
    notes: "grid: quotes, with a kicker.",
  },
  {
    type: "grid",
    variant: "quotes",
    headline: "Two who changed how they review",
    columns: 2,
    cards: [
      {
        title: "I read the plan before the diff.",
        author: "Mara Lindqvist, fictional",
        imageSrc: specimenImages["portrait-a.png"],
      },
      {
        title: "The agent's first draft no longer surprises me.",
        author: "Jonas Okafor, fictional",
        imageSrc: specimenImages["portrait-b.png"],
      },
    ],
    notes: "grid: quotes, every author with a portrait.",
  },
];

export const profileSlides: Slide[] = [
  {
    type: "profiles",
    sectionLabel: "Who runs the day",
    headline: "Your trainers",
    profiles: [
      {
        name: "Mara Lindqvist",
        title: "Platform lead",
        company: "Lumen Freight",
        imageSrc: specimenImages["portrait-a.png"],
        bullets: ["Built the harness", "Ten years of platform work"],
        linkedIn: "https://www.linkedin.com/in/example",
        github: "https://github.com/example",
      },
      {
        name: "Jonas Okafor",
        title: "Team lead",
        company: "Lumen Freight",
        imageSrc: specimenImages["portrait-b.png"],
        bullets: ["Runs the weekly review", "Coaches new teams"],
      },
    ],
    footer: "Both fictional.",
    notes: "profiles: two with images and footer, the first with a LinkedIn link.",
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
        company: "Harbourline&Quayworks",
        bullets: ["Owns the checks"],
      },
    ],
    notes: "profiles: three, no images, the last company one long word.",
  },
];

export const releaseQuoteSlide: Slide = {
  type: "content",
  sectionLabel: "Block: quote",
  headline: "Releases stopped being events",
  content: [
    {
      type: "paragraph",
      text: "Once every change reached production on the day it was merged, nobody planned a release any more.",
    },
    {
      type: "quote",
      text: "We stopped asking for a release date. The question became which customer saw the change first.",
      source: "Mara Lindqvist, platform lead, [field notes](https://example.com/field-notes)",
    },
  ],
  notes: "content blocks: quote with its source, under a paragraph. Fictional.",
};

export const quotationAndTitleSlides: Slide[] = [
  {
    type: "statement",
    lines: ["The build time set the pace", "of the whole company"],
    closing:
      "Planning, review and the business side all followed it. The build time is gone; the pace it set is still here.",
    closingStyle: "quote",
    subtitle: "Speed was never the problem.",
    imageSrc: specimenImages["portrait-a.png"],
    imageAlt: "Fictional speaker",
    attribution: "Mara Lindqvist, Lumen Freight (fictional)",
    footer: "Delivery Days 2026, keynote (fictional)",
    notes:
      "statement: a quotation running from its lines into a quoted closing, a portrait, attribution, the presenter's subtitle after it and a footer.",
  },
  {
    type: "statement",
    lines: ["Does the diagnosis hold for you?"],
    subtitle:
      "What works for you? What does not?\nWhere did you fall flat?\n\nOn to the speakers' corner,\nlater on the discussion board",
    qr: { src: specimenImages["qr-tight.png"], href: "https://example.com/harness" },
    footer: "The discussion goes on in the hallway and on the board",
    notes: "statement: a QR code without a margin of its own, and a footer.",
  },
  {
    type: "statement",
    lines: ["The build set the pace", "and nobody had chosen it"],
    attribution: "Mara Lindqvist, Lumen Freight (fictional)",
    subtitle: "Said at the first review after the migration.",
    notes: "statement: a quotation without a portrait, behind brand's quote rule.",
  },
  {
    type: "title",
    lang: "de",
    kicker: "Erfahrungsbericht",
    title: "Vierhundert Menschen, ein Lieferweg, zwölf Monate",
    speakers: ["Mara Lindqvist", "Jonas Okafor"],
    event: "Delivery Days 2026 · 14. Mai · Rotterdam",
    qr: { src: specimenImages["qr-example.png"], href: "https://example.com/harness" },
    notes: "title: a German talk's opening, the speakers joined in German.",
  },
];
