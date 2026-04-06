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

For each AI inference provider, the directory tracks:

| Field | What it answers |
|---|---|
| **Data residency** | Where is my data processed? Is EU-only routing available? |
| **DPA availability** | Is there a Data Processing Addendum? How is it signed? |
| **Training on customer data** | Does the provider train models on API traffic? |
| **Sub-processors** | Are sub-processors disclosed? Are any EU-based? |
| **Certifications** | SOC 2, ISO 27001, ISO 27701, C5, HDS, etc. |
| **EU AI Act status** | Has the provider addressed GPAI obligations? |
| **SCCs / adequacy** | Standard Contractual Clauses? Adequacy decision for HQ country? |
| **Last verified** | When was this entry last checked against source documents? |

Every claim links to a source document. No automated scoring, no legal judgments — structured facts with an evidence trail.

---

## Provider Coverage

The directory covers **110+ providers** across three categories:

- **API providers** — OpenAI, Anthropic, Mistral, Cohere, Groq, Together AI, Scaleway, Nebius, Aleph Alpha, DeepSeek, Hugging Face, Fireworks AI, Perplexity, and more
- **Cloud platforms** — Azure OpenAI, AWS Bedrock, Google Vertex AI, SAP AI Core
- **Gateways** — OpenRouter, Cloudflare AI Gateway, Vercel AI Gateway, and others

EU-native providers (Mistral, Scaleway, Berget, Stackit, Aleph Alpha, evroc, CloudFerro) are included alongside major US and Chinese providers for a complete picture.

---

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Validation:** Zod
- **Data:** Flat JSON files in `data/providers/` — no database
- **Deployment:** Vercel

---

## Data Model

Each provider is a single JSON file at `data/providers/{slug}.json`. The schema is defined in [`data/schema.ts`](data/schema.ts) and validated with Zod.

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
      "euRegionDetails": "Available via eu.api.openai.com (EEA + Switzerland)."
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
  "lastVerified": "2026-04-07",
  "verifiedBy": "carlo",
  "sourceUrls": ["https://openai.com/policies/data-processing-addendum"]
}
```

---

## Local Development

**Prerequisites:** [Bun](https://bun.sh)

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Validate all provider JSON files against the schema
bun validate

# Re-import seed data from models.dev
bun import
```

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

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 0** | In progress | Data foundation — schema, import scripts, ~20–25 verified providers |
| **Phase 1** | Planned | Filterable homepage, provider detail pages, report-a-change form, SEO, Vercel deploy |
| **Phase 2** | Future | Side-by-side comparison, email alerts, provider verification badge program |
| **Phase 3** | Contingent | EU-routing proxy API (only if directory demonstrates clear demand) |

---

## Disclaimer

This directory provides structured, sourced information about AI inference providers' data processing practices. **It is not legal advice.** Each entry reflects publicly available information as of the "last verified" date shown. Always verify current terms directly with the provider and consult legal counsel for compliance decisions.

---

## License

- **Code** (`src/`, `scripts/`, `data/schema.ts`) — [MIT](LICENSE)
- **Provider data** (`data/providers/`) — [CC BY-NC-SA 4.0](LICENSE-DATA)

The split license keeps the code open and freely reusable while protecting the curated compliance dataset from commercial redistribution without attribution.
