# @hackersandwizards/slides

The hackers&wizards slide engine as one private package: every slide type, the deck types, the
slide stylesheet and the PDF renderer. `talks`, `trainer-hub` and `hycle-private/talks` install it
and keep only their decks.

Maintainer: Benedikt Stemmildt. Trainers can read the whole repo, its history included, so nothing
goes in that a trainer may not see.

## Use it in another repo

Add the dependency in exactly this form, pinned to the newest tag
(`git ls-remote --tags https://github.com/hackersandwizards/slides.git` lists them), next to
`@hackersandwizards/brand`, which the stylesheet needs. Your machine needs GitHub read access to
both repos. Bun rewrites `github:` and `git+https://` to GitHub's tarball API, which answers 404
for a private repo; the `git+ssh://` form clones through git, over HTTPS with the credential helper
(`gh auth login`, `gh auth setup-git`) or over SSH. Without access Bun stops at
`InstallFailed cloning repository for @hackersandwizards/slides` and names no cause.

```json
"@hackersandwizards/slides": "git+ssh://git@github.com/hackersandwizards/slides.git#v<version>"
```

| Import                                               | What                                   |
| ---------------------------------------------------- | -------------------------------------- |
| `@hackersandwizards/slides/styles/slides.css`        | the slide stylesheet, Tailwind 4       |
| `@hackersandwizards/slides/types/slide`              | `Presentation`, `Slide` and the blocks |
| `@hackersandwizards/slides/components/slides/<Name>` | a slide component                      |
| `@hackersandwizards/slides/lib/<module>`             | hooks, navigation, presenter sync      |
| `@hackersandwizards/slides/lib/adapter`              | `SlidesAdapterProvider`                |
| `@hackersandwizards/slides/scripts/render-pdf`       | `renderPdf` for an export script       |

The package ships TypeScript source. Let the build transpile it: Next
`transpilePackages: ["@hackersandwizards/slides"]`, Astro `vite.ssr.noExternal`, vitest
`test.server.deps.inline`. A Next app wraps its root layout in `SlidesAdapterProvider` with
`next/image` and its router; without a provider the engine uses a plain `<img>` and `history`.

## Work on the package

```sh
bun install      # also points the git hooks at .githooks/
bun run check    # format, lint, typecheck, unique names, tests, brand colours
```

A release is a tag `v<version>` matching `version` in `package.json`; consumers then raise the tag
in their dependency line. The rest: [CLAUDE.md](CLAUDE.md).
