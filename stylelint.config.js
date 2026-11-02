// Custom properties only from brand's tokens (the scaffolding base) and the files the slide
// stylesheet imports: brand's stage scale and night, its elements and marker, and the slides' own.
import styles from "@hackersandwizards/scaffolding/stylelint";

export default styles({
  importFrom: [
    "@hackersandwizards/brand/stage.css",
    "@hackersandwizards/brand/night.css",
    "@hackersandwizards/brand/elements.css",
    "@hackersandwizards/brand/marker.css",
    "./styles/tokens.css",
    "./styles/slides.css",
  ],
});
