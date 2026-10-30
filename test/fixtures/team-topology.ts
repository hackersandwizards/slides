import type { TeamTopologySlide } from "../../types/slide";

// The densest picture the type has to hold on one slide: three stream teams with four chips
// each, two platform teams with chips, three enabling teams and three complicated-subsystem teams.
// The render test and a manual PPTX export both read it.
export const teamTopologySlide: TeamTopologySlide = {
  type: "team-topology",
  headline: "Zielbild: Teams entlang der Fachlichkeit",
  subtitle: "Stream-aligned Teams liefern, Plattform, Enabling und Subsysteme machen sie schneller",
  streamAligned: [
    {
      name: "Stream-aligned Team: Advisor Portal Frankreich",
      roles: ["Product Lead", "Product Engineer", "Factory Engineer", "Business Lead"],
    },
    {
      name: "Stream-aligned Team: One Frontstage Checkout",
      roles: ["Product Lead", "Product Engineer", "Factory Engineer", "Business Lead"],
    },
    {
      name: "Stream-aligned Team: Kundenservice",
      roles: ["Product Lead", "Product Engineer", "Factory Engineer", "Business Lead"],
    },
  ],
  platform: [
    {
      name: "Platform Team Software Factory",
      description: "Harness, Pipelines, Qualitätstore",
      roles: ["Factory Engineers, ca. 1 je Stream-Team", "Platform Lead"],
    },
    {
      name: "Platform Team Infrastruktur",
      description: "Azure, Netzwerk, Betrieb, Zugänge",
      roles: ["Cloud Engineers", "Betrieb"],
    },
  ],
  enabling: [
    { name: "Enabling Architektur", experts: ["Architektur", "Integration"] },
    { name: "Enabling Qualität", experts: ["Test", "Security"] },
    { name: "Enabling UX", experts: ["UX Research", "UX Design"] },
  ],
  complicatedSubsystem: [
    { name: "SAP", description: "ERP, Aufträge, Abrechnung" },
    { name: "Adobe", description: "Content und Kampagnen" },
    { name: "Umsysteme", description: "Schnittstellen der Länder" },
  ],
  caption: "Beispiel für den Test, nicht Teil eines Decks.",
};
