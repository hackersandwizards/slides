import { css } from "../../../../print-stylesheet";

export const GET = () => new Response(css, { headers: { "Content-Type": "text/css" } });
