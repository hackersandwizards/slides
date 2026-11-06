import React from "react";

export function renderMarkdown(text: string): React.ReactNode {
  // Single-asterisk emphasis requires non-whitespace immediately inside the
  // markers so arithmetic like "2 * 3 * 4" is not mistaken for emphasis.
  const parts = text.split(
    /(\[[^\]]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*(?!\s)[^*]+(?<!\s)\*|`[^`]+`)/g,
  );
  // `split` with a capturing group puts the captured spans at the odd indices.
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    // Only web, mail and relative targets become links; any other scheme stays plain text.
    if (link && !/^(https?:|mailto:|[/#.]|[^:]*$)/i.test(link[2])) return link[1];
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="hw-link">
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && !part.startsWith("**")) {
      return (
        <span key={i} className="font-semibold text-accent">
          {part.slice(1, -1)}
        </span>
      );
    }
    const text = part.slice(1, -1);
    // A short chip stays on one line, so a name never splits at its hyphen; a long one and a path
    // may break inside themselves, since a table of paths ran its last column off the slide
    // (slides v0.19.0 to v0.21.1). Brand's inline code, in teal. Blind panel 06.11.2026 (engineer in
    // the audience, deck designer; Claude and Codex, two runs, noise 0.36): this 7.6, the former own
    // teal chip 8.0 (its night tint vanished on the slide; a tie with Codex), brand's in teal at the
    // line's size 8.7, a lead only Claude gave, so no exception for the size.
    return (
      <code
        key={i}
        className={`hw-inline-code text-primary ${(text.length <= 24 && !/[/.]/.test(text)) || (text.includes(" ") && text.length <= 40) ? "md:whitespace-nowrap" : "[overflow-wrap:anywhere]"}`}
      >
        {text}
      </code>
    );
  });
}
