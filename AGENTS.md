<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Project: GDPR AI Directory

A neutral, multi-vendor directory of AI inference providers tagged by GDPR compliance status. Helps EU businesses make defensible model selection decisions.

**Full idea:** `docs/IDEA.md`
**Build plan:** `docs/PLAN.md`

## Key facts (read before writing any code)

- **Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Zod
- **Data:** Flat JSON files in `data/providers/{slug}.json` — no database
- **Deployment:** Vercel
- **Licensing:** MIT for code, CC BY-NC-SA 4.0 for `data/providers/`

## Current phase

**Phase 0 — Data Foundation** (see `docs/PLAN.md` for full phase breakdown):
1. Project setup (Next.js, TypeScript, Tailwind, Zod)
2. JSON schema + TypeScript types in `data/schema.ts`
3. Import script `scripts/import-models-dev.ts` — seeds stubs from models.dev repo
4. Validate script `scripts/validate-data.ts`
5. AI-assisted compliance drafting → manual verification for ~20–25 MVP providers

**Phase 1** (after data): filterable homepage, provider detail pages, report-a-change form, SEO, Vercel deploy.

## What NOT to do

- No automated compliance scoring (liability risk)
- No legal advice framing — present facts, cite sources
- Do not build the gateway (Phase 3) until the directory has traction
- Do not deviate from the flat-file data model for MVP
