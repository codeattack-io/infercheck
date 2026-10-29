# Build plan: foundation overhaul

Temporary orchestration state. Deleted in the final task before the PR is opened.

## Delivery

- Integration branch: `integration/overhaul` (branched from `origin/main` at `9f0e178`).
- Each task runs in its own worktree on branch `overhaul/<task-id>`, branched from the current integration head.
- The orchestrator merges each green task locally with `--no-ff`, one merge commit per task, in plan order.
- Workers commit small and do not push. The orchestrator pushes the integration branch once and opens one PR against `main`. Merging that PR deploys to production, so it is left to Carlo.

## Gate

`scripts/gate fast|full`, run through `~/.agents/skills/orchestrate-project/scripts/gate-run.sh`.

- `fast`: `prettier --check .`, `eslint --max-warnings=0`, `tsc --noEmit`, `bun run validate`. No network, no database.
- `full`: `fast` plus `next build` against the dev database (`DATABASE_URL=$DATABASE_URL_DEV`, Sentry upload disabled). Runs after every merge on the integration branch.

## Safety rules for every task

- `DATABASE_URL` in `.env.local` is the production database. No task writes to any database: no `sync:models` without `--dry-run`, no `db:migrate`, no `db:push`, no `promote:prod`, no ad-hoc SQL writes.
- No pushes, no GitHub settings, no Vercel changes, no uploads to external services.
- No new dependencies, formatters, test frameworks or patterns without asking Carlo.

## Tasks

| ID  | Task                                                                                                                                                 | Depends on     | Model / effort      | Status  | Branch                    | Last gate |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------- | ------- | ------------------------- | --------- |
| T1  | Repair model sync: price plausibility, Berget units, per-row failure isolation, failures surfaced to Sentry and HTTP status, cron route fails closed | —              | Opus 5.5 / high     | queued  | `overhaul/t1-sync`        | —         |
| T2  | Pipeline: drop dev→prod promote, CI hardening, self-hosted Renovate config                                                                           | —              | Opus 5.5 / medium   | queued  | `overhaul/t2-pipeline`    | —         |
| T4  | Honest verification label (`ai_draft`) and provider pruning (separate commit)                                                                        | —              | Sonnet 5.5 / high   | queued  | `overhaul/t4-label`       | —         |
| T7  | Design spike round 1 (four directions, picker page, outside the repo)                                                                                | —              | Opus 5.5 / high     | queued  | —                         | n/a       |
| T6  | Sync data correctness: OpenRouter prefix→provider mapping, Bedrock price seeds                                                                       | T1             | Opus 5.5 / high     | blocked | `overhaul/t6-sync-data`   | —         |
| T5a | UI code cleanup: dead code, shared primitives and format helpers, presets in `lib/compliance`                                                        | T4             | Sonnet 5.5 / high   | blocked | `overhaul/t5a-primitives` | —         |
| T5b | Data loading: client-side search without server round-trip per keystroke, caching with revalidation after sync                                       | T1, T5a        | Opus 5.5 / high     | blocked | `overhaul/t5b-loading`    | —         |
| T5c | i18n gaps and accessibility of table, filters and nav                                                                                                | T5b            | Sonnet 5.5 / medium | blocked | `overhaul/t5c-i18n-a11y`  | —         |
| T3  | Docs: README, AGENTS.md, new `docs/ARCHITECTURE.md`, delete `docs/PLAN.md`, trim `docs/DESIGN.md`                                                    | all code tasks | Sonnet 5.5 / medium | blocked | `overhaul/t3-docs`        | —         |
| T8  | Delete this file, final full gate, push, open PR (orchestrator)                                                                                      | all            | —                   | blocked | —                         | —         |

## Why this cut

- T1, T2, T4 touch disjoint files (sync and cron route / workflows, package.json and env example / components, messages and provider JSON) and run in parallel.
- T6 edits the sync adapters T1 restructures, so it waits for T1.
- T5a–T5c all edit the same components and pages; they run in sequence after T4, and T5b additionally needs T1's cron route for revalidation.
- T3 describes the final state, so it runs last.
- T7 produces standalone HTML outside the repository and blocks nothing.

## Open items for Carlo

- Renovate: add `RENOVATE_APP_ID` and `RENOVATE_APP_PRIVATE_KEY`, install the `ca-renovatebot` app for this repo, re-enable the disabled workflow, close PR #2.
- Delete the now unused `DATABASE_URL_DEV` GitHub secret after T2 is deployed.
- Review the provider pruning commit from T4.
- Pick a design direction from T7.
