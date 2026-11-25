import type { Slide, TeamTopologySlide } from "../../types/slide";

const portraitPath = "specimen/slide-catalog/portrait-a.png";
const team = {
  type: "team-topology",
  headline: "Delivery teams",
  enabling: [],
  legend: false,
} satisfies Pick<TeamTopologySlide, "type" | "headline" | "enabling" | "legend">;

export const pptxSlideVariants = {
  evolution: {
    type: "evolution",
    headline: "From pilot to service",
    stages: [
      {
        multiplier: "01",
        title: "Pilot",
        subtitle: "One team",
        description: "Test the route",
        isHighlighted: true,
      },
    ],
  },
  dualPill: {
    type: "dual-pill-overview",
    headline: "Two tracks",
    left: {
      label: "Start",
      title: "Prepare",
      accent: "ingredients",
      phases: [{ label: "First", items: [{ title: "Plan" }] }],
    },
    right: {
      label: "Next",
      title: "Deliver",
      accent: "deepdive",
      phases: [{ label: "Second", items: [{ title: "Ship" }] }],
    },
  },
  regular: {
    type: "regular",
    headline: "Research",
    profile: { name: "Ari Example", title: "Researcher" },
    sections: [
      {
        title: "Findings",
        text: "A short summary",
        items: ["Interview notes"],
        link: { url: "https://example.com/report", label: "Read the report" },
      },
    ],
  },
  quote: {
    type: "statement",
    lines: ["The pilot is complete"],
    closing: "Start small",
    closingStyle: "quote",
  },
  qr: {
    type: "statement",
    lines: ["Try the demo"],
    kicker: "Live demo",
    points: ["Open the sample", "Run the demo"],
    closing: "Bring questions",
    qr: { src: "specimen/slide-catalog/qr-example.png", href: "https://example.com/demo" },
  },
  side: {
    type: "statement",
    lines: ["Share the results"],
    crossedOut: "Keep them private",
    points: ["Write a summary", "Send it"],
    imageSrc: portraitPath,
    imageAlt: "Speaker portrait",
  },
  comparison: {
    type: "comparison",
    headline: "Two suppliers",
    variant: "split",
    left: {
      label: "First supplier",
      items: ["Local support"],
      logo: "specimen/slide-catalog/partner-mark.png",
    },
    right: { label: "Second supplier", items: ["Global support"] },
  },
  centredEmail: {
    type: "closing",
    claim: false,
    speakers: [{ name: "Ari Example", company: "Sample Co", contact: "ari@example.com" }],
  },
  portraitContact: {
    type: "closing",
    claim: false,
    speakers: [
      {
        name: "Ari Example",
        company: "Sample Co",
        imageSrc: portraitPath,
        contact: "ari@example.com",
      },
    ],
  },
  portraitLinkedIn: {
    type: "closing",
    claim: false,
    speakers: [
      {
        name: "Ari Example",
        company: "Sample Co",
        imageSrc: portraitPath,
        linkedIn: "https://www.linkedin.com/in/ari-example",
      },
    ],
  },
  subsystem: {
    ...team,
    streamAligned: [{ name: "Storefront", roles: ["Engineer"] }],
    platform: [{ name: "Hosting" }],
    complicatedSubsystem: [{ name: "Payments" }],
  },
  noPlatform: {
    ...team,
    streamAligned: [{ name: "Storefront", roles: ["Engineer"] }],
    platform: [],
  },
} satisfies Record<string, Slide>;
