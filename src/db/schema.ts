import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  serial,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── models ──────────────────────────────────────────────────────────────────
//
// Each row represents one model available at one provider.
// The same canonical model ID (e.g. "claude-sonnet-4-6") can appear at
// multiple providers (e.g. "anthropic" and "amazon-bedrock") as separate rows.

export const models = pgTable(
  "models",
  {
    /** Canonical model ID as used in the provider's API, e.g. "claude-sonnet-4-6" */
    id: text("id").notNull(),

    /** FK to data/providers/{providerSlug}.json */
    providerSlug: text("provider_slug").notNull(),

    /** Human-readable display name, e.g. "Claude Sonnet 4.6" */
    displayName: text("display_name").notNull(),

    /**
     * Input modality.
     * Values: 'text' | 'multimodal' | 'image' | 'audio' | 'code' | 'embedding'
     */
    modality: text("modality").notNull().default("text"),

    /** Maximum context length in tokens */
    contextWindow: integer("context_window"),

    /** Cost per 1M input tokens in USD */
    inputPricePerMTokens: numeric("input_price_per_m_tokens", {
      precision: 12,
      scale: 6,
    }),

    /** Cost per 1M output tokens in USD */
    outputPricePerMTokens: numeric("output_price_per_m_tokens", {
      precision: 12,
      scale: 6,
    }),

    /** Benchmark throughput in tokens/sec (median, from source) */
    tokensPerSecond: numeric("tokens_per_second", { precision: 8, scale: 2 }),

    /** Source that provided this row's data, e.g. "openrouter" | "provider_api" | "manual" */
    syncSource: text("sync_source").notNull().default("openrouter"),

    /**
     * Provider-agnostic normalized model identifier used for cross-provider grouping
     * and URL routing, e.g. "claude-sonnet-4-6".
     *
     * Derived by stripping the provider prefix, region prefixes (eu./us./ap./global.),
     * and third-party prefixes (anthropic./meta./mistral./etc.) from the raw model ID,
     * then normalising dots to hyphens and lowercasing.
     *
     * Examples:
     *   anthropic/claude-sonnet-4.6             → claude-sonnet-4-6
     *   bedrock/eu.anthropic.claude-sonnet-4-6  → claude-sonnet-4-6
     *   bedrock/eu.amazon.nova-pro-v1:0         → nova-pro-v1-0
     */
    canonicalModelId: text("canonical_model_id"),

    /** Whether this model is currently available (set to false on removal, not deleted) */
    isActive: boolean("is_active").notNull().default(true),

    /**
     * Whether this model is built / operated by the provider itself.
     * false = the provider is acting as a gateway to a third-party model
     * (e.g. Claude on Amazon Bedrock, Llama on Together AI).
     * Defaults to true for all non-gateway providers.
     */
    isNativeModel: boolean("is_native_model").notNull().default(true),

    /** Timestamp of last successful sync for this row */
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.id, table.providerSlug] })],
);

// ─── sync_log ─────────────────────────────────────────────────────────────────
//
// Audit log for each sync run. One row per provider per run.

export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  providerSlug: text("provider_slug"),
  modelsUpserted: integer("models_upserted"),
  modelsDeactivated: integer("models_deactivated"),
  error: text("error"),
});

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type SyncLog = typeof syncLog.$inferSelect;
export type NewSyncLog = typeof syncLog.$inferInsert;
