/**
 * scripts/research-providers.ts
 *
 * Uses a web-searching LLM (gpt-4.5 via Vercel AI SDK) to research stub providers
 * and fill in complete GDPR compliance data.
 *
 * Usage:
 *   bun run scripts/research-providers.ts --all
 *   bun run scripts/research-providers.ts --all --concurrency 10
 *   bun run scripts/research-providers.ts --provider <slug>
 *   bun run scripts/research-providers.ts --all --dry-run
 */

import fs from "fs";
import path from "path";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import PQueue from "p-queue";
import { config } from "dotenv";
import { ProviderSchema, ProviderStubSchema } from "../data/schema";

// Load .env.local
config({ path: path.join(process.cwd(), ".env.local") });

// ─── Config ───────────────────────────────────────────────────────────────────

const PROVIDERS_DIR = path.join(process.cwd(), "data", "providers");
const FAILED_DIR = path.join(PROVIDERS_DIR, "_failed");
const TODAY = new Date().toISOString().slice(0, 10);

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runAll = args.includes("--all");
const dryRun = args.includes("--dry-run");
const providerArg = args.find((_, i) => args[i - 1] === "--provider");
const concurrencyArg = args.find((_, i) => args[i - 1] === "--concurrency");
const concurrency = concurrencyArg ? parseInt(concurrencyArg, 10) : 30;

if (!runAll && !providerArg) {
  console.error(
    "Usage: --all | --provider <slug>  [--concurrency N] [--dry-run]",
  );
  process.exit(1);
}

// ─── OpenAI client ────────────────────────────────────────────────────────────

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Provider JSON loading ────────────────────────────────────────────────────

interface StubEntry {
  slug: string;
  name: string;
  website: string | null;
  type: string;
}

function loadStubs(): StubEntry[] {
  const files = fs
    .readdirSync(PROVIDERS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const stubs: StubEntry[] = [];
  for (const f of files) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(PROVIDERS_DIR, f), "utf-8"),
    );
    const result = ProviderStubSchema.safeParse(raw);
    if (result.success) {
      stubs.push({
        slug: result.data.slug,
        name: result.data.name,
        website: result.data.website,
        type: result.data.type,
      });
    }
  }
  return stubs;
}

