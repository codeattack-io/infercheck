<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/infercheck/horizontal-dark-bg.svg">
  <img src="assets/infercheck/horizontal-color-bg.svg" alt="InferCheck" width="280" height="72">
</picture>

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

| Field                           | What it answers                                                         |
| ------------------------------- | ----------------------------------------------------------------------- |
| **Data residency**              | Where is my data processed? Is EU-only routing available?               |
| **Data leaves EU at inference** | Does the GPU processing itself happen in the EU, or only storage?       |
| **DPA availability**            | Is there a Data Processing Addendum? How is it signed?                  |
| **Training on customer data**   | Does the provider train models on API traffic?                          |
| **Sub-processors**              | Are sub-processors disclosed? Are any EU-based?                         |
| **Certifications**              | SOC 2, ISO 27001, ISO 27701, C5, HDS, etc.                              |
| **EU AI Act status**            | Has the provider addressed GPAI obligations?                            |
| **SCCs / adequacy**             | Standard Contractual Clauses? Adequacy decision for HQ country?         |
| **Notes**                       | Plain-language editorial context not captured by structured fields      |
| **Translations**                | Locale-specific overrides for free-text fields (BCP-47 keys, e.g. "de") |
| **Last verified**               | When was this entry last checked against source documents?              |

Every entry lists the source documents it was researched from. No automated scoring, no legal judgments — structured facts with an evidence trail.

### Verification status

The `verifiedBy` field says who checked an entry:

| Value                   | Meaning                                                                                | Shown on the site as       |
| ----------------------- | -------------------------------------------------------------------------------------- | -------------------------- |
| `ai_draft`              | Researched with AI assistance (`bun run research:providers`), not yet checked manually | "AI draft · date"          |
| a name or GitHub handle | A person checked the entry against the sources on `lastVerified`                       | "Verified date"            |
| `stub`                  | Identity only, no compliance data                                                      | nothing; tier "Unverified" |

Every entry is currently an `ai_draft`. Treat them as a starting point and confirm critical details with the provider.

### Model catalog

The model catalog answers the question users actually start with: **"I want to use claude-sonnet-4-6 — which providers offer it, at what price, and which of them are compliant for my situation?"**

For each model at each provider, the catalog tracks: price per 1M input and output tokens (with its currency), context window, modality, and whether the provider built the model or hosts it for a third party. It is synced nightly from OpenRouter's per-model endpoints (attributed to the host that serves each model) and from the APIs or maintained price lists of Mistral, Scaleway, Stackit, Berget AI, OVHcloud and Amazon Bedrock. It is stored in a database, not in the git repository. How the sync works: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Provider Coverage

The directory covers **77 providers** across three categories:

- **API providers** (69) — OpenAI, Anthropic, Mistral, Cohere, Groq, Together AI, Scaleway, Nebius, Aleph Alpha, DeepSeek, Hugging Face, Fireworks AI, Perplexity, and more
- **Cloud platforms** (4) — Azure, Amazon Bedrock, Google Vertex AI, SAP AI Core
- **Gateways** (4) — OpenRouter, Cloudflare AI Gateway, Helicone, Requesty

EU-native providers (Mistral, Scaleway, Berget, Stackit, Aleph Alpha, evroc, CloudFerro) are included alongside major US and Chinese providers for a complete picture.

---

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **i18n:** next-intl (English and German)
- **Validation:** Zod
- **Compliance data:** Flat JSON files in `data/providers/` — git-auditable, community PR-able
- **Model catalog:** Neon (Postgres) via Drizzle ORM — synced nightly, not stored in the repo
- **Deployment:** Vercel

Components, data flow, caching and CI/CD are described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Data Model

### Provider compliance (`data/providers/{slug}.json`)

Each provider is a single JSON file. The schema is defined in [`data/schema.ts`](data/schema.ts) and validated with Zod. This is `scaleway.json`, shortened:

```json
{
  "slug": "scaleway",
  "name": "Scaleway",
  "type": "api_provider",
  "website": "https://www.scaleway.com",
  "apiDocsUrl": "https://www.scaleway.com/en/docs/generative-apis/",
  "compliance": {
    "headquarters": "FR",
    "dataResidency": {
      "regions": ["EU"],
      "euOnly": true,
      "dataLeavesEuAtInference": null,
      "euRegionDetails": "Generative APIs run exclusively in fr-par (Paris)."
    },
    "dpa": {
      "available": true,
      "url": "https://www.scaleway.com/en/contracts/",
      "signedVia": "online_acceptance"
    },
    "dataUsage": {
      "trainsOnCustomerData": false,
      "optOutAvailable": false,
      "retentionPolicy": "Prompts and completions not stored beyond request handling.",
      "details": "Dedicated data privacy page at /docs/generative-apis/reference-content/data-privacy/ explicitly states no training on customer data."
    },
    "subProcessors": {
      "disclosed": true,
      "url": "https://www.scaleway.com/en/contracts/",
      "includesEuEntities": true
    },
    "certifications": ["ISO27001", "HDS"],
    "euAiAct": {
      "status": "unknown",
      "details": "Infrastructure provider and deployer of third-party open-weight models."
    },
    "sccs": false,
    "adequacyDecision": true
  },
  "pricingTier": "pay_per_use",
  "lastVerified": "2026-04-07",
  "verifiedBy": "ai_draft",
  "sourceUrls": ["https://www.scaleway.com/en/docs/generative-apis/reference-content/data-privacy/"],
  "notes": "Scaleway (Iliad Group) is 100% French-owned.",
  "translations": {
    "de": {
      "notes": "Scaleway (Iliad Group) befindet sich zu 100 % in französischem Eigentum."
    }
  }
}
```

