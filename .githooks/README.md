# Git hooks

`bun install` points `core.hooksPath` here for this clone, never in user-global git config.

| Hook         | Trigger      | Action                                                                                  |
| ------------ | ------------ | --------------------------------------------------------------------------------------- |
| `pre-commit` | every commit | `gitleaks` over the staged changes, `prettier --check` and `eslint` on the staged files |

A missing `gitleaks` fails the commit closed: `brew install gitleaks`.
