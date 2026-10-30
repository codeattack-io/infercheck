# Build plan: search-first redesign

Temporary orchestration state. Deleted in the final task before the PR is opened.

## Delivery

- Integration branch: `redesign/search-first` (worktree `ic-redesign`), based on `origin/main` at `c45e311`, first commit `docs/DESIGN.md`.
- Each task runs in its own worktree on branch `redesign/<task-id>`, branched from the current integration head.
- The orchestrator merges each green task locally with `--no-ff`, in plan order, and runs the full gate after every merge.
- Workers commit small and do not push. The orchestrator pushes the integration branch once and opens one PR against `main`; merging it deploys, so that is left to Carlo.

## Source of truth

- `docs/DESIGN.md` describes the target UI. Where it and the visual reference disagree, the document wins.
- Visual reference (outside the repo, never copied into it): `http://localhost:8080/r3/h-suche-zuerst.html`, source `/workspace/infercheck-design/design/spikes/redesign/r3/h-suche-zuerst.html`.
- Confirmed by Carlo: "Mehr laden" in steps of 50 rows; the providers list becomes a table.

## Gate

`scripts/gate fast|full` through `~/.agents/skills/orchestrate-project/scripts/gate-run.sh`. `full` builds against `DATABASE_URL_DEV` and fails on `MISSING_MESSAGE`.

## Safety rules for every task

- `DATABASE_URL` in `.env.local` is the production database: read-only use only (dev server, build). No sync, no migrations.
- No pushes, no uploads, no new dependencies.

## Tasks

| ID  | Task                                                                                                                                                         | Depends on | Model / effort  | Status                   | Branch                   | Last gate          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------- | ------------------------ | ------------------------ | ------------------ |
| R1  | Foundation: tokens, fonts, page width and breakpoint, header, footer, shared primitives (tier pill, chips, buttons, neutral pills, gateway pill, BooleanRow) | —          | Opus 5.5 / high | merged                   | `redesign/r1-foundation` | full green b9e372a |
| R2  | Home page: finder, model table, expanded row, mobile rows, load more, empty state, search clear and highlight, custom filter checkboxes                      | R1         | Opus 5.5 / high | running (agent 46d41d40) | `redesign/r2-home`       | —                  |
| R4  | Providers list as table, long-form pages, Open Graph image                                                                                                   | R1         | Opus 5.5 / high | running (agent 5a7c30b2) | `redesign/r4-providers`  | —                  |
| R3  | Model page and provider page                                                                                                                                 | R2         | Opus 5.5 / high | queued                   | `redesign/r3-detail`     | —                  |
| R5  | Visual and accessibility QA across all pages, both locales, desktop and mobile; fix deviations from DESIGN.md                                                | R2, R3, R4 | Opus 5.5 / high | queued                   | `redesign/r5-qa`         | —                  |
| R6  | Delete this file, final full gate, push, open PR with screenshots (orchestrator)                                                                             | all        | —               | queued                   | —                        | —                  |

## Why this cut

- R1 changes the shared contract (tokens, primitives, layout shell) every page consumes, so it goes first.
- R2 and R4 touch disjoint pages and components and run in parallel; both add message keys, so the second to merge rebases.
- R3 reuses the home table from R2.
- R5 checks the assembled result against the document.
