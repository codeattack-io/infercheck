# GDPR AI Directory - Build Plan

> Status: In progress
> Last updated: 2026-04-10
> Verdict: GO — Phase 2 homepage complete, model/provider pages next

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

### Phase 2: MVP Frontend — IN PROGRESS 🔨

> Goal: Ship a publicly accessible, model-first directory with compliance filtering
> Last updated: 2026-04-10

1. **Homepage** (`src/app/page.tsx`) ✅
   - ✅ Model table: model name, provider, compliance badges, data residency, pricing, last verified
   - ✅ Inline row expand (accordion) — compliance snapshot + EU routing detail, no modal
   - ✅ Compliance filter presets (Strict EU / EU + SCCs / No Training) + custom toggle panel
   - ✅ Filter state fully persisted in URL params (shareable links)
   - ✅ Real-time client-side search (no submit, filters by model name / provider)
   - ✅ Dim-not-remove for filtered-out rows
   - ✅ "Full provider profile →" button in expand panel
   - ⬜ Sort: by price, by compliance strictness, by provider name

2. **Model detail page** (`src/app/model/[id]/page.tsx`) ⬜
   - List of all providers offering this model
   - Per-provider: pricing, latency (if available), compliance snapshot
   - Compliance filter applies inline
   - Link to full provider profile

3. **Provider profile page** (`src/app/provider/[slug]/page.tsx`) ⬜
   - Full compliance profile with all fields
   - Source URLs for each claim
   - Plain-language notes
   - "Last verified" date prominently displayed
   - "Report a change" button

4. **Shared components** ✅
   - ✅ `ComplianceBadge.tsx` — atomic compliance signal badge (7 variants)
   - ✅ `ComplianceBadges.tsx` — badge cluster for a provider
   - ✅ `FilterBar.tsx` — compliance filter preset buttons + custom toggle panel
   - ✅ `ModelTable.tsx` — searchable/filterable model listing
   - ✅ `ModelRow.tsx` — single row with inline expand
   - ✅ `Nav.tsx` — sticky header, scroll-border, mobile drawer
   - ✅ `DisclaimerBanner.tsx` — sitewide disclaimer
   - ⬜ `ProviderCard.tsx` — compliance summary card (needed for provider listing page)

5. **Infrastructure / design system** ✅
   - ✅ `src/lib/compliance.ts` — pure filter/tier logic, client+server safe
   - ✅ `src/lib/providers.ts` — `server-only` file-system JSON loading
   - ✅ `globals.css` — Tailwind v4 `@theme` block with full design token set
   - ✅ `layout.tsx` — `next/font/google` (Instrument Serif, DM Sans, IBM Plex Mono)
   - ✅ i18n comment in layout noting `[locale]` + `NextIntlClientProvider` insertion point

6. **SEO fundamentals** ⬜
   - ✅ Meta title template (`%s — GDPR AI Directory`) and default description
   - ⬜ JSON-LD structured data (Dataset on homepage, Organization per provider)
   - ⬜ Sitemap generation
   - ⬜ Per-page Open Graph metadata

7. **Deploy to Vercel** ⬜ — connect `DATABASE_URL` and `CRON_SECRET` env vars

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

## Phase 5: German Localisation + Provider Data Research

> Status: Planned
> Last updated: 2026-04-12

### Goal

Two parallel workstreams:
1. **i18n infrastructure** — add German (`de`) as a fully supported locale with URL-prefix routing (`/en/`, `/de/`), translated UI strings, and locale-aware free-text fields in provider JSON.
2. **Data scripts** — LLM-powered scripts to (a) research and fill in the 89 stub providers with real compliance data, and (b) translate free-text provider fields to German.

### Key architectural decisions

