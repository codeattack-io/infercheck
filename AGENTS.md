# Project: InferCheck

A neutral, multi-vendor directory of AI inference providers tagged by GDPR compliance status. Helps EU businesses make defensible model selection decisions.

**Architecture:** `docs/ARCHITECTURE.md`
**Design guide:** `docs/DESIGN.md`

## Key facts (read before writing any code)

- **Stack:** Next.js 16 (App Router, `cacheComponents`), TypeScript, Tailwind CSS 4, next-intl, Zod, Drizzle ORM, Bun
- **Structure:** Single Next.js project at repo root — no monorepo, no `app/` subdirectory
- **Compliance data:** Flat JSON files in `data/providers/{slug}.json`, validated by `data/schema.ts` — git-auditable, community PR-able
- **Model catalog:** Neon (Postgres) via Drizzle ORM — synced nightly by Vercel Cron through `/api/cron/sync-models` (`src/lib/sync/`); `scripts/sync-models.ts` runs the same sync from a shell
- **Key dirs:** `src/app/[locale]/` (pages), `src/components/`, `src/lib/` (shared logic, `sync/` pipeline), `src/db/` (Drizzle schema), `src/i18n/` and `messages/` (next-intl), `data/` (provider JSON and schema), `scripts/` (Bun CLI scripts, `gate`), `drizzle/` (migrations)
- **Deployment:** Vercel; pushes to `main` run migrations, then deploy

## Verification

```bash
scripts/gate fast   # prettier --check, eslint --max-warnings=0, tsc --noEmit, bun run validate
bun run build       # needs DATABASE_URL (reads the database for the sitemap and model pages)
```

- `scripts/gate full` runs `fast` and then the build with `DATABASE_URL` taken from `DATABASE_URL_DEV` in `.env.local`; it fails when the build logs `MISSING_MESSAGE`.
- Run `scripts/gate fast` after multi-file changes and before reporting a task done.

## Database safety

`.env.local` may point at the production database. Never run write operations against it: `bun run sync:models` without `--dry-run`, `bun run db:migrate`, `db:push`, or ad-hoc SQL writes. Production migrations run in the deploy workflow. Use `bun run sync:models:dry` to inspect sync output.

## Conventions

- **i18n:** `messages/en.json` and `messages/de.json` keep identical keys. Every user-facing string goes through next-intl; add it to both files.
- **Comments:** Default is none. A comment says what the code does now, never how it got there. The one exception is a single-line `// NOTE:` that names an external constraint (browser bug, API quirk, required ordering) which would make a reader break the code. No section-divider banners.
- **Provider data:** `verifiedBy` stays `ai_draft` for AI-researched entries; set it to a person only when that person checked the entry against its sources. Every entry needs `sourceUrls`.
- **Scripts:** Run package scripts as `bun run <script>`.

## Git workflow

After completing any task, commit all changes with a descriptive message:

```
git add -A && git commit -m "<type>: <short description>"
```

Use conventional commit types: `feat`, `fix`, `chore`, `docs`, `refactor`, `data`.

## Database migrations

Always use the Drizzle CLI to manage migrations. Never create or edit SQL files in `drizzle/` by hand.

```bash
# After changing src/db/schema.ts, generate a new migration:
bun run db:generate

# Apply pending migrations to your own development database:
bun run db:migrate
```

The generated SQL in `drizzle/` is committed to the repo as an audit trail — but it is always produced by `drizzle-kit generate`, never written manually.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
