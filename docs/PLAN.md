# GDPR AI Directory - Build Plan

> Status: In progress
> Last updated: 2026-04-09
> Verdict: GO — MVP frontend is next

---

## Overview

A neutral, multi-vendor directory of AI inference providers tagged by GDPR compliance status. Helps EU businesses make defensible model selection decisions.

**Core value proposition:** Structured, sourced, filterable compliance metadata for AI inference providers — not a provider's own marketing, not a law firm's checklist, but a developer-friendly reference.

**Primary user journey (model-first):** A user searches for a model name (e.g. "claude-sonnet-4-6") and sees every provider offering it with pricing, latency, and compliance properties — filterable by their GDPR compliance threshold (e.g. "strict EU only", "no training anywhere", "EU with SCCs").

---

## Decisions Made

| Decision                | Choice                                                                      | Rationale                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Provider scope          | API providers + cloud platforms, tagged separately                          | Cloud platforms (Azure, Bedrock, Vertex) are where EU enterprise AI runs; excluding them leaves a visible gap |
| Hosting                 | Vercel                                                                      | Fastest to ship for MVP; can migrate to EU hosting later if brand signal matters                              |
| Data sourcing           | Hybrid: models.dev import + AI-assisted research + manual verification      | Balances speed with accuracy                                                                                  |
| Compliance scoring      | No automated scores                                                         | Avoids liability; present structured facts, not judgments                                                     |
| Report-a-change backend | GitHub Issues (auto-created from form)                                      | Free, transparent, auditable                                                                                  |
| Licensing               | Split: MIT for code, CC BY-NC-SA 4.0 for data                               | Transparency + credibility without giving away the curated dataset commercially                               |
| Provider compliance     | Flat JSON files in `data/providers/`                                        | Git-auditable, community PR-able, no DB needed for slow-changing compliance metadata                          |
| Model catalog           | Neon (Postgres) via Drizzle ORM                                             | Models change too fast for hand-curation; synced nightly from OpenRouter + EU provider APIs                   |
| Model-first UX          | Search by model name, see all providers offering it with compliance filters | More useful than a raw provider list; mirrors how developers actually think about model selection             |

---

## Data Architecture

### Provider compliance data — flat JSON (git)

Each provider is a JSON file at `data/providers/{slug}.json`. This is the source of truth for compliance metadata. Changes are community-PR-able with git history as audit trail.

**Key fields:** `slug`, `name`, `type`, `compliance.*`, `pricingTier`, `lastVerified`, `verifiedBy`, `sourceUrls`, `notes`

**Note:** The `models` array was removed from provider JSON entirely. Model listings live in the DB to avoid drift.

**Schema:** `data/schema.ts` (Zod) — includes `dataLeavesEuAtInference` on `DataResidencySchema` to distinguish "data stored in EU" from "inference compute runs in EU".

### Model catalog — Neon (Postgres) via Drizzle

Models change too fast for hand-curated files. The DB is synced nightly.

**Table: `models`**
- Composite PK: `(id, provider_slug)` — same model at different providers = separate rows
- Fields: `id`, `provider_slug`, `name`, `modality`, `context_length`, `input_price`, `output_price`, `is_free`, `raw`

**Table: `sync_log`** — tracks nightly sync runs

**Sync strategy:** OpenRouter `/api/v1/models` first (covers ~300 models), then per-provider APIs for EU-native providers not on OpenRouter (Berget, Stackit, Aleph Alpha, OVHcloud, Scaleway, SAP AI Core).

---

## Compliance Filter Profiles

Client-side, URL params, no account needed:

| Profile              | Conditions                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Strict EU            | `euOnly=true` AND `dataLeavesEuAtInference=false` AND `dpa.available=true`                  |
| EU with SCCs         | `dpa.available=true` AND `sccs=true` AND `trainsOnCustomerData=false`                       |
| No training anywhere | `trainsOnCustomerData=false` AND `optOutAvailable=false`                                    |
| Custom               | User toggles individual boolean fields                                                      |

---

## Project Structure

