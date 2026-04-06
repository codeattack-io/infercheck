# GDPR AI Directory - Build Plan

> Status: Approved for implementation
> Date: 2026-04-06
> Verdict: GO — build the MVP

---

## Overview

A neutral, multi-vendor directory of AI inference providers tagged by GDPR compliance status. Helps EU businesses make defensible model selection decisions.

**Core value proposition:** Structured, sourced, filterable compliance metadata for AI inference providers — not a provider's own marketing, not a law firm's checklist, but a developer-friendly reference.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Provider scope | API providers + cloud platforms, tagged separately | Cloud platforms (Azure, Bedrock, Vertex) are where EU enterprise AI runs; excluding them leaves a visible gap |
| Hosting | Vercel | Fastest to ship for MVP; can migrate to EU hosting later if brand signal matters |
| Data sourcing | Hybrid: models.dev import + AI-assisted research + manual verification | Balances speed with accuracy |
| Compliance scoring | No automated scores | Avoids liability; present structured facts, not judgments |
| Report-a-change backend | GitHub Issues (auto-created from form) | Free, transparent, auditable |
| Licensing | Split: MIT for code, CC BY-NC-SA 4.0 for data | Transparency + credibility without giving away the curated dataset commercially |
| Database | None — flat JSON files in repo | Sufficient for MVP, easy to audit and version-track |

---

## Data Schema: Provider Compliance Profile

Each provider is a JSON file at `data/providers/{slug}.json`.

