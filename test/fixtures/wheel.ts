import type { WheelSlide } from "../../types/slide";

// A sample wheel with the six segments the type is built for. The render test and a manual PPTX
// export both read it; the test also cuts it to four and five.
export const wheelSlide: WheelSlide = {
  type: "wheel",
  headline: "Was eine Factory ausmacht",
  subtitle: "Sechs Bereiche um einen Kern, jeder mit einem Verantwortlichen",
  center: "Software Factory",
  segments: [
    { title: "Kontext", text: "Regeln, Skills und Wissen im Repository" },
    { title: "Qualitätstore", text: "Tests, Linter und Review vor jedem Merge" },
    { title: "Leitplanken", text: "Security und Architektur automatisch geprüft" },
    { title: "Pipelines", text: "Vom Ticket bis in Produktion ohne Handarbeit" },
    { title: "Messung", text: "Durchsatz, Fehlerquote, Nacharbeit" },
    { title: "Retro", text: "Jeder Fehler wird zu einer Regel" },
  ],
  caption: "Beispiel für den Test, nicht Teil eines Decks.",
};
