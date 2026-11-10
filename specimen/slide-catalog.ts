// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- an ambient wildcard module has no import form, and a consumer's typecheck reaches it only from here
/// <reference path="../types/url-imports.d.ts" />
import type { Presentation, Slide } from "../types/slide";
import agentSessionPoster from "./slide-catalog/agent-session-poster.png?url&no-inline";
import agentSessionVideo from "./slide-catalog/agent-session.mp4?url&no-inline";
import demoVideo from "./slide-catalog/demo.mp4?url&no-inline";
import partnerMark from "./slide-catalog/partner-mark.png?url&no-inline";
import portraitA from "./slide-catalog/portrait-a.png?url&no-inline";
import portraitB from "./slide-catalog/portrait-b.png?url&no-inline";
import qrExample from "./slide-catalog/qr-example.png?url&no-inline";
import qrTight from "./slide-catalog/qr-tight.png?url&no-inline";
import screenBoard from "./slide-catalog/screen-board.png?url&no-inline";
import screenChart from "./slide-catalog/screen-chart.png?url&no-inline";
import screenCode from "./slide-catalog/screen-code.png?url&no-inline";
import screenPullRequest from "./slide-catalog/screen-pull-request.png?url&no-inline";
import screenTeamBoard from "./slide-catalog/screen-team-board.png?url&no-inline";
import sketchNextToken from "./slide-catalog/sketch-next-token.png?url&no-inline";
import stripBoard from "./slide-catalog/strip-board.png?url&no-inline";
import stripPullRequest from "./slide-catalog/strip-pull-request.png?url&no-inline";

/** The deck's images in `slide-catalog/` beside this file, keyed by file name: each the URL the
 *  consumer's bundler gives the file, as for brand's logos. */
