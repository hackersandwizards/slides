"use client";

import type { ContentBlock } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { renderMarkdown } from "../../lib/markdown";
import { CodeLines } from "../../lib/use-code-highlight";
import { CodePanel } from "./primitives";

const TERMINAL_PREFIX_COLORS = new Map([
  ["$", "text-(--code-inserted)"],
  ["→", "text-amber"],
]);

export function FencedColumnCode({ text }: { text: string }) {
  const language = text.slice(3, text.indexOf("\n")).trim();
  const codeContent = text.slice(text.indexOf("\n") + 1, text.lastIndexOf("```"));
  return (
    <CodePanel
      as="pre"
      className="p-5 text-base leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap"
    >
      <code className="font-code">
        <CodeLines code={codeContent.replace(/\n$/, "")} language={language} />
      </code>
    </CodePanel>
  );
}

export function CodeBlock({ block }: { block: Extract<ContentBlock, { type: "code" }> }) {
  return (
    <CodePanel as="pre" className="p-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
      <code className="font-code text-lg">
        <CodeLines code={block.code} language={block.language} />
      </code>
    </CodePanel>
  );
}

export function CodeAndTextBlock({
  block,
}: {
  block: Extract<ContentBlock, { type: "code-and-text" }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-8">
      <CodePanel className="overflow-hidden">
        <pre className="p-6 text-base leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
          <code className="font-code">
            <CodeLines code={block.code} language={block.language} />
          </code>
        </pre>
      </CodePanel>

      <div className="flex flex-col justify-center space-y-8">
        {block.sections.map((section, i) => (
          <div key={i}>
            <h2 className="hw-label mb-2 [--hw-label-size:var(--text-xl)]" data-hue="amber">
              {section.title}
            </h2>
            <p className="text-xl leading-relaxed text-text-muted">
              {renderMarkdown(section.text)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TerminalBlock({ block }: { block: Extract<ContentBlock, { type: "terminal" }> }) {
  return (
    <CodePanel className="mx-auto max-w-4xl overflow-hidden text-left">
      <div className="border-b border-white/15 px-6 py-3 font-mono text-xs text-(--code-comment)">
        terminal
      </div>
      <div className="space-y-2 px-6 py-5 font-mono text-lg leading-loose sm:text-xl">
        {block.commands.map((cmd, i) => (
          <BlurFade key={i} delay={0.3 + i * 0.15} duration={0.4}>
            <div>
              <span className={TERMINAL_PREFIX_COLORS.get(cmd.prefix) ?? "text-(--code-comment)"}>
                {cmd.prefix}
              </span>{" "}
              <code>{cmd.text}</code>
            </div>
          </BlurFade>
        ))}
      </div>
    </CodePanel>
  );
}
