// An endpoint, since only an endpoint keeps a route ending in .html as its file name.
import { brandHref } from "../../../brand-urls";
import { inlineFrames } from "../../../print";

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
