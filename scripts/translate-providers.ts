/**
 * scripts/translate-providers.ts
 *
 * Generates German translations of free-text compliance fields for all fully-verified
 * providers, writing results into translations.de in each provider JSON file.
 *
 * Uses gpt-4.5 via Vercel AI SDK — no web search needed, pure translation.
 * Uses legally precise German GDPR terminology throughout.
 *
 * Usage:
 *   bun run scripts/translate-providers.ts --all
 *   bun run scripts/translate-providers.ts --all --concurrency 10
 *   bun run scripts/translate-providers.ts --provider <slug>
 *   bun run scripts/translate-providers.ts --all --force   (re-translate even if de exists)
 *   bun run scripts/translate-providers.ts --all --dry-run
 */

import fs from "fs";
import path from "path";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import PQueue from "p-queue";
import { config } from "dotenv";
import { ProviderSchema, ProviderTranslationSchema } from "../data/schema";
import type { Provider } from "../data/schema";

// Load .env.local
config({ path: path.join(process.cwd(), ".env.local") });

// ─── Config ───────────────────────────────────────────────────────────────────

const PROVIDERS_DIR = path.join(process.cwd(), "data", "providers");

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runAll = args.includes("--all");
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const providerArg = args.find((_, i) => args[i - 1] === "--provider");
const concurrencyArg = args.find((_, i) => args[i - 1] === "--concurrency");
const concurrency = concurrencyArg ? parseInt(concurrencyArg, 10) : 30;

if (!runAll && !providerArg) {
  console.error("Usage: --all | --provider <slug>  [--concurrency N] [--force] [--dry-run]");
  process.exit(1);
}

// ─── OpenAI client ────────────────────────────────────────────────────────────

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Provider loading ─────────────────────────────────────────────────────────

function loadFullProviders(): Provider[] {
  const files = fs.readdirSync(PROVIDERS_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const providers: Provider[] = [];
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(PROVIDERS_DIR, f), "utf-8"));
    const result = ProviderSchema.safeParse(raw);
    if (result.success) {
      providers.push(result.data);
    }
  }
  return providers;
}

function loadSingleFullProvider(slug: string): Provider | null {
  const filePath = path.join(PROVIDERS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`No file found for slug: ${slug}`);
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const result = ProviderSchema.safeParse(raw);
  if (!result.success) {
    console.error(`${slug}: not a fully verified provider (still a stub?), skipping.`);
    return null;
  }
  return result.data;
}

// ─── Fields to translate ──────────────────────────────────────────────────────

interface TranslatableFields {
  notes: string | null;
  euRegionDetails: string | null;
  retentionPolicy: string | null;
  dataUsageDetails: string | null;
  euAiActDetails: string | null;
}

function extractTranslatableFields(p: Provider): TranslatableFields {
  return {
    notes: p.notes,
    euRegionDetails: p.compliance.dataResidency.euRegionDetails,
    retentionPolicy: p.compliance.dataUsage.retentionPolicy,
    dataUsageDetails: p.compliance.dataUsage.details,
    euAiActDetails: p.compliance.euAiAct.details,
  };
}

function hasAnyContent(fields: TranslatableFields): boolean {
  return Object.values(fields).some((v) => v !== null && v.trim().length > 0);
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildTranslationPrompt(provider: Provider, fields: TranslatableFields): string {
  const fieldLines = Object.entries(fields)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `"${k}": ${JSON.stringify(v)}`)
    .join(",\n  ");

  return `You are a professional translator specializing in GDPR, data protection law, and enterprise IT compliance documentation. Translate the following English compliance descriptions into precise, formal German.

**Critical requirements:**
- Use legally correct German GDPR/data protection terminology at all times
- Required term mappings (do not substitute):
  - "Standard Contractual Clauses" → "Standardvertragsklauseln (SCC)"
  - "Data Processing Agreement" or "DPA" → "Auftragsverarbeitungsvertrag (AVV)"
  - "data processor" / "processor" → "Auftragsverarbeiter"
  - "data controller" → "Verantwortlicher"
  - "sub-processor" → "Unterauftragsverarbeiter"
  - "data residency" → "Datenhaltung" or "Datenspeicherung" (context-dependent)
  - "third-country transfer" → "Drittlandübermittlung"
  - "adequacy decision" → "Angemessenheitsbeschluss"
  - "right to erasure" → "Recht auf Löschung"
  - "data subject" → "betroffene Person"
  - "inference" (AI) → "Inferenz"
  - "opt-out" → "Opt-out" (keep as English loanword, standard in German legal/tech contexts)
- Preserve factual accuracy completely — do not add, remove, or alter any facts
- Use formal German (Sie-form is not applicable here; use nominalized/impersonal constructions typical of legal/technical documentation)
- Keep proper nouns (company names, product names, certification names like SOC 2, ISO 27001) in their original form
- If a field is short and factual (e.g. a retention period), translate directly without embellishment

**Provider:** ${provider.name}

**Fields to translate (JSON):**
{
  ${fieldLines}
}

**Output format:**
Return ONLY a valid JSON object with the same keys as the input, with German translations as values. Preserve null for any field that was null in the input. No markdown, no commentary.

Example output structure:
{
  "notes": "...",
  "euRegionDetails": "...",
  "retentionPolicy": "...",
  "dataUsageDetails": "...",
  "euAiActDetails": "..."
}`;
}

