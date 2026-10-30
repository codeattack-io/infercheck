import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { VerificationLabel } from "@/components/VerificationLabel";
import { getComplianceTier, isFullProvider, TIER_CLASSES } from "@/lib/compliance";
import type { AnyProvider } from "@/lib/compliance";

interface ProviderCardProps {
  provider: AnyProvider;
  modelCount?: number;
}

export async function ProviderCard({ provider, modelCount }: ProviderCardProps) {
  const tier = getComplianceTier(provider);
  const t = await getTranslations("ProviderCard");
  const tType = await getTranslations("ProviderType");

  return (
    <Link
      href={`/provider/${provider.slug}`}
      className={`block bg-surface border border-border border-l-3 ${TIER_CLASSES[tier].line} rounded-card text-inherit no-underline transition-colors duration-100 ease-out hover:bg-row-hover px-5 py-4`}
    >
      {/* Name + tier */}
      <div className="flex items-start justify-between gap-2 mb-[10px]">
        <span className="font-body text-[0.9375rem] font-semibold text-text-primary leading-[1.3]">
          {provider.name}
        </span>
        <ComplianceBadge tier={tier} compliance={isFullProvider(provider) ? provider.compliance : null} />
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-13 text-text-muted">
          {tType(provider.type)}
          {modelCount !== undefined
            ? ` · ${modelCount !== 1 ? t("modelCountPlural", { count: modelCount }) : t("modelCount", { count: modelCount })}`
            : ""}
        </span>
        <VerificationLabel provider={provider} className="text-13 text-text-muted" />
      </div>
    </Link>
  );
}