function loadSingleStub(slug: string): StubEntry | null {
  const filePath = path.join(PROVIDERS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`No file found for slug: ${slug}`);
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const stub = ProviderStubSchema.safeParse(raw);
  if (!stub.success) {
    // Check if it's already a full provider
    const full = ProviderSchema.safeParse(raw);
    if (full.success) {
      console.log(
        `→ ${slug} already fully researched (verifiedBy: ${full.data.verifiedBy}), skipping.`,
      );
      return null;
    }
    console.error(`${slug}: not a valid stub or full provider — skipping.`);
    return null;
  }
  return {
    slug: stub.data.slug,
    name: stub.data.name,
    website: stub.data.website,
    type: stub.data.type,
  };
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(stub: StubEntry): string {
  return `You are a GDPR compliance researcher. Your task is to fill in factual compliance data for an AI inference provider.

**ACCURACY IS CRITICAL.** This data will be used by EU companies for legal compliance decisions (vendor selection, DPA negotiations, DSGVO-Dokumentation). Do NOT guess, invent, or extrapolate. If you cannot find a specific fact from a primary source (the provider's own website or official documentation), set that field to null.

**Provider to research:**
- Name: ${stub.name}
- Website: ${stub.website ?? "unknown"}
- Type: ${stub.type}

**Your task:**
Use your web search capability to research this provider. Look for:
1. Their privacy policy / Datenschutzerklärung
2. Data Processing Agreement (DPA) / Auftragsverarbeitungsvertrag (AVV) — is one available? Where? How is it signed?
3. Data residency documentation — where is data stored and processed? Is EU-only processing available?
4. Does inference (GPU compute) stay in the EU, or can it leave?
5. Sub-processor list — is it publicly disclosed?
6. Do they train on customer/API data? Is there an opt-out?
7. Data retention policy
8. Security certifications (SOC 2, ISO 27001, ISO 27701, BSI C5, HDS, etc.)
9. EU AI Act compliance status or statements
10. Whether Standard Contractual Clauses (SCCs / Standardvertragsklauseln) are in place
11. Whether the provider's headquarters country has an EU adequacy decision

**Output format:**
Return ONLY a valid JSON object matching this exact schema. No markdown, no commentary, just the JSON.

{
  "slug": "${stub.slug}",
  "name": "${stub.name}",
  "type": "${stub.type}",
  "website": "${stub.website ?? ""}",
  "apiDocsUrl": "<url or null>",
  "logoPath": "/logos/${stub.slug}.svg",
  "compliance": {
    "headquarters": "<ISO 3166-1 alpha-2 country code, e.g. US, DE, FR>",
    "dataResidency": {
      "regions": ["<ISO codes of regions where data is processed, e.g. EU, US, DE>"],
      "euOnly": <true if EU-only processing is guaranteed, false otherwise>,
      "dataLeavesEuAtInference": <false if inference GPU stays in EU, true if it can leave, null if unknown>,
      "euRegionDetails": "<plain-language explanation of EU routing options, or null>"
    },
    "dpa": {
      "available": <true or false>,
      "url": "<direct URL to DPA/AVV page, or null>",
      "signedVia": "<one of: online_acceptance | custom_contract | not_available>"
    },
    "dataUsage": {
      "trainsOnCustomerData": <true if they train on API customer data by default, false if explicitly not, null if unknown>,
      "optOutAvailable": <true if training opt-out is available, false if explicitly not, null if unknown>,
      "retentionPolicy": "<plain-language retention summary, or null>",
      "details": "<additional context about data usage, or null>"
    },
    "subProcessors": {
      "disclosed": <true if a sub-processor list is publicly available>,
      "url": "<direct URL to sub-processor list, or null>",
      "includesEuEntities": <true | false | null>
    },
    "certifications": ["<e.g. SOC2, ISO27001, ISO27701, C5, HDS — only include confirmed ones>"],
    "euAiAct": {
      "status": "<one of: compliant | monitoring | unknown | not_applicable>",
      "details": "<explanation of EU AI Act posture, or null>"
    },
    "sccs": <true | false | null>,
    "adequacyDecision": <true if HQ country has EU adequacy decision, false otherwise>
  },
  "pricingTier": "<one of: free_tier | pay_per_use | enterprise_only>",
  "lastVerified": "${TODAY}",
  "verifiedBy": "ai_draft",
  "sourceUrls": ["<all URLs you consulted that contain primary-source evidence>"],
  "notes": "<1-3 sentence editorial summary of the provider's GDPR posture, or null>"
}

Rules:
- Every non-null compliance field must be supported by at least one URL in sourceUrls
- If you find conflicting information, prefer the more recent primary source and note it in the notes field
- headquarters must be exactly 2 uppercase letters (ISO 3166-1 alpha-2)
- Do not include any fields not in the schema above
- certifications array must only contain certifications you can confirm from a source URL`;
}

// ─── Research a single provider ───────────────────────────────────────────────

async function researchProvider(
  stub: StubEntry,
  dryRun: boolean,
): Promise<"success" | "failed" | "skipped"> {
  if (dryRun) {
    console.log(`[DRY RUN] Would research: ${stub.slug} (${stub.name})`);
    return "skipped";
  }

  console.log(`⟳  Researching ${stub.slug} (${stub.name})…`);

  let rawOutput = "";
  try {
    const result = await generateText({
      model: openai("gpt-5.4"),
      tools: {
        web_search_preview: openai.tools.webSearchPreview({}),
      },
      toolChoice: "auto",
      messages: [
        {
          role: "user",
          content: buildPrompt(stub),
        },
      ],
    });

    rawOutput = result.text.trim();

    // Strip markdown code fences if the model wrapped output in them
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) rawOutput = jsonMatch[1].trim();

    const parsed = JSON.parse(rawOutput);
    const validation = ProviderSchema.safeParse(parsed);

    if (!validation.success) {
      console.error(`✗  ${stub.slug}: schema validation failed`);
      console.error(
        "   Errors:",
        JSON.stringify(validation.error.issues.slice(0, 5), null, 2),
      );
      fs.mkdirSync(FAILED_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(FAILED_DIR, `${stub.slug}.json`),
        rawOutput,
        "utf-8",
      );
      return "failed";
    }

    // Write validated data back to the provider file
    fs.writeFileSync(
      path.join(PROVIDERS_DIR, `${stub.slug}.json`),
      JSON.stringify(validation.data, null, 2) + "\n",
      "utf-8",
    );
    console.log(`✓  ${stub.slug}`);
    return "success";
  } catch (err) {
    console.error(
      `✗  ${stub.slug}: ${err instanceof Error ? err.message : String(err)}`,
    );
    if (rawOutput) {
      fs.mkdirSync(FAILED_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(FAILED_DIR, `${stub.slug}.json`),
        rawOutput,
        "utf-8",
      );
    }
    return "failed";
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let stubs: StubEntry[];

  if (providerArg) {
    const stub = loadSingleStub(providerArg);
    if (!stub) process.exit(0);
    stubs = [stub];
  } else {
    stubs = loadStubs();
    console.log(`Found ${stubs.length} stub providers to research.`);
  }

  if (stubs.length === 0) {
    console.log("No stubs to process.");
    return;
  }

  const queue = new PQueue({ concurrency });
  const results = { success: 0, failed: 0, skipped: 0 };

  for (const stub of stubs) {
    queue.add(async () => {
      const outcome = await researchProvider(stub, dryRun);
      results[outcome]++;
    });
  }

  await queue.onIdle();

  console.log("\n─────────────────────────────────");
  console.log(`✓ ${results.success} succeeded`);
  console.log(`✗ ${results.failed} failed`);
  console.log(`→ ${results.skipped} skipped`);
  if (results.failed > 0) {
    console.log(`\nFailed outputs saved to: data/providers/_failed/`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