```json
{
  "slug": "openai",
  "name": "OpenAI",
  "type": "api_provider",
  "website": "https://openai.com",
  "apiDocsUrl": "https://platform.openai.com/docs",
  "logoPath": "/logos/openai.svg",

  "compliance": {
    "headquarters": "US",
    "dataResidency": {
      "regions": ["US", "EU"],
      "euOnly": false,
      "euRegionDetails": "Available via Azure OpenAI (Sweden Central, Germany West Central)"
    },
    "dpa": {
      "available": true,
      "url": "https://openai.com/policies/data-processing-addendum",
      "signedVia": "online_acceptance"
    },
    "dataUsage": {
      "trainsOnCustomerData": false,
      "optOutAvailable": true,
      "retentionPolicy": "30 days for abuse monitoring, then deleted",
      "details": "API data not used for training by default since March 2023"
    },
    "subProcessors": {
      "disclosed": true,
      "url": "https://openai.com/policies/sub-processors",
      "includesEuEntities": false
    },
    "certifications": ["SOC2"],
    "euAiAct": {
      "status": "monitoring",
      "details": "No public EU AI Act compliance statement yet"
    },
    "sccs": true,
    "adequacyDecision": false
  },

  "models": ["GPT-4o", "GPT-4.1", "o3", "o4-mini"],
  "pricingTier": "pay_per_use",
  "lastVerified": "2026-04-06",
  "verifiedBy": "carlo",
  "sourceUrls": [
    "https://openai.com/policies/data-processing-addendum",
    "https://openai.com/policies/privacy-policy"
  ],
  "notes": "EU data residency only available through Azure OpenAI, not direct API."
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `slug` | string | URL-safe identifier, matches filename |
| `name` | string | Display name |
| `type` | enum | `"api_provider"` \| `"cloud_platform"` \| `"gateway"` |
| `website` | string | Provider homepage URL |
| `apiDocsUrl` | string | API documentation URL |
| `logoPath` | string | Path to SVG logo in `/public/logos/` |
| `compliance.headquarters` | string | ISO 3166-1 alpha-2 country code |
| `compliance.dataResidency.regions` | string[] | ISO country/region codes where data can be processed |
| `compliance.dataResidency.euOnly` | boolean | Can the provider guarantee EU-only data processing? |
| `compliance.dataResidency.euRegionDetails` | string | Plain-language explanation of EU routing options |
| `compliance.dpa.available` | boolean | Is a DPA available? |
| `compliance.dpa.url` | string \| null | Link to DPA document |
| `compliance.dpa.signedVia` | enum | `"online_acceptance"` \| `"custom_contract"` \| `"not_available"` |
| `compliance.dataUsage.trainsOnCustomerData` | boolean | Does provider train on API customer data? |
| `compliance.dataUsage.optOutAvailable` | boolean | Can customers opt out of data usage? |
| `compliance.dataUsage.retentionPolicy` | string | Plain-language retention summary |
| `compliance.dataUsage.details` | string | Additional context |
| `compliance.subProcessors.disclosed` | boolean | Is the sub-processor list public? |
| `compliance.subProcessors.url` | string \| null | Link to sub-processor list |
| `compliance.subProcessors.includesEuEntities` | boolean | Are any sub-processors EU-based? |
| `compliance.certifications` | string[] | `"SOC2"` \| `"ISO27001"` \| `"ISO27701"` \| `"C5"` \| `"HDS"` etc. |
| `compliance.euAiAct.status` | enum | `"compliant"` \| `"monitoring"` \| `"unknown"` \| `"not_applicable"` |
| `compliance.euAiAct.details` | string | Plain-language summary |
| `compliance.sccs` | boolean | Standard Contractual Clauses in place? |
| `compliance.adequacyDecision` | boolean | Provider HQ country has EU adequacy decision? |
| `models` | string[] | Key models available (not exhaustive) |
| `pricingTier` | enum | `"free_tier"` \| `"pay_per_use"` \| `"enterprise_only"` |
| `lastVerified` | string | ISO date of last verification |
| `verifiedBy` | string | Who verified this entry |
| `sourceUrls` | string[] | Evidence trail: links to source documents |
| `notes` | string | Plain-language editorial notes |

---

## Data Sourcing Strategy

### Layer 1: Import from models.dev

The [models.dev GitHub repo](https://github.com/anomalyco/models.dev/tree/dev/providers) contains ~90 provider directories, each with:
- `provider.toml` — fields: `name`, `env`, `npm`, `api`, `doc`
- `logo.svg` — provider logo
- `models/` — individual model TOML files

**Import script** (`scripts/import-models-dev.ts`):
1. Clone or fetch the `providers/` directory from the models.dev repo (dev branch)
2. Parse each `provider.toml` to extract: name, API URL, docs URL
3. Copy logos to `public/logos/`
4. Generate stub JSON files with identity fields populated, compliance fields set to null/unknown
5. Output: ~90 stub files in `data/providers/`

This gives us the seed list. No compliance data yet — just identity + logos + documentation links.

### Layer 2: AI-Assisted Research

For each provider in the MVP priority list:
1. Use the `apiDocsUrl` and known privacy/legal page patterns to locate:
   - Privacy policy
   - DPA / data processing addendum
   - Sub-processor list
   - Trust center / security page
   - EU AI Act statement (if any)
2. AI drafts the compliance profile by analyzing these documents
3. Output: draft JSON files, flagged as `"verifiedBy": "ai_draft"`

### Layer 3: Manual Verification

For each AI-drafted profile:
1. Review against the actual source documents
2. Verify all claims, fix inaccuracies
3. Add `sourceUrls` with direct links to evidence
4. Write plain-language `notes` and `details` fields
5. Update `verifiedBy` to `"carlo"` and set `lastVerified` date

### Layer 4: Community Corrections (Ongoing)

- "Report a change" form on each provider page
- Submits create GitHub Issues automatically
- Review, verify, and update the JSON file

---

## MVP Provider List (~20-25)

### API Providers

| Provider | HQ | Why include |
|---|---|---|
| OpenAI | US | Most widely used, complex GDPR story |
| Anthropic | US | Major alternative, growing EU adoption |
| Mistral | France | EU-native, strong GDPR positioning |
| Cohere | Canada | Enterprise focus, DPA available |
| Groq | US | Fast inference, popular with devs |
| Together AI | US | Open-model inference, popular |
| Scaleway | France | EU-native cloud + generative APIs |
| Nebius | Netherlands | EU infrastructure, growing fast |
| Aleph Alpha | Germany | German sovereign AI, B2G |
| OVHcloud | France | EU cloud with AI APIs |
| Fireworks AI | US | Popular for open models |
| DeepInfra | US | Open-model hosting |
| DeepSeek | China | Important for completeness, complex compliance |
| Hugging Face | US/France | Inference endpoints, dual presence |
| Perplexity | US | Growing usage as search + inference |
| Berget | Sweden | EU-native, privacy-focused |
| Stackit | Germany | Schwarz Group (Lidl), sovereign cloud |

### Cloud Platforms

| Provider | HQ | Why include |
|---|---|---|
| Azure OpenAI | US (Microsoft) | EU region deployments, enterprise standard |
| AWS Bedrock | US (Amazon) | EU region deployments, major cloud |
| Google Vertex AI | US (Google) | EU region deployments, major cloud |
| SAP AI Core | Germany | Enterprise, native EU compliance |

### Gateways

| Provider | HQ | Why include |
|---|---|---|
| OpenRouter | US | Popular gateway, no EU routing — illustrates the gap |

---

## Project Structure

```
gdpr-ai-directory/
├── data/
│   ├── providers/                  # JSON files per provider (source of truth)
│   │   ├── openai.json
│   │   ├── anthropic.json
│   │   └── ...
│   └── schema.ts                   # TypeScript types + Zod validation
├── scripts/
│   ├── import-models-dev.ts        # Seed: parse models.dev TOML -> stub JSON
│   └── validate-data.ts            # CI: validate all JSONs against schema
├── src/
│   └── app/                        # Next.js App Router
│       ├── layout.tsx              # Root layout
│       ├── page.tsx                # Homepage: filterable directory table
│       ├── provider/
│       │   └── [slug]/
│       │       └── page.tsx        # Provider compliance profile page
│       ├── compare/
│       │   └── page.tsx            # Side-by-side comparison (v1.1)
│       ├── report/
│       │   └── page.tsx            # "Report a change" form page
│       └── api/
│           └── report/
│               └── route.ts        # POST: create GitHub Issue from report
├── components/
│   ├── ProviderTable.tsx           # Filterable/sortable directory table
│   ├── ComplianceBadges.tsx        # Visual compliance indicators
│   ├── FilterBar.tsx               # Filter controls (type, residency, DPA, etc.)
│   ├── ProviderCard.tsx            # Detail card for profile page
│   └── ReportChangeForm.tsx        # User feedback form
├── lib/
│   ├── providers.ts                # Data loading utilities
│   └── github.ts                   # GitHub Issues API client for reports
├── docs/
│   ├── IDEA.md                     # Original idea document
│   └── PLAN.md                     # Copy of this plan (for easy reference)
├── public/
│   └── logos/                      # Provider SVG logos
├── LICENSE                         # MIT for code
├── LICENSE-DATA                    # CC BY-NC-SA 4.0 for data/providers/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Validation:** Zod (for provider data schema)
- **Data:** Static JSON files, loaded at build time via `fs` in server components
- **Deployment:** Vercel
- **Reports:** GitHub Issues API (via `@octokit/rest` or direct fetch)

