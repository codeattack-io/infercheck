// Pure compliance logic — no Node.js APIs, no server-only imports.
// Safe to import in both server and client components.
//
// Types come directly from data/schema.ts (Zod-inferred, no runtime code).

import type { Provider, AnyProvider, Compliance } from "@/../data/schema";

export type { Provider, AnyProvider, Compliance };

export type ComplianceTier = "compliant" | "partial" | "noncompliant" | "unverified";

export interface TierClasses {
  text: string;
  bg: string;
  line: string;
}

export const TIER_CLASSES: Record<ComplianceTier, TierClasses> = {
  compliant: { text: "text-compliant-text", bg: "bg-compliant-bg", line: "border-l-compliant-line" },
  partial: { text: "text-partial-text", bg: "bg-partial-bg", line: "border-l-partial-line" },
  noncompliant: { text: "text-noncompliant-text", bg: "bg-noncompliant-bg", line: "border-l-noncompliant-line" },
  unverified: { text: "text-unverified-text", bg: "bg-unverified-bg", line: "border-l-unverified-line" },
};

export type ComplianceProperty = "euOnly" | "euSccs" | "dpa" | "noTraining" | "trainsOnData" | "trainingUnknown";

export function getComplianceProperties(c: Compliance): ComplianceProperty[] {
  const properties: ComplianceProperty[] = [];
  if (c.dataResidency.euOnly) properties.push("euOnly");
  else if (c.sccs) properties.push("euSccs");
  if (c.dpa.available) properties.push("dpa");
  const trains = c.dataUsage.trainsOnCustomerData;
  properties.push(trains === true ? "trainsOnData" : trains === false ? "noTraining" : "trainingUnknown");
  return properties;
}

export interface ComplianceFilter {
  euOnly?: boolean;
  dpa?: boolean;
  noTraining?: boolean;
  sccs?: boolean;
}

export type FilterProfile = "strict-eu" | "eu-sccs" | "no-training" | "custom" | null;

export type PresetProfile = Exclude<FilterProfile, "custom" | null>;

export const PRESET_FILTERS: Record<PresetProfile, ComplianceFilter> = {
  "strict-eu": { euOnly: true, dpa: true, noTraining: true },
  "eu-sccs": { dpa: true, sccs: true, noTraining: true },
  "no-training": { noTraining: true },
};

export const PRESET_IDS = Object.keys(PRESET_FILTERS) as PresetProfile[];

export interface FilterState {
  profile: FilterProfile;
  custom: ComplianceFilter;
}

const VALID_PROFILES: FilterProfile[] = [...PRESET_IDS, "custom", null];

/**
 * Parse filter state from URL search params.
 * Safe to call on both server and client.
 */
export function filterStateFromSearchParams(params: URLSearchParams): FilterState {
  const raw = params.get("profile") as FilterProfile | null;
  const profile = VALID_PROFILES.includes(raw) ? raw : null;

  const custom: ComplianceFilter = {};
  if (params.get("euOnly") === "true") custom.euOnly = true;
  if (params.get("dpa") === "true") custom.dpa = true;
  if (params.get("noTraining") === "true") custom.noTraining = true;
  if (params.get("sccs") === "true") custom.sccs = true;

  return { profile, custom };
}

/**
 * Narrow type guard: is this a fully verified provider (not a stub)?
 */
export function isFullProvider(p: AnyProvider): p is Provider {
  return p.compliance !== null && p.verifiedBy !== "stub";
}

/**
 * Compute a single compliance tier for display (left-border color, badge).
 *   compliant:    euOnly + dpa + confirmed no training on customer data
 *   partial:      dpa + confirmed no training, but not EU-only (SCCs route)
 *   noncompliant: no dpa, or confirmed trains on customer data
 *   unverified:   stub, null compliance data, or training status unknown
 */
export function getComplianceTier(p: AnyProvider): ComplianceTier {
  if (!isFullProvider(p)) return "unverified";
  const c = p.compliance;

  // null = unknown: cannot claim "no training", so don't elevate tier
  if (c.dataUsage.trainsOnCustomerData === null) return "unverified";

  if (c.dataResidency.euOnly && c.dpa.available && !c.dataUsage.trainsOnCustomerData) {
    return "compliant";
  }

  if (c.dpa.available && !c.dataUsage.trainsOnCustomerData) {
    return "partial";
  }

  if (!c.dpa.available || c.dataUsage.trainsOnCustomerData) {
    return "noncompliant";
  }

  return "unverified";
}

/**
 * Test whether a provider passes all conditions in a compliance filter.
 */
export function providerMatchesFilter(p: AnyProvider, filter: ComplianceFilter): boolean {
  if (!isFullProvider(p)) return false;
  const c = p.compliance;

  if (filter.euOnly && !c.dataResidency.euOnly) return false;
  if (filter.dpa && !c.dpa.available) return false;
  if (filter.noTraining && c.dataUsage.trainsOnCustomerData !== false) return false;
  if (filter.sccs && !c.sccs) return false;

  return true;
}
