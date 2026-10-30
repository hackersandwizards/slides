import type { DecisionSlide } from "../../types/slide";

// A sample decision slide. The render test and a manual PPTX export both read it.
export const decisionSlide: DecisionSlide = {
  type: "decision",
  headline: "Wohin ein Bedarf des Teams geht",
  subtitle: "Eine Frage entscheidet, wer liefert",
  need: "Das Stream-Team braucht eine neue Fähigkeit",
  question: "Brauchen mehrere Teams sie dauerhaft?",
  yes: {
    label: "Ja",
    title: "Platform Team",
    text: "Baut sie einmal und bietet sie als Service an",
    team: "platform",
  },
  no: {
    label: "Nein",
    title: "Enabling Team",
    text: "Begleitet das Team auf Zeit, bis es sie selbst kann",
    team: "enabling",
  },
  outcome: "Das Stream-Team liefert weiter ohne Wartezeit",
  caption: "Beispiel für den Test, nicht Teil eines Decks.",
};
