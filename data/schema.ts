import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const ProviderTypeSchema = z.enum(["api_provider", "cloud_platform", "gateway"]);

export const DpaSignedViaSchema = z.enum(["online_acceptance", "custom_contract", "not_available"]);

export const EuAiActStatusSchema = z.enum(["compliant", "monitoring", "unknown", "not_applicable"]);

export const PricingTierSchema = z.enum(["free_tier", "pay_per_use", "enterprise_only"]);

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

export const DataResidencySchema = z.object({
  /** ISO 3166-1 alpha-2 country/region codes where data can be processed */
  regions: z.array(z.string()),
  /** Can the provider guarantee EU-only data processing? */
  euOnly: z.boolean(),
  /**
   * Does inference compute (GPU processing) leave the EU?
   * false = full EU data residency including GPU processing
   * true  = data may be stored in EU but inference runs outside (e.g. CDN routing)
   * null  = unknown
   */
  dataLeavesEuAtInference: z.boolean().nullable(),
  /** Plain-language explanation of EU routing options */
  euRegionDetails: z.string().nullable(),
});

export const DpaSchema = z.object({
  available: z.boolean(),
  url: z.string().url().nullable(),
  signedVia: DpaSignedViaSchema,
});

export const DataUsageSchema = z.object({
  /** Does the provider train on API customer data by default? */
  trainsOnCustomerData: z.boolean(),
  optOutAvailable: z.boolean(),
  /** Plain-language retention summary */
  retentionPolicy: z.string().nullable(),
  /** Additional context */
  details: z.string().nullable(),
});

export const SubProcessorsSchema = z.object({
  disclosed: z.boolean(),
  url: z.string().url().nullable(),
  includesEuEntities: z.boolean().nullable(),
});

export const EuAiActSchema = z.object({
  status: EuAiActStatusSchema,
  details: z.string().nullable(),
});

export const ComplianceSchema = z.object({
  /** ISO 3166-1 alpha-2 country code of headquarters */
  headquarters: z.string().length(2).toUpperCase(),
  dataResidency: DataResidencySchema,
  dpa: DpaSchema,
  dataUsage: DataUsageSchema,
  subProcessors: SubProcessorsSchema,
  /**
   * Security/compliance certifications.
   * Common values: "SOC2", "ISO27001", "ISO27701", "C5", "HDS"
   */
  certifications: z.array(z.string()),
  euAiAct: EuAiActSchema,
  /** Standard Contractual Clauses in place? */
  sccs: z.boolean().nullable(),
  /** Provider HQ country has EU adequacy decision? */
  adequacyDecision: z.boolean(),
});

// ─── Root Provider Schema ─────────────────────────────────────────────────────

export const ProviderSchema = z.object({
  /** URL-safe identifier, matches filename without extension */
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  type: ProviderTypeSchema,
  website: z.string().url(),
  apiDocsUrl: z.string().url().nullable(),
  /** Path to SVG logo in /public/logos/, e.g. "/logos/openai.svg" */
  logoPath: z.string().nullable(),
  compliance: ComplianceSchema,
  pricingTier: PricingTierSchema,
  /** ISO date of last manual verification */
  lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  /** Who verified this entry: "carlo", "ai_draft", or contributor handle */
  verifiedBy: z.string(),
  /** Evidence trail: direct links to source documents */
  sourceUrls: z.array(z.string().url()),
  /** Plain-language editorial notes */
  notes: z.string().nullable(),
});

// ─── Stub schema (used by import script for seed data) ───────────────────────
// A stub has identity fields populated but compliance fields are null/unknown.

export const ProviderStubSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  type: ProviderTypeSchema,
  website: z.string().url().nullable(),
  apiDocsUrl: z.string().url().nullable(),
  logoPath: z.string().nullable(),
  compliance: z.null(),
  pricingTier: PricingTierSchema.nullable(),
  lastVerified: z.string().nullable(),
  verifiedBy: z.literal("stub"),
  sourceUrls: z.array(z.string()),
  notes: z.string().nullable(),
});

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type ProviderType = z.infer<typeof ProviderTypeSchema>;
export type Compliance = z.infer<typeof ComplianceSchema>;
export type DataResidency = z.infer<typeof DataResidencySchema>;
export type Dpa = z.infer<typeof DpaSchema>;
export type DataUsage = z.infer<typeof DataUsageSchema>;
export type SubProcessors = z.infer<typeof SubProcessorsSchema>;
export type EuAiAct = z.infer<typeof EuAiActSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type ProviderStub = z.infer<typeof ProviderStubSchema>;

/** Either a fully verified provider or an import stub */
export type AnyProvider = Provider | ProviderStub;
