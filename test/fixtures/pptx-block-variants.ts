import type { ContentBlock, ContentSlide } from "../../types/slide";

export const pptxBlockVariants = {
  emphasis: {
    type: "content",
    headline: "Release advice",
    content: [{ type: "paragraph", text: "Start with *small steps* today." }],
  },
  quote: {
    type: "content",
    headline: "Opening words",
    content: [{ type: "quote", text: "Start where you are." }],
  },
  callout: {
    type: "content",
    headline: "Ready to start",
    layout: "centered",
    footer: "Workshop notes",
    content: [{ type: "callout", text: "Bring a sample." }],
  },
  layers: {
    type: "content",
    headline: "Dispatch",
    content: [{ type: "layers", ordered: true, layers: [{ title: "Queue" }, { title: "Work" }] }],
  },
  missingVideo: {
    type: "content",
    headline: "Video sample",
    content: [{ type: "video", src: "/r2s-missing.mp4", alt: "Video unavailable" }],
  },
  missingAnnotated: {
    type: "content",
    headline: "Annotated sample",
    content: [
      {
        type: "annotated",
        src: "/r2s-missing-annotated.png",
        size: [800, 400],
        notes: [{ y: 0.5, text: "Read this line." }],
      },
    ],
  },
  barRange: {
    type: "content",
    headline: "Estimated days",
    content: [{ type: "bars", max: 10, bars: [{ label: "Delivery", from: 3, value: 7 }] }],
  },
  positions: {
    type: "content",
    headline: "Two positions",
    content: [
      {
        type: "positions",
        left: { name: "Ari", stance: "Fast", quote: "Use the cache." },
        right: { name: "Bea", stance: "Safe", quote: "Verify the inputs." },
        resolution: "Run a pilot.",
      },
    ],
  },
  framedFlow: {
    type: "content",
    headline: "Delivery flow",
    content: [
      {
        type: "flow",
        steps: [{ title: "Build" }, { title: "Ship" }],
        frame: { label: "Release route" },
      },
    ],
  },
  cardWithoutText: {
    type: "content",
    headline: "A plan",
    content: [{ type: "cards", dense: true, items: [{ title: "Plan" }] }],
  },
  unknown: {
    type: "content",
    headline: "Unsupported block",
    content: [{ type: "nope" } as unknown as ContentBlock],
  },
} satisfies Record<string, ContentSlide>;
