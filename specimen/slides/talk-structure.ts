import type { Slide } from "../../types/slide";
import { specimenImages } from "../images";

export const openingSlides: Slide[] = [
  {
    type: "title",
    title: "Slide Catalog",
    lang: "en",
    subtitle: "Every slide type and its variants, with fictional content",
    notes: "title: with subtitle, setting the deck's language.",
  },
  {
    type: "title",
    title: "How Lumen Freight moved four hundred engineers onto one delivery harness in a year",
    notes: "title: no subtitle, longest title.",
  },
  {
    type: "title",
    kicker: "Field report",
    name: "Lumen Harness",
    title: "Four hundred engineers, one delivery harness, twelve months",
    speakers: ["Mara Lindqvist", "Jonas Okafor"],
    event: "Delivery Days 2026 · 14 May · Rotterdam",
    qr: { src: specimenImages["qr-example.png"], href: "https://example.com/harness" },
    notes: "title: a talk's opening, every field, the QR code to a fictional link.",
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
  {
    type: "agenda",
    headline: "Day one",
    items: [
      { when: "09:00", title: "Where the team stands", text: "Survey results, one page" },
      { when: "10:30", title: "Hands-on: the first execution plan" },
      { when: "12:30", title: "Lunch" },
      { when: "13:30", title: "Review that starts from green" },
      { when: "15:30", title: "Debrief and what changes on Monday" },
    ],
    notes: "agenda as a schedule: times in place of the numbers, a line under a title.",
  },
  {
    type: "agenda",
    headline: "Next steps",
    items: [
      { when: "This week", title: "Name the pilot team", text: "Engineering lead, Lumen Freight" },
      { when: "This week", title: "Share the architecture overview", text: "Platform team" },
      {
        when: "by 15 Nov",
        title: "Assessment interviews with five teams",
        text: "hackers&wizards",
      },
      { when: "by 1 Dec", title: "Pilot starts on one service", text: "Pilot team" },
    ],
    footer: "Needed today: the go for the assessment.",
    notes:
      "agenda as next steps: due dates in place of the numbers, a repeated date printed once, owners under the titles, the decision as footer.",
  },
];

export const activitiesAndDividers: Slide[] = [
  {
    type: "activity",
    kind: "exercise",
    headline: "Write your first execution plan",
    task: "Pick a ticket from your own backlog and let the agent plan it before it writes any code.",
    items: [
      "Open the ticket and paste it into a fresh session",
      "Ask for a plan: files, steps, checks, open questions",
      "Mark every step you would not sign off",
      "Let the agent revise the plan until you would",
    ],
    duration: "25 min",
    mode: "In pairs",
    outcome: "A plan you would hand to a colleague",
    notes: "activity, exercise: numbered steps, the frame card with time, mode and outcome.",
  },
  {
    type: "activity",
    kind: "demo",
    headline: "A bare agent on a failing test",
    task: "No CLAUDE.md, no skills. The task:",
    prompt: "A test fails. Find out why, and tell me before you change anything.",
    items: [
      "Which file does it read first, and why that one?",
      "Does it open .env, which the task does not need?",
      "When does it stop, and who decided that?",
    ],
    duration: "10 min",
    notes: "activity, demo: watch points with markers, only a timebox in the card.",
  },
  {
    type: "activity",
    kind: "debrief",
    headline: "What the agent did with your plan",
    items: [
      "What did it look at first?",
      "Where did it leave your plan, and was it right to?",
      "Which check would have caught that earlier?",
    ],
    mode: "Whole group",
    notes: "activity, debrief: numbered questions, no timebox.",
  },
  {
    type: "question",
    headline: "Where does your team review today?",
    storageKey: "slide-catalog-question",
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
    ground: "secondary",
    headline: "Break",
    notes: "transition: headline only, secondary background.",
  },

  {
    type: "transition",
    night: true,
    preText: "Part two · Going deeper",
    headline: "The operational\ntactics",
    subtitle: "Where each tactic sits in the pipeline.",
    notes: "transition: night, the divider that opens a deep-dive part.",
  },
  {
    type: "deep-dive-divider",
    partLabel: "Part two",
    kicker: "Going deeper",
    headline: "The operational\ntactics",
    subtitle: "Where each tactic sits in the pipeline.",
    notes: "deep-dive-divider, deprecated: all fields, drawn as the night transition above.",
  },
];

export const closingSlides: Slide[] = [
  {
    type: "closing",
    variant: "contact",
    line1: "Thank you.",
    speakers: [
      {
        name: "Mara Lindqvist",
        contact: "mara@example.com",
        company: "hackers&wizards",
        imageSrc: specimenImages["portrait-a.png"],
        linkedIn: "https://www.linkedin.com/in/example",
      },
      {
        name: "Jonas Okafor",
        contact: "jonas@example.com",
        company: "hackers&wizards",
        imageSrc: specimenImages["portrait-b.png"],
      },
    ],
    notes:
      "closing: contact as an h&w deck closes, two speakers with images, the first with a LinkedIn link, brand's claim in the deck's language. Fictional people.",
  },
  {
    type: "closing",
    variant: "contact",
    line1: "Questions?",
    speakers: [{ name: "Mara Lindqvist", contact: "mara@example.com", company: "hackers&wizards" }],
    claim: false,
    closingQuote: "Small changes, shipped every day.",
    notes:
      "closing: contact, one speaker, no image, the lockup, the claim turned off for a closing quote. Fictional person.",
  },
  {
    type: "closing",
    variant: "discussion",
    headline: "Let's discuss",
    ground: "primary",
    seedQuestions: [
      "Which check would you add first?",
      "Who reads the plans in your team?",
      "What would you stop doing on Monday?",
    ],
    notes: "closing: discussion with seed questions, primary background.",
  },
  {
    type: "closing",
    variant: "contact",
    line1: "Thank you.",
    speakers: [
      { name: "Mara Lindqvist", contact: "mara@example.com", company: "hackers&wizards" },
      { name: "Lena Brandt", contact: "lena@example.com", company: "Northwind" },
    ],
    partners: [
      {
        company: "Northwind",
        src: specimenImages["partner-mark.png"],
        width: 820,
        height: 240,
      },
    ],
    claim: false,
    notes:
      "closing: contact, two speakers without images, a partner's logo before the lockup, the claim turned off. Fictional people and partner.",
  },
];
