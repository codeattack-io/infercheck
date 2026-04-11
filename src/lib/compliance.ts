// Pure compliance logic — no Node.js APIs, no server-only imports.
// Safe to import in both server and client components.
//
// Types come directly from data/schema.ts (Zod-inferred, no runtime code).

import type { Provider, AnyProvider } from "@/../data/schema";

export type { Provider, AnyProvider };

export type ComplianceTier = "compliant" | "partial" | "noncompliant" | "unverified";

export interface ComplianceFilter {
  euOnly?: boolean;
  dpa?: boolean;
  noTraining?: boolean;
  sccs?: boolean;
}

export type FilterProfile = "strict-eu" | "eu-sccs" | "no-training" | "custom" | null;

// ─── Filter state ─────────────────────────────────────────────────────────────

export interface FilterState {
  profile: FilterProfile;
  custom: ComplianceFilter;
}

const VALID_PROFILES: FilterProfile[] = ["strict-eu", "eu-sccs", "no-training", "custom", null];

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

// ─── Guards ───────────────────────────────────────────────────────────────────

/**
 * Narrow type guard: is this a fully verified provider (not a stub)?
 */
export function isFullProvider(p: AnyProvider): p is Provider {
  return p.compliance !== null && p.verifiedBy !== "stub";
}

// ─── Tier ─────────────────────────────────────────────────────────────────────

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

// ─── Filter ───────────────────────────────────────────────────────────────────

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
