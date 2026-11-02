# Git hooks

`bun install` points `core.hooksPath` here for this clone, never in user-global git config.

| Hook            | Trigger                                                     | Runs                                                                                                            |
| --------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pre-commit`    | every commit                                                | `bun run check:staged`: scaffolding's `check-staged` (gitleaks, coupling, confidential, prettier, eslint)        |
| `commit-msg`    | every commit                                                | `check-confidential` on the message                                                                             |
| `pre-push`      | every push                                                  | `check-confidential prepush`: refuses commits a `.confidential-purged.json` lists (none here)                  |
| `post-merge`    | a merge that changed `bun.lock` or `package.json`           | `bun install --frozen-lockfile`, quiet; a failure never fails the merge and shows as the gate's first step      |
| `post-checkout` | a branch checkout that changed `bun.lock` or `package.json` | the same install                                                                                                |

A missing `bun`, `gitleaks`, `prettier` or `eslint` fails the commit closed: `brew install gitleaks`, `bun install`.
