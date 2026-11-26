import type { Slide } from "../../types/slide";
import { specimenImages } from "../images";
import { longBullets } from "./bullets";

export const contentLayoutSlides: Slide[] = [
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
        items: [
          "Short bullets read faster, a command such as `bun run check` inside the line",
          { text: "Nested items", children: ["One level"] },
        ],
      },
    ],
    footer: "Footer line: the take-away the speaker repeats.",
    notes:
      "content: primary theme, principle, subtitle, paragraph, nested bullets with inline code, footer.",
  },
  {
    type: "content",
    sectionLabel: "Badge",
    headline: "Numbered steps and a badge",
    badge: "New",
    content: [
      {
        type: "bullets",
        ordered: true,
        items: ["Write the plan", "Review the plan", "Let the agent build", "Review the result"],
      },
    ],
    notes: "content: badge, ordered bullets.",
  },
  {
    type: "content",
    sectionLabel: "Stage strip",
    stageMarker: ["Implement", "Review"],
    headline: "Stage strip marks where in the pipeline we are",
    content: [{ type: "callout", text: "Two stages are active on this slide.", variant: "info" }],
    notes: "content: stage strip with two active stages, info callout.",
  },
  {
    type: "content",
    sectionLabel: "Stage prefix",
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
    notes: "content: stage prefix, warning, success and full-width callouts.",
  },
  {
    type: "content",
    sectionLabel: "Success theme",
    sectionTheme: "success",
    principle: "Green when shipped",
    headline: "Success theme",
    content: [
      {
        type: "paragraph",
        text: "The kicker stays teal; the success theme's green marks the principle's pill.",
      },
    ],
    notes: "content: success theme, which colours the principle's pill, sparse.",
  },
  {
    type: "content",
    sectionLabel: "Deep-dive theme",
    sectionTheme: "deepdive",
    headline: "Deep-dive theme",
    content: [
      {
        type: "paragraph",
        text: "A deep-dive part runs on night, and inline code such as `git log --oneline` reads on it.",
      },
    ],
    notes: "content: deepdive theme, sparse, inline code on night.",
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
];

export const kickerLayoutSlides: Slide[] = [
  {
    type: "content",
    sectionLabel: "Platform engineering and developer experience",
    principle: "Every team ships through the same harness, every day",
    headline: "Longest kicker: label and principle",
    content: [{ type: "paragraph", text: "The kicker wraps and pushes the headline down." }],
    notes: "content: max-length section label and principle.",
  },
  {
    type: "content",
    sectionLabel: "Platform engineering and developer experience",
    stagePrefix: "Stage 2",
    stageMarker: ["Implement", "Review"],
    headline: "Longest kicker: label, stage prefix and strip",
    content: [{ type: "paragraph", text: "Label and strip wrap, and the headline moves down." }],
    notes: "content: max-length section label with stage prefix and strip.",
  },
  {
    type: "content",
    headline: "Two lists, one block",
    content: [
      {
        type: "two-column",
        left: { title: "Chat", items: ["Answers a question", "Forgets the session"] },
        right: { title: "Agent", items: ["Edits the files", "Runs the checks"] },
      },
    ],
    footer: "Pick by what the work needs.",
    notes:
      "content, replaced: one neutral two-column of two lists, drawn as the comparison's split.",
  },
  {
    type: "grid",
    variant: "pillars",
    sectionLabel: "Platform engineering and developer experience",
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
    principle: "Every team ships through the same harness, every day",
    headline: "Media with the longest kicker",
    sources: [{ src: specimenImages["screen-board.png"], alt: "Fictional board" }],
    notes: "media: max-length section label and principle.",
  },
  {
    type: "lanes",
    sectionLabel: "Platform engineering and developer experience",
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
    principle: "Every team ships through the same harness, every day",
    headline: "Gantt with the longest kicker",
    columns: ["M1", "M2", "M3", "M4"],
    rows: [{ label: "Training", bars: [{ label: "Cohorts", start: 1, span: 3 }] }],
    notes: "gantt: max-length section label and principle.",
  },
];

export const proseLayoutSlides: Slide[] = [
  {
    type: "content",
    sectionTheme: "warning",
    headline: "Why the review queue stalls",
    content: [
      {
        type: "paragraph",
        text: "Every change waited for the same two reviewers, because only they knew which parts of the system a change could break.",
      },
      {
        type: "paragraph",
        text: "Once the agent wrote the changes, the queue grew faster than the two could read. Nobody decided this; the old pace had simply hidden it.",
      },
      {
        type: "paragraph",
        text: "The fix was not a faster review but **a smaller one**: checks that read the plan first.",
      },
    ],
    footer: "Lumen Freight, internal retrospective (fictional)",
    notes: "content: prose only, three paragraphs and a footer on the warning theme's rule.",
  },
  {
    type: "content",
    headline: "Three things you take home today, and one thing we ask of you in return",
    content: [
      {
        type: "cards",
        items: [
          {
            icon: "search",
            text: "A diagnosis you can test against your own organisation: where you stand and how you read it.",
          },
          {
            icon: "workflow",
            text: "One worked example of a delivery loop, from the first idea to the measured result.",
          },
          { icon: "calendar", text: "Changes you can make yourself on Monday." },
        ],
      },
      {
        type: "callout",
        text: "In return we ask for your practice: the last twenty minutes are yours.",
      },
    ],
    notes: "content: a two-line headline, a row of text cards and a callout under them.",
  },
];