// ─── Translate a single provider ──────────────────────────────────────────────

async function translateProvider(
  provider: Provider,
  dryRun: boolean,
  force: boolean,
): Promise<"success" | "failed" | "skipped"> {
  // Skip if already translated (unless --force)
  if (!force && provider.translations?.de) {
    console.log(`→  ${provider.slug}: already has translations.de, skipping (use --force to override)`);
    return "skipped";
  }

  const fields = extractTranslatableFields(provider);

  if (!hasAnyContent(fields)) {
    console.log(`→  ${provider.slug}: no translatable content (all fields null), skipping`);
    return "skipped";
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would translate: ${provider.slug} (${provider.name})`);
    return "skipped";
  }

  console.log(`⟳  Translating ${provider.slug} (${provider.name})…`);

  let rawOutput = "";
  try {
    const result = await generateText({
      model: openai("gpt-4.5"),
      messages: [
        {
          role: "user",
          content: buildTranslationPrompt(provider, fields),
        },
      ],
    });

    rawOutput = result.text.trim();

    // Strip markdown code fences if present
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) rawOutput = jsonMatch[1].trim();

    const parsed = JSON.parse(rawOutput);

    // Map flat output keys back to nested ProviderTranslationSchema shape
    const translationData = {
      notes: parsed.notes ?? null,
      dataResidency:
        parsed.euRegionDetails != null
          ? { euRegionDetails: parsed.euRegionDetails }
          : undefined,
      dataUsage:
        parsed.retentionPolicy != null || parsed.dataUsageDetails != null
          ? {
              retentionPolicy: parsed.retentionPolicy ?? null,
              details: parsed.dataUsageDetails ?? null,
            }
          : undefined,
      euAiAct:
        parsed.euAiActDetails != null
          ? { details: parsed.euAiActDetails }
          : undefined,
    };

    const validation = ProviderTranslationSchema.safeParse(translationData);
    if (!validation.success) {
      console.error(`✗  ${provider.slug}: translation schema validation failed`);
      console.error("   Errors:", JSON.stringify(validation.error.issues, null, 2));
      return "failed";
    }

    // Read the raw file, merge in translations.de, write back
    const filePath = path.join(PROVIDERS_DIR, `${provider.slug}.json`);
    const rawFile = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    rawFile.translations = { ...(rawFile.translations ?? {}), de: validation.data };
    fs.writeFileSync(filePath, JSON.stringify(rawFile, null, 2) + "\n", "utf-8");

    console.log(`✓  ${provider.slug}`);
    return "success";
  } catch (err) {
    console.error(`✗  ${provider.slug}: ${err instanceof Error ? err.message : String(err)}`);
    return "failed";
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let providers: Provider[];

  if (providerArg) {
    const p = loadSingleFullProvider(providerArg);
    if (!p) process.exit(0);
    providers = [p];
  } else {
    providers = loadFullProviders();
    console.log(`Found ${providers.length} fully verified providers.`);
  }

  if (providers.length === 0) {
    console.log("No providers to translate.");
    return;
  }

  const queue = new PQueue({ concurrency });
  const results = { success: 0, failed: 0, skipped: 0 };

  for (const provider of providers) {
    queue.add(async () => {
      const outcome = await translateProvider(provider, dryRun, force);
      results[outcome]++;
    });
  }

  await queue.onIdle();

  console.log("\n─────────────────────────────────");
  console.log(`✓ ${results.success} translated`);
  console.log(`✗ ${results.failed} failed`);
  console.log(`→ ${results.skipped} skipped`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