`translations` is optional and holds locale-specific versions of the free-text fields (`notes`, `euRegionDetails`, `retentionPolicy`, `details`) under BCP-47 keys.

### Model catalog (Postgres)

Models are not stored in the repo — they change too fast. The `models` table holds one row per `(id, provider_slug)` pair, e.g. `anthropic/claude-sonnet-4.6` at `anthropic` and at `amazon-bedrock` are separate rows with different compliance properties. Rows that disappear from a source are marked inactive, not deleted. The schema is in [`src/db/schema.ts`](src/db/schema.ts).

---

## Local Development

**Prerequisites:** [Bun](https://bun.sh) and a [Neon](https://neon.tech) Postgres database that you own, for development only.

```bash
bun install

# Copy the env template and set DATABASE_URL to your development database
cp .env.local.example .env.local

# Create the tables in your development database (run once, and after schema changes)
bun run db:migrate

bun run dev
```

The site reads the model catalog from the database, so `DATABASE_URL` must be set to start it. A fresh database has no models until you run the sync:

```bash
# Logs what would be written; does not touch the database
bun run sync:models:dry

# Writes the model catalog into the database that DATABASE_URL points to
bun run sync:models
```

`db:migrate` and `sync:models` write to whatever `DATABASE_URL` points at. Never point them at a database you do not own. Some sync sources need an API key, see `.env.local.example`; adapters without their key are skipped or fall back to their static list.

Provider files need no database:

```bash
# Validate all provider JSON files against the schema
bun run validate
```

### Available scripts

| Script                        | Description                                                            |
| ----------------------------- | ---------------------------------------------------------------------- |
| `bun run dev`                 | Start the Next.js development server                                   |
| `bun run build`               | Production build (reads the database for the sitemap and model pages)  |
| `bun run start`               | Serve the production build                                             |
| `bun run lint`                | ESLint                                                                 |
| `bun run format`              | Prettier, write mode                                                   |
| `bun run validate`            | Validate all `data/providers/*.json` against the Zod schema            |
| `bun run import`              | Create stub files for providers from models.dev that have none yet     |
| `bun run sync:models`         | Sync the model catalog from OpenRouter and provider sources            |
| `bun run sync:models:dry`     | Dry-run sync — logs what would be upserted without writing             |
| `bun run research:providers`  | AI-assisted research pass over all stub files (needs `OPENAI_API_KEY`) |
| `bun run research:provider`   | AI-assisted research pass for a single provider                        |
| `bun run translate:providers` | Generate German translations for all provider free-text fields         |
| `bun run translate:provider`  | Generate German translations for a single provider                     |
| `bun run db:generate`         | Generate Drizzle migration files after schema changes                  |
| `bun run db:migrate`          | Apply pending migrations to the database                               |
| `bun run db:studio`           | Open Drizzle Studio to browse the database                             |

---

## Contributing

### Reporting outdated information

If a provider's compliance terms have changed, [open a Report a Change issue](https://github.com/codeattack-io/infercheck/issues/new?template=report-change.yml). The structured form asks for the provider, change category, details, and a source URL. A GitHub account is required — this keeps submissions accountable and filters noise.

### Submitting a new provider or correction

1. Fork the repository
2. Add or edit a file in `data/providers/`
3. Run `bun run validate` to check your JSON against the schema
4. Open a pull request with links to the source documents you used

All entries require source URLs. Compliance claims without an evidence trail will not be merged.

### Code changes

Pull requests run these checks in CI, and all of them must pass:

| Check         | Command                         |
| ------------- | ------------------------------- |
| Provider data | `bun run validate`              |
| Lint          | `bun run lint --max-warnings=0` |
| Formatting    | `bunx prettier --check .`       |
| Types         | `bunx tsc --noEmit`             |
| Build         | `bun run build`                 |

The first four run locally without a database. The build job needs database access, so it is skipped for pull requests from forks; run `bun run build` against your own development database before you open one. New user-facing text goes into both `messages/en.json` and `messages/de.json` with identical keys.

**Note:** The model catalog (pricing, availability) is managed by the nightly sync job and is not part of the provider JSON files. Do not add a `models` field to provider files.

---

## Disclaimer

This directory provides structured, sourced information about AI inference providers' data processing practices. **It is not legal advice.** Each entry reflects publicly available information as of the "last verified" date shown. Always verify current terms directly with the provider and consult legal counsel for compliance decisions.

---

## License

- **Code** (`src/`, `scripts/`, `data/schema.ts`) — [MIT](LICENSE)
- **Provider data** (`data/providers/`) — [CC BY-NC-SA 4.0](LICENSE-DATA)

The split license keeps the code open and freely reusable while protecting the curated compliance dataset from commercial redistribution without attribution.
