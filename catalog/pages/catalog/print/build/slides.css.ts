import { css } from "../../../../print";

export const GET = () => new Response(css, { headers: { "Content-Type": "text/css" } });