---

## Report-a-Change Feature

### User Flow

1. User clicks "Something changed?" on a provider page
2. Form pre-fills provider name
3. User selects change category: DPA terms, data residency, pricing, certifications, other
4. User adds details (textarea) and optional source URL
5. User optionally provides email for follow-up
6. Submit -> API route creates a GitHub Issue with structured labels

### Technical Implementation

- Form component: `ReportChangeForm.tsx`
- API route: `src/app/api/report/route.ts`
- Uses GitHub API to create an issue in the repo
- Issue is labeled: `provider:{slug}`, `report`, `unverified`
- Rate limiting: basic (IP-based or honeypot) to prevent spam

---

## Build Phases

### Phase 0: Data Foundation

> Goal: Have verified compliance data for 20+ providers before writing any UI

1. Set up the project (Next.js, TypeScript, Tailwind, Zod)
2. Define the JSON schema and TypeScript types in `data/schema.ts`
3. Write `scripts/import-models-dev.ts` — import seed data from models.dev repo
4. Copy provider logos to `public/logos/`
5. Write `scripts/validate-data.ts` — validate all provider JSONs against schema
6. Curate the MVP provider list (~20-25 from the full import)
7. AI-assisted drafting of compliance profiles for MVP providers
8. Manual verification pass for all MVP providers
9. Add LICENSE (MIT) and LICENSE-DATA (CC BY-NC-SA 4.0)

