/**
 * scripts/import-models-dev.ts
 *
 * Imports provider identity data from the models.dev GitHub repo (dev branch).
 * Fetches each provider's provider.toml and logo.svg, then generates stub JSON
 * files in data/providers/ and copies logos to public/logos/.
 *
 * Model catalog is NOT imported here — it is managed separately by the nightly
 * sync job (scripts/sync-models.ts → src/lib/sync/run.ts → Neon DB).
 *
 * Usage:
 *   bun run import                 # create stubs for new providers only
 *   bun run import -- --force      # overwrite all existing stubs
 *
 * Set GITHUB_TOKEN env var to avoid GitHub API rate limits (60 req/hr anon → 5000/hr auth):
 *   GITHUB_TOKEN=ghp_... bun run import
 */

import { join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";

const REPO_OWNER = "anomalyco";
const REPO_NAME = "models.dev";
const REPO_BRANCH = "dev";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`;
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DATA_DIR = join(ROOT, "data", "providers");
const LOGOS_DIR = join(ROOT, "public", "logos");

const FORCE = process.argv.includes("--force");

// GitHub token — set via env to raise rate limit from 60 to 5000 req/hr
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? null;
if (!GITHUB_TOKEN) {
  console.warn(
    "Warning: GITHUB_TOKEN not set. Using unauthenticated GitHub API (60 req/hr).\n" +
      "         Set GITHUB_TOKEN=ghp_... to avoid rate limits.\n"
  );
}

/**
 * Provider directory names (from models.dev) that should be classified as
 * gateways. Gateways route to many upstream providers — model catalog is
 * handled by the sync job, not imported here.
 */
const GATEWAY_DIR_NAMES = new Set([
  "cloudflare-ai-gateway",
  "openrouter",
  "helicone",
  "llm-gateway",
  "kilo-gateway",
  "requesty",
  "fastrouter",
  "vercel-ai-gateway",
  "portkey",
  "weights-biases",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: githubHeaders() });
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get("x-ratelimit-reset");
      const resetTime = reset ? new Date(Number(reset) * 1000).toISOString() : "unknown";
      console.error(
        `\n  [RATE LIMIT] GitHub API rate limit hit. Resets at ${resetTime}.` +
          "\n  Set GITHUB_TOKEN env var to raise the limit to 5000 req/hr.\n"
      );
      process.exit(1);
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface GitHubEntry {
  name: string;
  type: "file" | "dir";
  path: string;
}

interface ProviderToml {
  name?: string;
  env?: string[];
  npm?: string;
  doc?: string;
  api?: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(LOGOS_DIR, { recursive: true });

  console.log("Fetching provider list from models.dev...");
  const entries = await fetchJson<GitHubEntry[]>(`${API_BASE}/contents/providers?ref=${REPO_BRANCH}`);

  if (!entries || !Array.isArray(entries)) {
    console.error("Failed to fetch provider list. Check network or repo access.");
    process.exit(1);
  }

  const providerDirs = entries.filter((e) => e.type === "dir");
  console.log(`Found ${providerDirs.length} providers.\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const dir of providerDirs) {
    const dirName = dir.name;
    const rawBase = `${RAW_BASE}/providers/${dirName}`;
    const isGateway = GATEWAY_DIR_NAMES.has(dirName);

    // Fetch provider.toml
    const tomlText = await fetchText(`${rawBase}/provider.toml`);
    if (!tomlText) {
      console.warn(`  [SKIP] ${dirName}: no provider.toml`);
      skipped++;
      continue;
    }

    let parsed: ProviderToml;
    try {
      parsed = Bun.TOML.parse(tomlText) as ProviderToml;
    } catch (e) {
      console.warn(`  [FAIL] ${dirName}: TOML parse error — ${e}`);
      failed++;
      continue;
    }

    const name = parsed.name ?? dirName;
    const slug = slugify(name);
    const outPath = join(DATA_DIR, `${slug}.json`);

    if (existsSync(outPath) && !FORCE) {
      console.log(`  [SKIP] ${slug}: file exists (use --force to overwrite)`);
      skipped++;
      continue;
    }

    // Copy logo
    let logoPath: string | null = null;
    const logoContent = await fetchText(`${rawBase}/logo.svg`);
    if (logoContent) {
      const logoFile = join(LOGOS_DIR, `${slug}.svg`);
      if (!existsSync(logoFile) || FORCE) {
        writeFileSync(logoFile, logoContent, "utf-8");
      }
      logoPath = `/logos/${slug}.svg`;
    }

    // Derive website from doc URL (strip path)
    let website: string | null = null;
    if (parsed.doc) {
      try {
        const u = new URL(parsed.doc);
        website = `${u.protocol}//${u.hostname}`;
      } catch {
        // ignore
      }
    }

    // Build stub — no models field; model catalog is managed by sync-models
    const stub = {
      slug,
      name,
      type: isGateway ? "gateway" : "api_provider",
      website,
      apiDocsUrl: parsed.doc ?? null,
      logoPath,
      compliance: null,
      pricingTier: null,
      lastVerified: null,
      verifiedBy: "stub",
      sourceUrls: [],
      notes: isGateway ? "Gateway/proxy service — routes to multiple upstream providers." : null,
    };

    writeFileSync(outPath, JSON.stringify(stub, null, 2) + "\n", "utf-8");
    console.log(`  [OK]   ${slug} (${name})`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log("Run 'bun run sync:models' to populate the model catalog in Neon.");
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
