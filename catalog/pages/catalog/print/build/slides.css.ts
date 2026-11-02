// The print pages' stylesheet: slides.css compiled by Tailwind over the frames' classes (print.ts).
import { css } from "../../../../print";

export const GET = () => new Response(css, { headers: { "Content-Type": "text/css" } });
