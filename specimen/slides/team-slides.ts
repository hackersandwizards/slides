import type { Slide } from "../../types/slide";

export const teamStructureSlides: Slide[] = [
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
    legend: false,
    notes: "team-topology: minimal, without a legend.",
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
    caption: "Fictional organisation.",
    notes: "team-topology: names without their type, which the legend names.",
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
];