| Decision | Choice | Rationale |
|---|---|---|
| i18n library | `next-intl` v4 (already installed) | Already wired; v4 has first-class App Router support |
| Locale routing | URL-prefix `always` (`/en/`, `/de/`) | SEO-clean, shareable links, symmetric |
| Middleware file | `src/proxy.ts` (not `middleware.ts`) | Next.js 16 renamed the convention |
| Default locale | `en` | English is canonical; German is additive |
| N-locale architecture | `z.record(z.string(), TranslationSchema)` | Key = locale code; adding `fr`, `nl` etc. requires no schema change |
| Provider content translation | Separate script from research | Research requires web search + factual accuracy focus; translation is pure transformation — mixing them degrades both |
| LLM for scripts | `gpt-4.5` via Vercel AI SDK (`ai` + `@ai-sdk/openai`) | Easy model swapping; web search via OpenAI built-in tool |
| Concurrency | `p-queue`, default 30 parallel, configurable via `--concurrency` | Rate limits are comfortable at 30; sequential would take ~45 min |
| Translation quality | LLM rewrite (not raw machine translate) | GDPR legal terminology requires precise German terms (Standardvertragsklauseln, Auftragsverarbeiter, etc.) |

### Workstream 1: i18n Infrastructure

**Files to create/modify:**

| Action | File | Notes |
|---|---|---|
| Update | `data/schema.ts` | Add `ProviderTranslationSchema` + optional `translations` field to both schemas |
| Create | `src/i18n/routing.ts` | `defineRouting({ locales: ['en','de'], defaultLocale: 'en', localePrefix: 'always' })` |
| Update | `src/i18n/request.ts` | Dynamic locale from `requestLocale` (was hardcoded `"en"`) |
| Create | `src/i18n/navigation.ts` | `createNavigation(routing)` — locale-aware `Link`, `redirect`, `useRouter`, `usePathname` |
| Create | `src/proxy.ts` | `createMiddleware(routing)` — Next.js 16 proxy (replaces old `middleware.ts`) |
| Move + update | `src/app/layout.tsx` → `src/app/[locale]/layout.tsx` | Add `generateStaticParams`, `setRequestLocale`, `await params`, dynamic `lang` attr |
| Move | `src/app/page.tsx` → `src/app/[locale]/page.tsx` | |
| Move | `src/app/about/page.tsx` → `src/app/[locale]/about/page.tsx` | |
| Move | `src/app/providers/page.tsx` → `src/app/[locale]/providers/page.tsx` | |
| Move | `src/app/provider/[slug]/page.tsx` → `src/app/[locale]/provider/[slug]/page.tsx` | |
| Move | `src/app/model/[id]/page.tsx` → `src/app/[locale]/model/[id]/page.tsx` | |
| Update | `src/app/sitemap.ts` | Emit hreflang alternates per locale per route |
| Update | All components with `next/link` | Swap to locale-aware `Link` from `@/i18n/navigation` |
| Update | `src/lib/providers.ts` | Add `getLocalizedProvider(provider, locale)` helper |
| Create | `messages/de.json` | Full German translation of all 272 UI strings (13 namespaces) |

**Files that do NOT move:**
- `src/app/api/cron/sync-models/route.ts` — not locale-scoped
- `src/app/globals.css`, `src/app/favicon.ico` — shared assets

**next-intl v4 / Next.js 16 gotchas:**
- `params` in layouts/pages is a `Promise` — must `await params`
- `requestLocale` in `request.ts` is a `Promise` — must `await requestLocale`
- `setRequestLocale(locale)` must be called before any `useTranslations` / `getTranslations` call (enables static rendering)
- No `i18n` key in `next.config.ts` — App Router uses `[locale]` segment only

**Schema addition (`data/schema.ts`):**

```ts
const ProviderTranslationSchema = z.object({
  notes: z.string().nullable().optional(),
  dataResidency: z.object({ euRegionDetails: z.string().nullable().optional() }).optional(),
  dataUsage: z.object({
    retentionPolicy: z.string().nullable().optional(),
    details: z.string().nullable().optional(),
  }).optional(),
  euAiAct: z.object({ details: z.string().nullable().optional() }).optional(),
});
// Added to ProviderSchema and ProviderStubSchema:
translations: z.record(z.string(), ProviderTranslationSchema).optional(),
```

### Workstream 2: Data Scripts

#### `scripts/research-providers.ts`

Researches and fills in stub providers using a web-searching LLM.

