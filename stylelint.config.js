// Custom properties only from brand's tokens (the scaffolding base) and these files.
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
