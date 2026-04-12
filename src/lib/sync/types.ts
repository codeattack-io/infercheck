/**
 * src/lib/sync/types.ts
 *
 * Shared types used across the sync pipeline.
 */

export interface ModelRow {
  id: string;
  providerSlug: string;
  displayName: string;
  /**
   * Provider-agnostic normalized identifier for cross-provider grouping and URL routing.
   * e.g. "claude-sonnet-4-6" for both anthropic/claude-sonnet-4.6 and bedrock/eu.anthropic.claude-sonnet-4-6.
   * Derived via deriveCanonicalModelId().
   */
  canonicalModelId: string;
  modality: string;
  contextWindow: number | null;
  inputPricePerMTokens: string | null;
  outputPricePerMTokens: string | null;
  tokensPerSecond: string | null;
  syncSource: string;
  isActive: boolean;
  /** false = provider is a gateway hosting a third-party model (e.g. Claude on Bedrock) */
  isNativeModel: boolean;
  lastSyncedAt: Date;
}

export interface BedrockPricingSeed {
  /** input USD per 1M tokens */
  i: number | null;
  /** output USD per 1M tokens */
  o: number | null;
  /** context window in tokens */
  ctx: number | null;
}

export interface SyncOptions {
  /** Only sync this adapter key (e.g. "scaleway") */
  targetProvider?: string;
  /** Log what would happen without writing to DB */
  dryRun?: boolean;
}