**CLI:**
```bash
bun run scripts/research-providers.ts --all                   # all stubs, 30 parallel
bun run scripts/research-providers.ts --provider <slug>       # single provider
bun run scripts/research-providers.ts --all --concurrency 10  # custom concurrency
bun run scripts/research-providers.ts --all --dry-run         # print, don't write
```

**Behaviour:**
- Only processes providers where `verifiedBy === "stub"` (idempotent)
- Uses `p-queue` for concurrency control (default: 30, configurable)
- Calls `generateText()` via Vercel AI SDK (`gpt-4.5` + `webSearchPreview` tool)
- Validates LLM output against `ProviderSchema` with Zod before writing
- On validation failure: writes raw output to `data/providers/_failed/<slug>.json`
- Prints final summary: `✓ N succeeded  ✗ N failed  → N skipped`

**System prompt intent:** "You are a GDPR compliance researcher. Accuracy is critical — this is legal information used by EU companies for procurement decisions. Do not guess or invent. If you cannot verify a fact from a primary source, set the field to `null`. Use web search to find the provider's privacy policy, DPA page, sub-processor list, data residency docs, EU AI Act statement, and certifications. Every non-null field must have a source URL. Set `verifiedBy` to `"ai_draft"` and `lastVerified` to today's date."

**Model:** `gpt-4.5` (via `@ai-sdk/openai`, easy to swap)
**Env:** `OPENAI_API_KEY` from `.env.local`

#### `scripts/translate-providers.ts`

Generates German translations of free-text fields for all fully-verified providers.

**CLI:**
```bash
bun run scripts/translate-providers.ts --all                   # all verified, 30 parallel
bun run scripts/translate-providers.ts --provider <slug>       # single
bun run scripts/translate-providers.ts --all --concurrency 10
bun run scripts/translate-providers.ts --all --force           # re-translate even if de exists
```

**Behaviour:**
- Only processes providers where `verifiedBy !== "stub"`
- Skips providers that already have `translations.de` set (unless `--force`)
- Same `p-queue` concurrency pattern
- Translates: `notes`, `compliance.dataResidency.euRegionDetails`, `compliance.dataUsage.retentionPolicy`, `compliance.dataUsage.details`, `compliance.euAiAct.details`
- Writes into `translations.de` object in each provider JSON
- Uses legally precise German terminology (see prompt for examples)

**Model:** `gpt-4.5` (no web search needed — pure translation)

#### New `package.json` scripts

```json
"research:providers": "bun scripts/research-providers.ts --all",
"research:provider": "bun scripts/research-providers.ts --provider",
"translate:providers": "bun scripts/translate-providers.ts --all",
"translate:provider": "bun scripts/translate-providers.ts --provider"
```

#### New `.env.local.example` key

```
OPENAI_API_KEY=          # Used by research-providers.ts and translate-providers.ts
```

### Execution order

```
1.  data/schema.ts                      ← translations schema (blocks all downstream)
2.  src/i18n/routing.ts                 ← new shared config
3.  src/i18n/request.ts                 ← dynamic locale
4.  src/i18n/navigation.ts              ← locale-aware nav exports
5.  src/proxy.ts                        ← locale middleware
6.  src/app/[locale]/ moves             ← layout + all pages
7.  src/components/ Link updates        ← swap next/link → @/i18n/navigation
8.  src/lib/providers.ts                ← getLocalizedProvider()
9.  messages/de.json                    ← German UI strings
10. src/app/sitemap.ts                  ← hreflang alternates
11. bun add ai @ai-sdk/openai p-queue   ← new deps
12. scripts/research-providers.ts       ← new script
13. scripts/translate-providers.ts      ← new script
14. package.json + .env.local.example   ← script entries + OPENAI_API_KEY
15. bun validate                        ← confirm schema still passes
16. bun build                           ← confirm no TypeScript errors
17. git commit
```

---

## Next Steps

**Phase 2 remaining:** Sort controls on the homepage → model detail page → provider profile page → SEO/JSON-LD → Vercel deploy.

**Phase 5:** See above — German localisation + provider data research scripts.
