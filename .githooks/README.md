# Git hooks

`bun install` points `core.hooksPath` here for this clone, never in user-global git config.

| Hook            | Trigger                                                     | Runs                                                                                                                                            |
| --------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit`    | every commit                                                | `bun run check:staged`: scaffolding's `check-staged` (gitleaks, coupling, confidential, prettier, eslint; `admin-check` when an item is staged) |
| `commit-msg`    | every commit                                                | `check-confidential` on the message                                                                                                             |
| `pre-push`      | every push                                                  | `check-confidential prepush`: refuses commits a `.confidential-purged.json` lists (none here)                                                   |
| `post-merge`    | a merge that changed `bun.lock` or `package.json`           | `install`; a skip or failure is named on stderr                                                                                                 |
| `post-checkout` | a branch checkout that changed `bun.lock` or `package.json` | `install`, never failing the checkout                                                                                                           |

`install` runs `bun install --frozen-lockfile` under `check-lock` without waiting, silent when it
installs. `session-start`, the SessionStart hook in `.claude/settings.json`, fetches `origin main`
within 20 s, says how far it is ahead, and runs `install`; the chrome-devtools server in `.mcp.json`
runs `install` before it starts.

A missing `bun`, `gitleaks`, `prettier` or `eslint` fails the commit closed: `brew install gitleaks`, `bun install`.
