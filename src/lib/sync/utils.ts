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
 * Maps a post-normalization canonical ID to its true cross-provider canonical ID.
 *
 * Needed when a provider (e.g. AWS Bedrock) appends its own deployment-version
 * suffix to a model that is otherwise identical to the upstream release.
 * Example: Bedrock exposes "anthropic.claude-opus-4-6-v1" — the "-v1" is AWS's
 * internal deployment tag, not a distinct model version. The canonical ID should
 * be "claude-opus-4-6" so it groups with Anthropic's direct listing on the
 * model detail page.
 *
 * Rules for adding entries here:
 *  - Only add when the suffix is provider infra noise, NOT a real model version.
 *  - Key   = what deriveCanonicalModelId() produces after steps 1–6.
 *  - Value = the canonical ID users/URLs should see.
 */
const CANONICAL_ID_ALIASES: Record<string, string> = {
  "claude-opus-4-6-v1": "claude-opus-4-6",
};

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
 *   7. Apply CANONICAL_ID_ALIASES to unify known provider-specific variants.
 *
 * Examples:
 *   anthropic/claude-sonnet-4.6                        → claude-sonnet-4-6
 *   bedrock/eu.anthropic.claude-sonnet-4-6             → claude-sonnet-4-6
 *   bedrock/eu.anthropic.claude-sonnet-4-20250514-v1:0 → claude-sonnet-4-20250514-v1-0
 *   bedrock/eu.anthropic.claude-opus-4-6-v1            → claude-opus-4-6  (alias)
 *   bedrock/eu.amazon.nova-pro-v1:0                    → nova-pro-v1-0
 *   bedrock/cohere.embed-english-v3                    → embed-english-v3
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
  s = s.toLowerCase();

  // 7. Apply alias map for known provider-specific deployment variants
  return CANONICAL_ID_ALIASES[s] ?? s;
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