### Phase 1: MVP Site

> Goal: Ship a publicly accessible directory with filterable table and provider profiles

1. Homepage: filterable directory table
   - Columns: provider name, type, HQ, EU-only, DPA, trains on data, certifications, last verified
   - Filters: type (API/cloud/gateway), EU-only routing, DPA available, data residency region
   - Sort: by name, by last verified date
2. Provider detail page (`/provider/[slug]`)
   - Full compliance profile with all fields
   - Source URLs for verification
   - Plain-language notes
   - "Last verified" date prominently displayed
   - "Report a change" button
3. Report-a-change form + GitHub Issues API integration
4. SEO fundamentals
   - Meta titles/descriptions per page
   - Structured data (JSON-LD) for each provider
   - Sitemap generation
   - Target queries: "GDPR AI provider", "EU AI inference GDPR", "{provider} GDPR compliant", "EU alternative to {provider}"
5. Deploy to Vercel

### Phase 2: Growth (post-launch, based on traction)

- Side-by-side comparison view (`/compare?providers=openai,mistral`)
- Editorial content: "GDPR guide for {provider}" articles
- Email digest: compliance status change notifications
- Provider self-submission and verification flow
- Embedded compliance badge widget
- API access to compliance data (potential monetization)

### Phase 3: Gateway (separate scope, contingent on demand)

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
- "EU alternative to OpenAI / Anthropic / etc."
- "AI vendor GDPR DPA"
- "EU AI Act inference provider"

### Content Structure

- Each provider page is a long-tail SEO page
- Homepage targets the broad "GDPR AI directory" query
- Structured data (JSON-LD: Dataset, Organization per provider)
- Canonical URLs, proper meta tags, Open Graph images

---

## Monetization Path (Staged)

| Stage | Mechanism | When |
|---|---|---|
| Near-term | Lead-gen for freelance consulting | From day 1 |
| Near-term | Portfolio/authority signal | From day 1 |
| Medium-term | Provider verification badge program | When directory has traffic |
| Medium-term | Consulting upsell ("Need help evaluating AI vendors?") | When inbound interest exists |
| Long-term | API access to compliance data | When data is comprehensive |
| Long-term | Newsletter / compliance digest | When audience is built |

---

## Key Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Data staleness | High — undermines core value | "Last verified" dates, report-a-change flow, community corrections |
| Low organic discovery | Medium — limits growth | SEO-first content structure, share in EU dev communities |
| Provider claims change silently | High — data becomes wrong | Report-a-change flow, periodic manual review cycle (quarterly) |
| Liability from compliance claims | High — legal exposure | Present facts, not judgments; no automated scoring; clear disclaimers; source everything |
| Someone forks the data | Low — CC BY-NC-SA prevents commercial reuse | Split license protects commercial value while maintaining transparency |

---

## Disclaimer (for the site)

Include on every page:

> This directory provides structured, sourced information about AI inference providers' data processing practices. It is not legal advice. Each entry reflects publicly available information as of the "last verified" date shown. Always verify current terms directly with the provider and consult legal counsel for compliance decisions.

---

## Next Step

Start a new session and begin Phase 0: data foundation.
