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
        <span key={i} className="font-semibold text-slide-accent">
          {part.slice(1, -1)}
        </span>
      );
    }
    const text = part.slice(1, -1);
    // A short chip stays on one line, so a name never splits at its hyphen; a long one and a path
    // may break inside themselves, or a table of paths runs its last column off the slide. Brand's
    // inline code, in teal.
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
