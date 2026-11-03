import shared from "@hackersandwizards/scaffolding/prettier";

// The shared config plus Tailwind's class sorting, which has to be the last plugin.
export default {
  ...shared,
  plugins: [...shared.plugins, "prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./styles/slides.css",
};
