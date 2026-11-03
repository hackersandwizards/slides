// Every frame of the print page inline, one 1920x1080 slide after another: brand-elements and the
// theme test read only a page's own document, never a frame's. A route ending in .html, which only
// an endpoint keeps as a file name.
import { brandHref, inlineFrames } from "../../../print";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Specimen slides inline, @hackersandwizards/slides</title>
<meta name="description" content="Every specimen slide of the h&amp;w slide engine inline, one 1920 by 1080 slide after another.">
<link rel="icon" href="${brandHref}/logos/favicon.ico" sizes="32x32">
<link rel="icon" href="${brandHref}/logos/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="build/slides.css">
<style>body{margin:0}</style>
</head>
<body>
<main>
${inlineFrames}
</main>
</body>
</html>
`;

export const GET = () => new Response(html, { headers: { "Content-Type": "text/html" } });
