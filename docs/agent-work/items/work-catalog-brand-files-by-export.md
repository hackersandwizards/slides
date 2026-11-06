---
kind: work
status: open
priority: 3
order: 650
owner: Agent (slides session)
evidence: "slides v1.7.2 session of 06.11.2026: /simplify (altitude) and /code-review over 4f08e93..HEAD both named it"
---

# The catalog takes brand's files by folder, not by export name

`catalog/astro.config.ts` copies brand's `tokens/`, `generated/` and `expert/` folders and the
`.svg` files of `logos/` to `dist/brand/`, and its dev server serves any `/brand/<path>`.
`catalog/print.ts` rewrites each `url("@hackersandwizards/brand/...")` to the file's path inside
brand's folder, matching double-quoted URLs only. All of this reads brand's folder layout, which
brand may change behind unchanged `exports`; `.claude/rules/coupling.md` allows only the export
names.

What breaks, and silently: brand moves a folder behind an unchanged export name (build throws or
links 404), or a brand stylesheet gains a `url()` into a folder the build does not copy, or a
single-quoted one (the print page loses the file, the gate stays green).

Done when the build copies each file under its export name, resolved through brand's `exports`,
the print page links those names, the `url()` rewrite covers every quoting and fails on a URL it
cannot place, and `bun run check` plus a before/after diff of the print pages stay unchanged.
