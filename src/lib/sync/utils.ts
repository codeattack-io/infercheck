/**
 * src/lib/sync/utils.ts
 *
 * Shared utility functions for the sync pipeline.
 */

/**
 * Known third-party model provider prefixes that appear inside Bedrock/gateway IDs.
 * Used to strip them when deriving a canonical model ID.
 * e.g. "eu.anthropic.claude-sonnet-4-6" → strip "anthropic." → "claude-sonnet-4-6"
 */
const KNOWN_VENDOR_PREFIXES = [
  "anthropic.",
  "meta.",
  "mistral.",
  "cohere.",
  "amazon.",
  "nvidia.",
  "openai.",
  "deepseek.",
  "google.",
  "stability.",
  "qwen.",
  "minimax.",
  "zai.",
  "ai21.",
  "writer.",
  "databricks.",
];

/**
 * Derive a provider-agnostic, normalized model identifier suitable for
 * cross-provider grouping and URL routing.
 *
 * Algorithm:
 *   1. Strip the storage prefix (e.g. "bedrock/", "anthropic/").
 *   2. Strip region prefixes (eu. / us. / ap. / global.).
 *   3. Strip known third-party vendor prefixes (anthropic. / meta. / etc.).
 *   4. Replace dots, colons, and slashes with hyphens.
 *   5. Collapse consecutive hyphens; trim trailing hyphens.
 *   6. Lowercase the result.
 *
 * Examples:
 *   anthropic/claude-sonnet-4.6                    → claude-sonnet-4-6
 *   bedrock/eu.anthropic.claude-sonnet-4-6         → claude-sonnet-4-6
 *   bedrock/eu.anthropic.claude-sonnet-4-20250514-v1:0 → claude-sonnet-4-20250514-v1-0
 *   bedrock/eu.amazon.nova-pro-v1:0                → nova-pro-v1-0
 *   bedrock/cohere.embed-english-v3               → embed-english-v3
 */
export function deriveCanonicalModelId(rawId: string): string {
  // 1. Strip storage prefix (everything up to and including the first "/")
  let s = rawId.includes("/") ? rawId.split("/").slice(1).join("/") : rawId;

  // 2. Strip region prefix
  s = s.replace(/^(?:eu|us|ap|global)\./, "");

  // 3. Strip known vendor prefixes (only one level)
  for (const prefix of KNOWN_VENDOR_PREFIXES) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length);
      break;
    }
  }

  // 4. Normalize dots, colons, spaces → hyphens
  s = s.replace(/[.:/ ]+/g, "-");

  // 5. Collapse multiple hyphens; strip trailing hyphens
  s = s.replace(/-{2,}/g, "-").replace(/-+$/, "");

  // 6. Lowercase
  return s.toLowerCase();
}

export function normaliseModality(raw: string | undefined): string {
  if (!raw) return "text";
  if (raw.includes("image") || raw.includes("audio")) {
    if (raw.includes("image") && raw.includes("audio")) return "multimodal";
    if (raw.includes("image")) return "multimodal";
    return "audio";
  }
  if (raw.includes("embed")) return "embedding";
  return "text";
}
