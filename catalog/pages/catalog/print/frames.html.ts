// Every frame of the print page inline, one 1920x1080 slide after another: brand-elements and the
// theme test read only a page's own document, never a frame's. A route ending in .html, which only
// an endpoint keeps as a file name.
import { inlineFrames } from "../../../print";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Specimen slides inline, @hackersandwizards/slides</title>
<link rel="stylesheet" href="build/slides.css">
<style>body{margin:0}</style>
</head>
<body>
${inlineFrames}
</body>
</html>
`;

export const GET = () => new Response(html, { headers: { "Content-Type": "text/html" } });
