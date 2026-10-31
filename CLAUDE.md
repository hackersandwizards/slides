# CLAUDE.md

The hackers&wizards slide engine as one package, `@hackersandwizards/slides`: the slide components,
the deck types, the slide stylesheet and the PDF renderer. Three repos run it and keep only their
decks: `talks` and `hycle-private/talks` on Next.js, `trainer-hub` on Astro. The reasoning is in os
`docs/tracking/2026-10-30-repo-coupling.md`.

This repo stays private on GitHub (`github.com/hackersandwizards/slides`, team `trainers` read, as
`brand`). Consumers install it as a Git dependency pinned to a tag,
`git+ssh://git@github.com/hackersandwizards/slides.git#v<version>`. `"private": true` stays:
nothing is ever published. A release is a tag `v<version>` matching `package.json`. Nothing here
writes into another repo.

**External trainers can read this whole repo, its history included**, because the trainer hub
installs it. Nothing goes in that a trainer may not see: no customer deck, price, rate, client
term, personal data or secret. Decks live in the consumers.

## Layout

- `components/slides/`: one component per slide type, plus the shared parts in `primitives.tsx`.
  A part used by a second slide type moves there.
- `components/ui/`: effects and `image.tsx`, the engine's image.
- `lib/`: hooks, navigation, presenter sync, the edit mode, themes and section styles.
  `lib/adapter.tsx` is the one seam to a consumer's framework: `SlidesAdapterProvider` takes an
  `Image` component and a `navigate(href, replace)`. Without a provider the engine renders a plain
  `<img>` and moves with `history` inside one island (the trainer hub). The Next consumers wrap
  their root layout in a provider with `next/image` and the router.
- `types/slide.ts`: the slide types and content blocks a deck may use.
- `styles/slides.css`: the slide scale, the type table and every slide length, read by the
  components by name, never as a literal size. It imports Tailwind and the brand tokens and fonts
  from `@hackersandwizards/brand`, and names its own `components/` and `lib/` as Tailwind sources,
  since Tailwind never scans `node_modules`.
- `scripts/render-pdf.ts`: prints a deck's print route to a PDF; each consumer's `export-pdf.ts`
  resolves deck, URL and file name and calls it.
- `test/`: the engine's unit tests.

Consumers import by path, `@hackersandwizards/slides/types/slide`, and ship the source: Next lists
the package in `transpilePackages`, Astro in `vite.ssr.noExternal`, each vitest config in
`server.deps.inline`. React, motion, lucide-react, recharts, shiki, Tailwind and the brand package
are peer dependencies, so each consumer holds one copy of each.

## Commands

- `bun run check`: format, lint, typecheck, unique function names, tests, the brand colour scan
  (`brand-colours.json` holds the exceptions). No hook runs it:
  `.githooks/pre-commit` runs `bun run check:staged`: `gitleaks` over the staged changes,
  `prettier --check` and `eslint` on the staged files. `bun install` points `core.hooksPath` at `.githooks/`.
- `bun run fix`: `eslint --fix`, then `prettier --write`.
- One test file: `bun run test <file>`.

## Releasing a change

1. Change the engine here, `bun run check` green, raise `version`, commit, tag `v<version>`, push
   with the tag.
2. In each consumer, raise the tag in `package.json`, `bun install`, run its gate. The regression
   decks are trainer-hub's `slide-master` and talks' `slide-catalogue`, which carry every slide
   type and variant; a new slide type or variant lands there first.

## Behavioral rules

Project rules live in `.claude/rules/*.md` (relative to this file). Files with no YAML frontmatter
are always-on: read and apply them this session. Files with a `paths:` frontmatter list apply only
when editing files matching those globs. Claude loads these natively and excludes the global
`~/.claude/rules` here via `claudeMdExcludes`. Codex and pi must read `.claude/rules/` themselves
and ignore the global set. These project rules supersede it.
