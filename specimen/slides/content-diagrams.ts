import type { Slide } from "../../types/slide";

export const diagramBlockSlides: Slide[] = [
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
];

export const timelineExamples: Slide[] = [
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
            figure: "-90 %",
          },
        ],
      },
    ],
    notes:
      "visual blocks: timeline with segment labels and a figure on an event, three columns, the figure's unit spaced.",
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
];

export const connectionsBarSlide: Slide = {
  type: "content",
  sectionTheme: "accent",
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
  notes:
    "visual blocks: bars three orders of magnitude apart, the smallest still visible, a footer on the accent theme's rule.",
};

export const continuedTimelineSlide: Slide = {
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
};
