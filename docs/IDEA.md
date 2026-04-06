# GDPR AI Directory

## Snapshot

- Name: GDPR AI Directory
- Category: developer tooling / AI compliance
- Status: exploring
- Date: 2026-04-06
- Readiness: 3/5
- Build-next index: 7/10
- One-line concept: A neutral, multi-vendor directory of AI inference providers tagged by GDPR compliance status, helping EU businesses make defensible model selection decisions.

## Problem

- **What pain exists?** EU businesses building AI-enabled products have no single, neutral resource to determine whether an AI inference provider is GDPR compliant. They need to know: where is data processed, is there a signed DPA, does the provider train on customer data, does it offer EU-only routing, is it covered under EU AI Act obligations?
- **Who experiences it?** EU SaaS product teams, digital agencies, and mid-market tech companies building AI features. Also compliance officers and legal/procurement in those orgs who sign off on vendor choices.
- **How is it solved today?** Either by defaulting to expensive enterprise-tier options (IBM Watsonx, SAP AI Core, Azure OpenAI Germany North) because they come with procurement familiarity, or by manually reviewing each provider's privacy policy, DPA terms, and data processing agreements — which is time-consuming, inconsistent, and rarely done thoroughly.
- **Why is the current workflow frustrating or expensive?** The IBM/SAP path is enterprise tax: businesses pay a premium not for better models but for a compliance shortcut. The DIY path requires legal capacity most small-to-mid product teams don't have. There's no neutral, structured, up-to-date reference.

## User / ICP

- **Primary user:** EU-based SaaS companies and digital product agencies (5–50 person teams) building AI-enabled features who need a defensible answer to "is this provider GDPR compliant?" before legal or procurement will approve usage.
- **Secondary user:** Freelance developers and consultants in the EU who are evaluating inference providers for client projects and need to demonstrate compliance awareness.
- **Buying context:** Triggered by a legal/procurement review of a new AI vendor, a GDPR audit, or a client asking "where does the data go?" The decision is not always technical — it's often someone in legal or engineering needing to quickly justify a provider choice.

## Why This Idea

- **Founder fit:** Carlo is based in Germany, operates under GDPR daily, and works in enterprise IT where he observes this exact problem multiple times per week. He can evaluate compliance claims with real context, not just copy provider marketing copy.
- **Why now:** EU AI Act compliance obligations are rolling in through 2025–2026. GDPR enforcement pressure on AI vendors is increasing (Italy banned ChatGPT, German DPAs are active). More EU companies are building AI features, and the question of "can we legally use this provider?" is becoming unavoidable.
- **Why this is worth exploring:** The gap is confirmed — no neutral multi-provider compliance directory exists. Models.dev, Artificial Analysis, and OpenRouter all have zero compliance dimension. Scaleway, Mistral, and Aleph Alpha each market their own EU compliance but none serves as a neutral aggregator. The directory requires no infrastructure to launch and has strong SEO and lead-gen potential.

## Market View

- **Key competitors:**
  - *Artificial Analysis* — benchmarks model quality/speed/cost across providers; no compliance dimension
  - *models.dev* — API reference for AI models; no compliance dimension
  - *OpenRouter* — multi-model API gateway; US-based, no GDPR routing, no compliance filtering
  - *Portkey* — US-based AI gateway with GDPR/HIPAA as checkbox features; no EU routing enforcement
  - *Scaleway Generative APIs* — strong EU inference provider (France); single vendor, not a directory
  - *Mistral AI* — EU-based (France) inference + gateway; single vendor
  - *Aleph Alpha* — German AI provider, highly enterprise/B2G; not an open API, not a directory
  - *Nebius AI* — EU-infrastructure inference provider (Amsterdam, Finland/France data centers); not GDPR-branded as a core identity
- **Saturation judgment:** Not crowded at the specific intersection of neutral directory + GDPR compliance metadata. Individual EU providers exist, but no neutral aggregator does.
- **Gaps or wedges:** Neutral, multi-vendor GDPR compliance lens applied to AI model/provider selection. No one owns this from a trustworthy, independent position.

## Product Direction

- **Core workflow:** User visits directory, searches or browses AI inference providers, filters by: data residency (EU-only, US, global), DPA availability, training opt-out policy, EU AI Act status, supported models, pricing tier. Each provider has a compliance profile page with structured metadata and links to source documentation.
- **MVP scope:**
  - Static or semi-static website (Next.js, deployed to Vercel or Hetzner)
  - Curated table of 15–25 major AI inference providers (OpenAI, Anthropic, Mistral, Scaleway, Nebius, Aleph Alpha, Azure OpenAI, AWS Bedrock, Google Vertex AI, Cohere, Together AI, Groq, etc.)
  - Per-provider compliance fields: data residency, DPA available (Y/N + link), trains on customer data (Y/N), EU AI Act status, relevant certifications (SOC 2, ISO 27001), model availability, pricing tier
  - Basic filtering/search
  - Plain-language summary for each provider (not just legal copy)
  - "Last verified" date per entry to set expectations on staleness
