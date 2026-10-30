---
name: parallel-session
description: Track parallel work and the person's decisions in repo files (GOAL.md, docs/tracking/decisions/items.js, dated reports, a review hub), so the person can review after being away, and choose between the shared checkout and a worktree per delegate. Use before fanning out a third delegate, before leaving a session running, and for "what is open", "what needs me", "decision list", "Entscheidungsliste", "worktree".
---

# Parallel session

This folder holds tooling only: `decisions.html` and `hub.ts`. Goal, work and decision data live
in the repo the work belongs to, never here.

## One home per fact

- `GOAL.md` at the repo root: the goal in the person's words, the limits, what done means, and one
  row per open piece of work with owner and evidence (a commit hash, a file, or "not established"),
  in the shape the file already uses.
- `docs/tracking/decisions/items.js`: one row per decision the person may veto, an open question or
  an assumption an agent made. Routine choices stay out.
- `docs/tracking/YYYY-MM-DD-<topic>.md`: one report per topic, what was measured, with evidence.
- `~/Downloads/stand-entscheidungen/<topic>/`: an `index.html` and a `review.json` for review.
  Never the only copy of a fact.

Work that waits on a decision keeps its `GOAL.md` row, which names the `items.js` row's `id`
instead of repeating the question. The open points for the person's return are the open `GOAL.md`
rows plus the `open` and `assumed` rows in `items.js`. No third list exists.

## Steps

1. At start, read `GOAL.md` and `items.js` in every repo the work touches. Where `GOAL.md` is
   missing and the work spans sessions or delegates, create it with the goal quoted from the
   person's message. Check: the first section quotes the person.
2. Every message from the person that adds, decides or changes work gets its row in the same turn.
   Check: `git diff` shows the row.
3. A delegate's brief names the rows it owns by item or `id`, quotes the `items.js` row format, and
   says whether the delegate works in the shared checkout or a worktree. A delegate edits only
   those rows.
4. A finished item leaves `GOAL.md` in the commit that finishes it. A row the person decided takes
   `status: "decided"` and the answer in `decision`, then leaves `items.js`: in the commit that
   carries the decision out, or, where work remains, as one `GOAL.md` row naming the `id`.
   `git log -S '<id>'` finds a removed row.
5. Before each commit that touches `items.js` or a `review.json`, run
   `bun ${CLAUDE_SKILL_DIR}/hub.ts --check <repo> ...` with every repo whose rows a `review.json`
   may name. Check: it prints `ok`.
6. A report states the current state only. A later batch on the same topic edits that report and
   deletes what it superseded. Earlier rounds and raw reviews go to the scratchpad, or to the
   topic's `_verlauf/` in the hub.
7. Each topic the person must see gets a hub folder. Then run
   `bun ${CLAUDE_SKILL_DIR}/hub.ts <repo> ...` with every repo the session touched. Check: the
   hub's `index.html` shows the topic. That page is the person's one entry point: it also links
   each repo's decision list with its open and assumed counts, and lists every open priority-1 row.
   A batch that changes an asset hub topics show, such as a logo, colour or lockup, re-renders every
   topic showing the old asset or moves it to `_archiv/`, in that batch. Check: no topic folder
   showing that asset is older than the change.
8. When the person returns, report from the rows, ordered by what each costs if missed. Before
   ending the session, read the transcript from its first message: every item of the first report,
   every question put and its answer, every promise. Check: each unfinished one has a row.

## Shared checkout or worktree

The shared checkout is the default. Give a delegate a worktree only where the shared index costs
more than the worktree: several delegates committing in one repo at once, or a long run changing
app code that the full gate checks. Short record and document edits stay in the shared checkout.

A worktree in os costs about 1.5 GB of disk and 5 s to create, `bun install` about 2 s from a warm
cache, plus cold Astro and Vite caches. The gate's lock serialises runs within one checkout only,
so each worktree's full gate runs beside the others.

- Before the fan-out, commit and push everything the delegates need: a worktree starts from
  `origin/main`.
- `isolation: worktree` creates `.claude/worktrees/<name>/` on a local branch `worktree-<name>`.
  Where `git check-ignore -q .claude/worktrees/x` fails, add `.claude/worktrees/` to the repo's
  `.gitignore` first. A linter run over the whole tree, such as `eslint .`, also lints a worktree
  there unless its config ignores the path.
- A hand-made worktree goes outside the repo with no branch:
  `git worktree add --detach <scratchpad>/<run>-wt origin/main`.
- The delegate installs the repo's dependencies in its worktree (`bun install` in os) before its
  first commit, since the hook needs them. It commits there, then runs `git fetch`, `git rebase origin/main` and
  `git push origin HEAD:main`, repeating on rejection, before its run ends. Check:
  `git log origin/main..HEAD` prints nothing.
- Remove each worktree as soon as its delegate's work is on `main`, while the session goes on, so
  none outlives it: `git worktree remove <path>` once, inside it, `git log origin/main..HEAD` and
  `git status --porcelain` both print nothing. Delete a `worktree-<name>` branch with
  `git branch -D` once `git log origin/main..worktree-<name>` prints nothing. `git worktree remove`
  drops a clean worktree's unpushed commits without a warning.

## items.js

The file assigns `window.DECISION_REPOS["<repo>"] = [ ... ]`, optionally
`window.DECISION_AREAS = { <area>: "<label>" }`. Required per row: a unique `id`, `title`, `area`,
`priority` (1 to 3), `order`, `status` (`open`, `assumed` or `decided`) and `context`. Optional:
`options` (each `key`, `label`, `detail`), `recommended` (an option key), `assumption`, `decision`
(required once `decided`), `detail`. `decided` means the person's own answer; a choice an agent
made is `assumed`. The repo's `.claude/skills/parallel-session/decisions.html`, opened from disk,
renders the rows and exports the answers as `answers.json`, keyed by repo and `id`.

## review.json

An open topic, with every field filled:

```json
{
  "status": "decide",
  "report": "docs/tracking/2026-01-15-pricing-page.md",
  "row": "pricing-page-layout",
  "current": {
    "question": "Which pricing page layout ships?",
    "candidates": [
      {
        "label": "Two tiers side by side",
        "score": "8.5 / 10",
        "image": "a.png",
        "recommended": true
      },
      {
        "label": "One tier with a toggle",
        "score": "7.0 / 10",
        "image": "b.png"
      }
    ]
  }
}
```

`status` is `decide`, `use` or `info`. `row` may be a prefix ending in `*`. `current` holds the
latest state only: at most three `candidates`, `recommended` on one of them, and `todo` or `result`
where the topic needs them. A decided topic replaces `question` and `candidates` with
`"decision": "<the chosen option>"`, and only a decided topic carries `decision`. The person hides
a reviewed topic by ticking "reviewed"; a topic folder that vanished is theirs, not a defect.
