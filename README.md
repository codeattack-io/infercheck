# GDPR AI Directory

**A neutral, multi-vendor directory of AI inference providers tagged by GDPR compliance status.**

Helps EU businesses make defensible model selection decisions — without paying the enterprise tax or spending hours in privacy policies.

---

## The Problem

EU companies building AI features face a recurring, expensive question: **can we legally use this provider?**

The current options are bad:

- Default to IBM/SAP/Azure enterprise tiers because procurement knows the name — and pay a premium not for better models, but for a compliance shortcut.
- Manually review each provider's privacy policy, DPA, sub-processor list, and data processing terms — inconsistently, rarely thoroughly, and again every time something changes.

There is no neutral, structured, up-to-date reference. This directory is that reference.

---

## What It Covers

### Provider compliance data

For each AI inference provider, the directory tracks:

| Field                              | What it answers                                                        |
| ---------------------------------- | ---------------------------------------------------------------------- |
| **Data residency**                 | Where is my data processed? Is EU-only routing available?              |
| **Data leaves EU at inference**    | Does the GPU processing itself happen in the EU, or only storage?      |
| **DPA availability**               | Is there a Data Processing Addendum? How is it signed?                 |
| **Training on customer data**      | Does the provider train models on API traffic?                         |
| **Sub-processors**                 | Are sub-processors disclosed? Are any EU-based?                        |
| **Certifications**                 | SOC 2, ISO 27001, ISO 27701, C5, HDS, etc.                             |
| **EU AI Act status**               | Has the provider addressed GPAI obligations?                           |
| **SCCs / adequacy**                | Standard Contractual Clauses? Adequacy decision for HQ country?        |
| **Last verified**                  | When was this entry last checked against source documents?             |

Every claim links to a source document. No automated scoring, no legal judgments — structured facts with an evidence trail.

### Model catalog

The model catalog answers the question users actually start with: **"I want to use claude-sonnet-4-6 — which providers offer it, at what price, and which of them are compliant for my situation?"**

For each model at each provider, the catalog tracks: pricing (input/output per 1M tokens), context window, modality, and availability. The catalog is synced nightly from OpenRouter and individual provider APIs — it is not stored in the git repository.

---

## Provider Coverage

The directory covers **110+ providers** across three categories:

- **API providers** — OpenAI, Anthropic, Mistral, Cohere, Groq, Together AI, Scaleway, Nebius, Aleph Alpha, DeepSeek, Hugging Face, Fireworks AI, Perplexity, and more
- **Cloud platforms** — Azure OpenAI, AWS Bedrock, Google Vertex AI, SAP AI Core
- **Gateways** — OpenRouter, Cloudflare AI Gateway, Vercel AI Gateway, and others

EU-native providers (Mistral, Scaleway, Berget, Stackit, Aleph Alpha, evroc, CloudFerro) are included alongside major US and Chinese providers for a complete picture.

---

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Validation:** Zod
- **Compliance data:** Flat JSON files in `data/providers/` — git-auditable, community PR-able
- **Model catalog:** Neon (Postgres) via Drizzle ORM — synced nightly, not stored in the repo
- **Deployment:** Vercel

---

## Data Model

### Provider compliance (`data/providers/{slug}.json`)

Each provider is a single JSON file. The schema is defined in [`data/schema.ts`](data/schema.ts) and validated with Zod.

```json
{
  "slug": "openai",
  "name": "OpenAI",
  "type": "api_provider",
  "compliance": {
    "headquarters": "US",
    "dataResidency": {
      "regions": ["US", "EU"],
      "euOnly": false,
      "dataLeavesEuAtInference": false,
      "euRegionDetails": "Available via eu.api.openai.com (EEA + Switzerland). Regional inference (GPU processing in-region) supported."
    },
    "dpa": {
      "available": true,
      "url": "https://openai.com/policies/data-processing-addendum",
      "signedVia": "online_acceptance"
    },
    "dataUsage": {
      "trainsOnCustomerData": false,
      "optOutAvailable": false,
      "retentionPolicy": "API data not used for training by default since March 2023."
    },
    "certifications": ["SOC2", "ISO27001", "ISO27701", "ISO42001"],
    "euAiAct": { "status": "monitoring" },
    "sccs": true,
    "adequacyDecision": false
  },
  "pricingTier": "pay_per_use",
  "lastVerified": "2026-04-07",
  "verifiedBy": "carlo",
  "sourceUrls": ["https://openai.com/policies/data-processing-addendum"]
}
```

