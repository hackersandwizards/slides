import type { Slide } from "../../types/slide";
import { specimenImages } from "../images";

export const mediaBlockSlides: Slide[] = [
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
];

export const galleryAndImageSlides: Slide[] = [
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
];

export const imageStepsSlide: Slide = {
  type: "content",
  sectionLabel: "Block: image steps",
  headline: "One board, built up step by step",
  content: [
    {
      type: "image-steps",
      alt: "Fictional board",
      steps: [
        { src: specimenImages["screen-board.png"], caption: "The board as the sprint starts" },
        { src: specimenImages["screen-chart.png"], caption: "The chart it feeds" },
        { src: specimenImages["screen-code.png"], caption: "The code behind one card" },
      ],
    },
  ],
  notes: "content blocks: image-steps, three pictures replacing each other in place.",
};

export const profileLinksSlide: Slide = {
  type: "content",
  sectionLabel: "Block: profile links",
  headline: "Mara Lindqvist",
  content: [
    { type: "paragraph", text: "Platform lead at Lumen Freight, ten years of platform work." },
    {
      type: "profile-links",
      linkedIn: "https://www.linkedin.com/in/example-profile-name",
      github: "https://github.com/example-profile-name",
    },
  ],
  notes: "content blocks: paragraph, profile-links.",
};

export const mediaSlides: Slide[] = [
  {
    type: "media",
    sectionLabel: "Media",
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
];