```
gdpr-ai-directory/
├── data/
│   ├── providers/                     # JSON compliance files per provider (111 total)
│   │   ├── openai.json
│   │   ├── anthropic.json
│   │   └── ...
│   └── schema.ts                      # Zod schemas for provider JSON
├── scripts/
│   ├── import-models-dev.ts           # Seeds provider identity stubs from models.dev
│   ├── sync-models.ts                 # CLI wrapper: run nightly model sync manually
│   └── validate-data.ts              # CI: validate all provider JSONs against schema
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Homepage: model search + compliance filter
│   │   ├── model/
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Model detail: all providers, pricing, compliance
│   │   ├── provider/
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # Provider profile: compliance deep-dive
│   │   └── api/
│   │       └── cron/
│   │           └── sync-models/
│   │               └── route.ts       # Vercel Cron handler (nightly sync)
│   ├── db/
│   │   └── schema.ts                  # Drizzle schema (models + sync_log tables)
│   └── lib/
│       ├── db.ts                      # Neon/Drizzle client
│       ├── models.ts                  # DB query helpers
│       ├── providers.ts               # Provider JSON loading utilities
│       └── sync/
│           └── run.ts                 # Sync logic (OpenRouter + EU adapters)
├── drizzle/                           # Generated migration SQL (do not hand-edit)
├── .github/
│   └── ISSUE_TEMPLATE/
│       └── report-change.yml          # Structured GitHub issue form for reports
├── docs/
│   ├── IDEA.md
│   └── PLAN.md
├── public/
│   └── logos/                         # Provider SVG logos
├── drizzle.config.ts
├── vercel.json                        # Cron schedule (0 2 * * *)
├── next.config.ts                     # serverExternalPackages for Neon
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Validation:** Zod (provider data schema)
- **Provider data:** Flat JSON files, loaded at build time via `fs` in server components
- **Model catalog:** Neon (Postgres) via Drizzle ORM
- **Deployment:** Vercel
- **Reports:** GitHub Issue Forms (no backend required)

---

## Report-a-Change Feature

### User Flow

1. User clicks "Report a change" on a provider page
2. Link opens the GitHub issue form with the provider slug pre-filled
3. User fills in: provider, change type, details, source URL (required)
4. Submits — creates a labeled GitHub Issue directly

### Technical Implementation

- **No backend required.** Handled entirely by GitHub Issue Forms.
- Issue template: `.github/ISSUE_TEMPLATE/report-change.yml`
- Auto-labeled: `report`, `unverified`
- GitHub account required — natural spam filter

---

## Build Phases

### Phase 0: Data Foundation — COMPLETE ✅

1. ✅ Project setup (Next.js 16, TypeScript, Tailwind, Zod)
2. ✅ JSON schema defined (`data/schema.ts`) — removed `models` field, added `dataLeavesEuAtInference`
3. ✅ `scripts/import-models-dev.ts` — seeds provider identity stubs from models.dev
4. ✅ `scripts/validate-data.ts` — validates all provider JSONs against schema
5. ✅ 111 provider JSON files created and updated to current schema
6. ✅ Flat repo structure (collapsed from earlier monorepo layout)

### Phase 1: Model Catalog + Sync — COMPLETE ✅

1. ✅ Drizzle ORM installed and configured (`drizzle.config.ts`)
2. ✅ DB schema at `src/db/schema.ts` — `models` table (composite PK `id + provider_slug`), `sync_log` table
3. ✅ Migration SQL generated in `drizzle/`
4. ✅ Neon/Drizzle client at `src/lib/db.ts`
5. ✅ Query helpers at `src/lib/models.ts`
6. ✅ Sync logic at `src/lib/sync/run.ts` (OpenRouter + EU provider adapters)
7. ✅ Vercel Cron route at `src/app/api/cron/sync-models/route.ts`
8. ✅ `vercel.json` with cron schedule (`0 2 * * *`)
9. ✅ `scripts/sync-models.ts` — CLI wrapper for manual sync
10. ✅ `.env.local.example` with `DATABASE_URL` and `CRON_SECRET`
11. ✅ Run `bun db:migrate` against Neon — complete
12. ✅ Run `bun sync:models` — model catalog populated successfully

### Phase 2: MVP Frontend — NEXT ⬅️

> Goal: Ship a publicly accessible, model-first directory with compliance filtering

1. **Homepage** (`src/app/page.tsx`)
   - Model search: text input, filters by compliance profile (preset buttons + custom toggles)
   - Results: model name, provider, pricing, key compliance signals (EU-only, DPA, trains on data)
   - Compliance filter profiles as URL params (shareable links)
   - Sort: by price, by compliance strictness, by provider name

2. **Model detail page** (`src/app/model/[id]/page.tsx`)
   - List of all providers offering this model
   - Per-provider: pricing, latency (if available), compliance snapshot
   - Compliance filter applies inline
   - Link to full provider profile

3. **Provider profile page** (`src/app/provider/[slug]/page.tsx`)
   - Full compliance profile with all fields
   - Source URLs for each claim
   - Plain-language notes
   - "Last verified" date prominently displayed
   - "Report a change" button

4. **Shared components**
   - `ComplianceBadges.tsx` — visual indicators (EU-only, DPA, SCCs, etc.)
   - `FilterBar.tsx` — compliance filter preset buttons + custom toggle panel
   - `ModelTable.tsx` — searchable/filterable model listing
   - `ProviderCard.tsx` — compliance summary card

5. **SEO fundamentals**
   - Meta titles/descriptions per page
   - JSON-LD structured data (Dataset, Organization per provider)
   - Sitemap generation
   - Target queries: "GDPR AI provider", "EU AI inference GDPR", "{provider} GDPR compliant", "EU alternative to {provider}", "{model name} GDPR"

6. **Deploy to Vercel** — connect `DATABASE_URL` and `CRON_SECRET` env vars

### Phase 3: Growth (post-launch, based on traction)

- Side-by-side provider comparison (`/compare?providers=openai,mistral`)
- Editorial content: "GDPR guide for {provider}" articles
- EU-native provider sync adapters (Berget, Stackit, Aleph Alpha, OVHcloud, Scaleway, SAP AI Core)
- OpenRouter provider slug mapping table (maps OpenRouter IDs → our `provider_slug` values)
- Email digest: compliance status change notifications
- Provider self-submission and verification flow
- Embedded compliance badge widget
- API access to compliance data (potential monetization)

### Phase 4: Gateway (separate scope, contingent on demand)

- EU-routing proxy API
- Requires: EU infrastructure, signed DPAs with upstream providers, legal review
- Do not build until directory demonstrates clear demand

---

## SEO Strategy (MVP)

### Target Keywords

- "GDPR AI provider"
- "EU AI inference GDPR compliant"
- "GDPR compliant LLM API"
- "{provider name} GDPR" (per-provider pages)
- "{model name} GDPR" (per-model pages — new with model-first architecture)
- "EU alternative to OpenAI / Anthropic / etc."
- "AI vendor GDPR DPA"
- "EU AI Act inference provider"

### Content Structure

- Each provider page is a long-tail SEO page
- Each model page is a long-tail SEO page (new)
- Homepage targets the broad "GDPR AI directory" query
- Structured data (JSON-LD: Dataset, Organization per provider)
- Canonical URLs, proper meta tags, Open Graph images

---

## Monetization Path (Staged)

| Stage       | Mechanism                                              | When                         |
| ----------- | ------------------------------------------------------ | ---------------------------- |
| Near-term   | Lead-gen for freelance consulting                      | From day 1                   |
| Near-term   | Portfolio/authority signal                             | From day 1                   |
| Medium-term | Provider verification badge program                    | When directory has traffic   |
| Medium-term | Consulting upsell ("Need help evaluating AI vendors?") | When inbound interest exists |
| Long-term   | API access to compliance data                          | When data is comprehensive   |
| Long-term   | Newsletter / compliance digest                         | When audience is built       |

---

## Key Risks and Mitigations

| Risk                             | Impact                                      | Mitigation                                                                               |
| -------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Data staleness                   | High — undermines core value                | "Last verified" dates, report-a-change flow, community corrections                       |
| Low organic discovery            | Medium — limits growth                      | SEO-first content structure, share in EU dev communities                                 |
| Provider claims change silently  | High — data becomes wrong                   | Report-a-change flow, periodic manual review cycle (quarterly)                           |
| Liability from compliance claims | High — legal exposure                       | Present facts, not judgments; no automated scoring; clear disclaimers; source everything |
| Someone forks the data           | Low — CC BY-NC-SA prevents commercial reuse | Split license protects commercial value while maintaining transparency                   |
| Model catalog drift              | Medium — DB out of sync with reality        | Nightly cron sync; sync_log table for observability                                      |

---

## Disclaimer (for the site)

Include on every page:

> This directory provides structured, sourced information about AI inference providers' data processing practices. It is not legal advice. Each entry reflects publicly available information as of the "last verified" date shown. Always verify current terms directly with the provider and consult legal counsel for compliance decisions.

---

## Next Step

**Phase 2: MVP Frontend.** Start with the homepage model search UI, then model detail page, then provider profile page.
