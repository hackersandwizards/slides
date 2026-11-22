import { fitSlide } from "../components/slides/fit-slide";

for (const shell of document.querySelectorAll<HTMLElement>(
  ".print-slide:has(> .slide-footer) > .slide-shell",
)) {
  fitSlide(shell);
}
