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
    <time dateTime={date} className={className}>
      {kind === "ai_draft"
        ? t.rich("aiDraft", {
            date,
            abbr: (chunks) => (
              <abbr
                title={t("aiDraftHint")}
                className="cursor-help underline decoration-dotted underline-offset-[0.2em]"
              >
                {chunks}
              </abbr>
            ),
          })
        : t("verified", { date })}
    </time>
  );
}