- **Nice-to-have features:**
  - Side-by-side provider comparison view
  - Email alert when a provider's compliance status changes
  - "Suggest an update" form for community corrections
  - Provider self-submission / verification flow (paid tier)
  - Embedded widget for other sites to display compliance badges
  - Phase 2: GDPR AI Gateway (EU-routing proxy API, see notes)
- **What to avoid in v1:** Automated compliance scoring (too much liability), legal advice framing, building the gateway before the directory has traction.

## Differentiation

- **Main wedge:** Neutral, multi-vendor, structured compliance reference — not a provider's own marketing, not a law firm's generic GDPR checklist, but a developer-friendly directory with filterable, comparable, sourced compliance metadata.
- **Secondary wedge:** Built by a German developer with enterprise IT context, giving it credibility that a generic AI aggregator can't easily replicate.
- **Reason users would switch:** There's nothing to switch from — this fills a gap rather than displacing an existing tool.

## Business Angle

- **Monetization options:**
  - Lead-gen and portfolio signal for freelance consulting work (primary near-term value)
  - Provider verification / "Verified Compliant" badge program — providers pay to get a thorough review and a verified listing (cleaner than ads, preserves neutrality)
  - Sponsored placement with clear labeling (lower trust, but viable)
  - Consulting upsell: "Need help evaluating AI vendors for your stack? Book a call."
  - Newsletter or compliance update digest (audience building)
  - Phase 2: GDPR AI Gateway usage fees if the gateway is built
- **Portfolio / lead-gen value:** High. Demonstrates EU AI compliance expertise, positions Carlo as a credible voice at the intersection of AI infrastructure and data privacy — a combination that attracts enterprise and mid-market clients in Germany and the EU.
- **Likely business quality:** Moderate as a standalone SaaS, high as a lead-gen and authority asset. Revenue ceiling on the directory alone is probably modest (five figures/year) unless the gateway is built or consulting conversion is strong.

## Technical Shape

- **Suggested stack:** Next.js (App Router), TypeScript, Tailwind CSS. Content stored as structured MDX or JSON files in the repo for easy editing and version tracking. Deployed to Vercel (simple) or Hetzner (if self-hosted matters for the brand).
- **Hosting model:** Static-first with ISR for the directory. No database required for MVP — flat files are sufficient and easier to update and audit.
- **Integrations:** None required for MVP. Optional: Airtable or Notion as a CMS backend for managing provider records if the dataset grows past ~50 entries.
- **Complexity / risk notes:** Low complexity for the directory MVP. The gateway (phase 2) is a different technical shape entirely — requires EU-hosted infrastructure, signed DPAs with upstream providers, reliable uptime, and legal review. Do not conflate the two scopes.

## Risks

- **Biggest product risk:** Data staleness. Provider compliance terms change and keeping the directory accurate requires ongoing maintenance. If entries go stale, the directory becomes unreliable. Mitigation: display "last verified" dates prominently; add a community correction flow early.
- **Biggest GTM risk:** Low organic discovery if the SEO strategy is not deliberate. The audience searches for specific terms ("GDPR OpenAI alternative", "EU AI inference GDPR compliant") — content must be structured to capture those queries.
- **Biggest technical risk:** Minimal for the directory. For the gateway (phase 2): liability exposure if routing logic fails or a provider silently changes their data processing terms without updating the directory.

## Recommendation

- **Verdict:** Conditional go
- **Reason:** Real, confirmed gap. Strong founder fit. Low-cost MVP. High portfolio and lead-gen value. The directory alone justifies building; the gateway is a credible but separate future expansion. Stay focused on directory quality and neutrality — that's the moat.
- **Next smallest step:** Build a minimal proof-of-concept: a single web page with a filterable table of 10–15 providers and their compliance metadata. Ship it publicly, share it in EU developer communities and GDPR-adjacent forums, and measure inbound interest before investing further.

## Notes

- 2026-04-06: Initial idea doc. Idea came from observing the problem multiple times per week in enterprise IT work. Market research confirmed no neutral multi-vendor GDPR AI directory exists. Direct competitors (Artificial Analysis, models.dev, OpenRouter) have zero compliance dimension. EU-native inference providers (Scaleway, Mistral, Aleph Alpha) each cover their own compliance but none serves as an aggregator.
- Framing: Directory-first. Gateway is explicitly a phase 2 play, contingent on directory gaining traction and demonstrating demand for EU-compliant routing.
- Monetization priority: Lead-gen and portfolio value first. Provider verification fees cleaner than ads for preserving neutrality. Consulting upsell is a natural fit given founder context.
