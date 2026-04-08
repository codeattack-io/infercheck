# Project: GDPR AI Directory

A neutral, multi-vendor directory of AI inference providers tagged by GDPR compliance status. Helps EU businesses make defensible model selection decisions.

**Full idea:** `docs/IDEA.md`
**Build plan:** `docs/PLAN.md`

## Key facts (read before writing any code)

- **Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Zod, Drizzle ORM
- **Structure:** Single Next.js project at repo root — no monorepo, no `app/` subdirectory
- **Compliance data:** Flat JSON files in `data/providers/{slug}.json` — git-auditable, community PR-able
- **Model catalog:** Neon (Postgres) via Drizzle ORM — synced nightly by `scripts/sync-models.ts` / Vercel Cron
- **Key dirs:** `src/app/` (Next.js App Router), `src/lib/` (shared utilities), `src/db/` (Drizzle schema), `data/` (provider JSON), `scripts/` (Bun CLI scripts), `drizzle/` (migrations)
- **Deployment:** Vercel

## Git workflow

After completing any task, commit all changes with a descriptive message:

```
git add -A && git commit -m "<type>: <short description>"
```

Use conventional commit types: `feat`, `fix`, `chore`, `docs`, `refactor`, `data`.

## This is NOT the Next.js you know

This version (16) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
