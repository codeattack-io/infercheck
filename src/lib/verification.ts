import type { AnyProvider } from "@/lib/compliance";

export type VerificationKind = "ai_draft" | "human" | "none";

export interface Verification {
  kind: VerificationKind;
  date: string | null;
}

export function getVerification(p: Pick<AnyProvider, "verifiedBy" | "lastVerified">): Verification {
  if (p.verifiedBy === "stub" || !p.lastVerified) return { kind: "none", date: null };
  return { kind: p.verifiedBy === "ai_draft" ? "ai_draft" : "human", date: p.lastVerified };
}