### Model catalog (Neon / Postgres)

Models are not stored in the repo — they change too fast. The `models` table holds one row per `(model_id, provider_slug)` pair, e.g. `(anthropic/claude-sonnet-4-6, anthropic)` and `(anthropic/claude-sonnet-4-6, amazon-bedrock)` are separate purchasable options with different compliance properties.

---

## Local Development

**Prerequisites:** [Bun](https://bun.sh) and a [Neon](https://neon.tech) Postgres database.

```bash
# Install dependencies
bun install

# Copy the env template and fill in your DATABASE_URL
cp .env.local.example .env.local

# Apply the database schema (run once, or after schema changes)
bun db:migrate

# Start the development server
bun dev

# Validate all provider JSON files against the schema
bun validate

# Seed new provider stubs from models.dev (identity + logos only)
bun import

# Sync the model catalog into Neon (dry run first)
bun sync:models:dry
bun sync:models
```

### Available scripts

| Script               | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `bun dev`            | Start Next.js development server                               |
| `bun build`          | Production build                                               |
| `bun validate`       | Validate all `data/providers/*.json` against the Zod schema    |
| `bun import`         | Seed new provider stubs from models.dev (logos + identity)     |
| `bun sync:models`    | Sync model catalog into Neon from OpenRouter + provider APIs   |
| `bun sync:models:dry`| Dry-run sync — logs what would be upserted without writing     |
| `bun db:generate`    | Generate Drizzle migration files after schema changes          |
| `bun db:migrate`     | Apply pending migrations to the database                       |
| `bun db:studio`      | Open Drizzle Studio to browse the database                     |

---

## Contributing

### Reporting outdated information

If a provider's compliance terms have changed, [open a Report a Change issue](https://github.com/codeattack-io/gdpr-ai-directory/issues/new?template=report-change.yml). The structured form asks for the provider, change category, details, and a source URL. A GitHub account is required — this keeps submissions accountable and filters noise.

### Submitting a new provider or correction

1. Fork the repository
2. Add or edit a file in `data/providers/`
3. Run `bun validate` to check your JSON against the schema
4. Open a pull request with links to the source documents you used

All entries require source URLs. Compliance claims without an evidence trail will not be merged.

**Note:** The model catalog (pricing, availability, latency) is managed by the nightly sync job and is not part of the provider JSON files. Do not add a `models` field to provider files.

---

## Roadmap

| Phase       | Status      | Description                                                                          |
| ----------- | ----------- | ------------------------------------------------------------------------------------ |
| **Phase 0** | In progress | Data foundation — schema, import scripts, ~20–25 verified providers                  |
| **Phase 1** | Planned     | Model search, filterable provider table, compliance filter profiles, Vercel deploy   |
| **Phase 2** | Future      | Side-by-side comparison, email alerts, provider verification badge program           |
| **Phase 3** | Contingent  | EU-routing proxy API (only if directory demonstrates clear demand)                   |

---

## Disclaimer

This directory provides structured, sourced information about AI inference providers' data processing practices. **It is not legal advice.** Each entry reflects publicly available information as of the "last verified" date shown. Always verify current terms directly with the provider and consult legal counsel for compliance decisions.

---

## License

- **Code** (`src/`, `scripts/`, `data/schema.ts`) — [MIT](LICENSE)
- **Provider data** (`data/providers/`) — [CC BY-NC-SA 4.0](LICENSE-DATA)

The split license keeps the code open and freely reusable while protecting the curated compliance dataset from commercial redistribution without attribution.