export const specimenImages = {
  "agent-session-poster.png": agentSessionPoster,
  "agent-session.mp4": agentSessionVideo,
  "demo.mp4": demoVideo,
  "partner-mark.png": partnerMark,
  "portrait-a.png": portraitA,
  "portrait-b.png": portraitB,
  "qr-example.png": qrExample,
  "qr-tight.png": qrTight,
  "screen-board.png": screenBoard,
  "screen-chart.png": screenChart,
  "screen-code.png": screenCode,
  "screen-pull-request.png": screenPullRequest,
  "screen-team-board.png": screenTeamBoard,
  "sketch-next-token.png": sketchNextToken,
  "strip-board.png": stripBoard,
  "strip-pull-request.png": stripPullRequest,
};
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
    content: [
      {
        type: "paragraph",
        text: "The kicker stays teal; the success theme's green marks its pill and footer rule.",
      },
    ],
    notes: "content: success theme, sparse.",
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
  {
    type: "content",
    sectionLabel: "Block: image",
    headline: "A screenshot at its full size",
    content: [
      { type: "image", src: specimenImages["screen-team-board.png"], alt: "Fictional team board" },
    ],
    notes: "content blocks: image.",
  },
  {
    type: "content",
    sectionLabel: "Block: video",
    headline: "A screen recording, ready to play",
    content: [
      {
        type: "video",
        src: specimenImages["agent-session.mp4"],
        poster: specimenImages["agent-session-poster.png"],
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
        src: specimenImages["screen-pull-request.png"],
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
        image: { src: specimenImages["screen-code.png"], alt: "Fictional code view" },
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
        // does not export it.
        image: {
          src: specimenImages["sketch-next-token.png"],
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
    sectionLabel: "Visual: bars as ranges",
    headline: "Ranges on a track",
    content: [
      {
        type: "bars",
        max: 100,
        bars: [
          { label: "Weekly digest", from: 45, value: 60, display: "45 to 60%", highlight: true },
          { label: "Chat summary", from: 55, value: 70, display: "55 to 70%", highlight: true },
          { label: "Status answers", from: 30, value: 55, display: "30 to 55%", highlight: true },
          { label: "Risk alerts", from: 50, value: 75, display: "50 to 75%", highlight: true },
          { label: "Audio recap", from: 15, value: 40, display: "15 to 40%" },
          { label: "Slide export", from: 20, value: 30, display: "20 to 30%" },
        ],
        source: "Fictional forecast: the chance to hit each option's success model",
      },
    ],
    notes: "visual blocks: bars with from, a low and a high end per bar.",
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

  {
    type: "regular",
    headline: "Regular slide with a profile sidebar",
    profile: {
      name: "Mara Lindqvist",
      title: "Platform lead, Lumen Freight",
      imageSrc: specimenImages["portrait-a.png"],
      linkedIn: "https://www.linkedin.com/in/example-profile-name",
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
      { title: "Cadence", description: "A weekly review.", tone: "neutral" },
    ],
    notes: "grid: pillars, two columns, allActive, numberFrom 5, highlight.",
  },
  {
    type: "grid",
    variant: "stats",
    ground: "primary",
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
      { title: "The checks caught what I missed.", author: "Team lead, fictional" },
      { title: "Monday metrics changed our backlog.", author: "Product lead, fictional" },
    ],
    notes: "grid: quotes.",
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

  {
    type: "media",
    sectionLabel: "Media",
    sectionTheme: "accent",
    headline: "One screenshot",
    sources: [
      {
        src: specimenImages["screen-board.png"],
        alt: "Fictional board",
        caption: "The team board",
      },
    ],
    notes: "media: single image with caption.",
  },
  {
    type: "media",
    layout: "grid",
    headline: "Gallery of three",
    sources: [
      { src: specimenImages["screen-board.png"], alt: "Board" },
      { src: specimenImages["screen-chart.png"], alt: "Chart" },
      { src: specimenImages["screen-code.png"], alt: "Code" },
    ],
    notes: "media: grid layout, three images.",
  },
  {
    type: "media",
    layout: "row",
    headline: "Row with tags",
    tags: ["Plan", "Build", "Review"],
    sources: [
      { src: specimenImages["screen-board.png"], alt: "Plan", height: 280 },
      { src: specimenImages["screen-code.png"], alt: "Build", height: 320 },
      { src: specimenImages["screen-chart.png"], alt: "Review", height: 280 },
    ],
    notes: "media: row layout with tags and heights.",
  },
  {
    type: "media",
    sources: [{ src: specimenImages["demo.mp4"], kind: "video", alt: "Fictional demo" }],
    notes: "media: video, no headline.",
  },

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
    sectionLabel: "Board snapshot",
    variant: "bar",
    headline: "Build holds the most tickets",
    yLabel: "Open tickets",
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
    type: "chart",
    variant: "bar",
    headline: "Review time goes to waiting",
    data: [
      { name: "Waiting for a reviewer", value: 31 },
      { name: "Reading the diff", value: 14 },
      { name: "Running the tests locally", value: 9 },
      { name: "Discussing naming", value: 6 },
      { name: "Fixing review comments", value: 12 },
      { name: "Second review round", value: 8 },
      { name: "Resolving merge conflicts", value: 7 },
      { name: "Waiting for deployment approval", value: 13 },
    ],
    annotation: "Hours per pull request, summed over a sprint. Fictional figures.",
    notes: "chart: bar with eight bars and long names, each wrapped inside its band.",
  },
  {
    type: "chart",
    variant: "trend",
    headline: "Every run measures against the first",
    // Marked at its first point, by the value axis, and a last name wider than the plot's margin.
    data: [
      { name: "Month 0", value: 2 },
      { name: "Month 3", value: 3 },
      { name: "Month 6", value: 5 },
      { name: "Month 12", value: 8 },
    ],
    xLabel: "Time",
    yLabel: "Teams on the harness",
    currentMarker: "Month 0",
    futureNote: "Baseline → repeat run → progress view → adoption over time",
    annotation: "Fictional figures.",
    notes: "chart: trend with one series, the current point marked and a note on what lies ahead.",
  },

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
    milestonesLabel: "Milestones",
    footer: "Fictional plan.",
    notes: "gantt: kicker, principle, sublabels, continuous bar, milestones, footer.",
  },

  {
    type: "team-topology",
    sectionLabel: "Proposal",
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
    enabling: [{ name: "Enabling: Architecture", experts: ["Integration", "Data"] }],
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
    type: "team-topology",
    headline: "A proposal to discuss",
    subtitle: "One stream team, and the teams that make it faster.",
    streamAligned: [
      {
        name: "Team: Booking portal for two markets",
        roles: ["Business lead", "Product lead", "Embedded field engineer", "Factory engineer"],
      },
    ],
    platform: [
      { name: "Platform: Environments", description: "Cloud, firewall, gateways" },
      { name: "Platform: Storefront", description: "Catalogue, checkout, orders" },
      { name: "Platform: Identity", description: "Login, roles, hierarchy" },
    ],
    enabling: [{ name: "Enabling: Security", experts: ["Guardrails", "Pen-test preparation"] }],
    complicatedSubsystem: [
      { name: "Subsystem: CRM", description: "Leads, routing, activities" },
      { name: "Subsystem: Legacy portal", description: "Data for the migration" },
    ],
    caption: "Fictional organisation: a target picture with every team type.",
    notes: "team-topology: a full proposal, every team type, three platforms and two subsystems.",
  },
  {
    type: "team-topology",
    headline: "The teams around one stream",
    subtitle: "One stream team, and the teams that make it faster.",
    streamAligned: [
      {
        name: "Booking portal for two markets",
        roles: ["Business lead", "Product lead", "Embedded field engineer", "Factory engineer"],
      },
    ],
    platform: [
      { name: "Environments", description: "Cloud, firewall, gateways" },
      { name: "Storefront", description: "Catalogue, checkout, orders" },
      { name: "Identity", description: "Login, roles, hierarchy" },
    ],
    enabling: [{ name: "Security", experts: ["Guardrails", "Pen-test preparation"] }],
    complicatedSubsystem: [
      { name: "CRM", description: "Leads, routing, activities" },
      { name: "Legacy portal", description: "Data for the migration" },
    ],
    legend: true,
    caption: "Fictional organisation.",
    notes: "team-topology: legend, naming what each box's colour and shape stand for.",
  },

  {
    type: "wheel",
    sectionLabel: "Operating model",
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
    sources: [{ src: specimenImages["screen-board.png"], alt: "Fictional board" }],
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

  {
    type: "content",
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
    notes: "content: prose only, three paragraphs and a footer.",
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
  {
    type: "content",
    headline: "Two weeks to the first live version, two more to the measured result",
    content: [
      {
        type: "timeline",
        continues: "out",
        events: [
          {
            title: "Starting point",
            text: "A small team that writes product texts, and one metric it may move itself: **time per text.**",
          },
          {
            segment: "1 week",
            title: "Prototypes",
            text: "A clickable screen and a script that runs the whole path once: fetch, write, check.",
          },
          {
            title: "Testing loop",
            text: "Every morning with the people who use it, then twice a week.",
          },
        ],
      },
    ],
    notes: "visual blocks: a timeline continued on the next slide, its line running out.",
  },
  {
    type: "content",
    headline: "Two weeks to the first live version, two more to the measured result",
    content: [
      {
        type: "timeline",
        continues: "in",
        highlight: 2,
        events: [
          {
            title: "Plan",
            text: "Written from the tested prototype, not before it, and split into tasks the agent works on.",
          },
          {
            segment: "2 weeks",
            title: "Built and rolled out",
            text: "First live version behind a feature flag, then iterated and opened to everyone.",
          },
          {
            segment: "2 weeks",
            title: "Measured",
            text: "Against the team's metric: time per product text before and after.",
            figure: "-90%",
          },
        ],
      },
    ],
    notes: "visual blocks: timeline with segment labels and a figure on an event, three columns.",
  },
  {
    type: "content",
    headline: "Six stages from the first ticket to the whole team",
    content: [
      {
        type: "timeline",
        now: 3,
        highlight: 3,
        events: [
          { when: "Jan", title: "First ticket", text: "One agent, one repository" },
          { segment: "3 weeks", title: "Plans", text: "Every task starts from a plan" },
          { segment: "2 weeks", title: "Checks", text: "Review starts from green" },
          {
            segment: "1 month",
            title: "Second team",
            text: "Lead time per change",
            figure: "-40%",
          },
          { title: "Platform", text: "One harness for both teams" },
          { title: "Whole team", text: "Every engineer on the loop" },
        ],
      },
    ],
    notes: "visual blocks: six stages alternate above and below the line, segments and a figure.",
  },
  {
    type: "content",
    sectionLabel: "Block: two images",
    headline: "One sprint, seen from the board and from the pull request",
    content: [
      {
        type: "image",
        src: specimenImages["strip-board.png"],
        alt: "Fictional sprint board, its header",
      },
      {
        type: "image",
        src: specimenImages["strip-pull-request.png"],
        alt: "Fictional pull request, its header",
      },
    ],
    notes: "content blocks: two images stacked, sharing the body's left edge and width.",
  },
  {
    type: "content",
    sectionLabel: "Block: gallery",
    headline: "One ticket on three screens",
    content: [
      {
        type: "gallery",
        layout: "row",
        items: [
          {
            src: specimenImages["screen-board.png"],
            alt: "Fictional board",
            caption: "Plan",
            height: 280,
          },
          {
            src: specimenImages["screen-code.png"],
            alt: "Fictional code",
            caption: "Build",
            height: 320,
          },
          {
            src: specimenImages["screen-chart.png"],
            alt: "Fictional chart",
            caption: "Review",
            height: 280,
          },
        ],
      },
    ],
    notes: "content blocks: a gallery row, each picture at its own height under its caption.",
  },
  {
    type: "content",
    sectionLabel: "Block: gallery",
    headline: "What the agent left behind",
    content: [
      {
        type: "gallery",
        items: [
          { src: specimenImages["screen-board.png"], alt: "Fictional board" },
          {
            src: specimenImages["agent-session.mp4"],
            poster: specimenImages["agent-session-poster.png"],
            kind: "video",
            alt: "Fictional agent session",
          },
          { src: specimenImages["screen-chart.png"], alt: "Fictional chart" },
        ],
        tags: ["Sprint 14", "Fictional"],
      },
    ],
    notes:
      "content blocks: a gallery grid with a video among the pictures and the tags they share.",
  },
  {
    type: "content",
    sectionLabel: "Connections",
    headline: "Connections grow with the square of the team",
    content: [
      {
        type: "bars",
        order: "given",
        bars: [
          { label: "5 people", value: 10, display: "10" },
          { label: "15 people", value: 105, display: "105" },
          { label: "50 people", value: 1225, display: "1,225" },
          { label: "150 people", value: 11175, display: "11,175", highlight: true },
        ],
      },
    ],
    footer: "n people have n(n-1)/2 possible connections.",
    notes: "visual blocks: bars three orders of magnitude apart, the smallest still visible.",
  },
  {
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
  },
  {
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
  },
  {
    type: "content",
    headline: "The middle of a longer plan",
    content: [
      {
        type: "timeline",
        continues: "both",
        events: [
          { title: "Pilot team", text: "One team works the new way for a month." },
          {
            segment: "4 weeks",
            title: "Second team",
            text: "Takes over the checks the first one wrote.",
          },
          { title: "Review", text: "Both teams compare their numbers with the old way." },
        ],
      },
    ],
    notes:
      "visual blocks: a timeline continued from the slide before and on the next, its line running in and out.",
  },
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
    qr: { src: specimenImages["qr-tight.png"], href: "https://example.com/discuss" },
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

export const slideCatalog: Presentation = {
  name: "Slide Catalog",
  subtitle: "Every slide type and its variants",
  speakers: ["hackers&wizards"],
  slides,
};

/** A proposal: the same slides in the engine's brand dark theme, on the website's night tokens.
 *  On no live deck. */
export const slideCatalogBrandDark: Presentation = {
  ...slideCatalog,
  name: "Slide Catalog, brand dark (proposal)",
  theme: "brand-dark",
};
