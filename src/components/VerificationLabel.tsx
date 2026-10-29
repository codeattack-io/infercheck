import { useTranslations } from "next-intl";
import { getVerification } from "@/lib/verification";
import type { AnyProvider } from "@/lib/compliance";

interface VerificationLabelProps {
  provider: Pick<AnyProvider, "verifiedBy" | "lastVerified">;
  className?: string;
}

export function VerificationLabel({ provider, className }: VerificationLabelProps) {
  const t = useTranslations("Verification");
  const { kind, date } = getVerification(provider);
  if (kind === "none" || date === null) return null;

  return (
    <time dateTime={date} className={className} title={kind === "ai_draft" ? t("aiDraftHint") : undefined}>
      {kind === "ai_draft" ? t("aiDraft", { date }) : t("verified", { date })}
    </time>
  );
}
