import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { getComplianceTier, isFullProvider, TIER_CLASSES } from "@/lib/compliance";
import type { AnyProvider } from "@/lib/compliance";

interface ProviderRowProps {
  provider: AnyProvider;
  modelCount: number;
  /** Outside the active compliance filter: muted, and announced as not matching. */
  dimmed?: boolean;
}

export function ProviderRow({ provider, modelCount, dimmed = false }: ProviderRowProps) {
  const t = useTranslations("ProviderRow");
  const tType = useTranslations("ProviderType");
  const tier = getComplianceTier(provider);
  const tierLine = TIER_CLASSES[tier].line;
  const compliance = isFullProvider(provider) ? provider.compliance : null;
  const residency = compliance
    ? compliance.dataResidency.euOnly
      ? t("euResidency")
      : compliance.dataResidency.regions.join(", ") || "—"
    : "—";

  return (
    <tr
      data-dimmed={dimmed ? "" : undefined}
      className={`group relative transition-colors duration-150 ease-out hover:bg-row-hover max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:border-b max-md:border-l-3 max-md:border-b-border max-md:py-3 max-md:pr-3.5 max-md:pl-[13px] max-md:last:border-b-0 ${tierLine}`}
    >
      <td
        className={`border-b border-b-border py-3 pr-4 pl-[17px] align-middle group-last:border-b-0 md:border-l-3 max-md:border-0 max-md:p-0 ${tierLine}`}
      >
        <Link
          href={`/provider/${provider.slug}`}
          className="block text-16 leading-[1.35] font-medium text-pretty text-text-primary no-underline after:absolute after:inset-0 after:content-[''] focus-visible:rounded-[3px] focus-visible:outline-offset-3"
        >
          {dimmed ? <span className="sr-only">{t("dimmed")} </span> : null}
          {provider.name}
        </Link>
        <span className="mt-0.5 block text-14 text-text-muted max-md:text-15">{tType(provider.type)}</span>
      </td>
      <td className="border-b border-b-border px-4 py-3 align-middle group-last:border-b-0 max-md:self-start max-md:border-0 max-md:p-0">
        <ComplianceBadge tier={tier} label="long" compliance={compliance} className="relative" />
      </td>
      <td className="border-b border-b-border px-4 py-3 align-middle text-15 text-text-secondary group-last:border-b-0 max-md:border-0 max-md:p-0">
        {residency}
      </td>
      <td className="border-b border-b-border px-4 py-3 text-right align-middle text-15 whitespace-nowrap text-text-secondary tabular-nums group-last:border-b-0 max-md:border-0 max-md:p-0 max-md:text-text-muted">
        <span className="max-md:hidden">{modelCount}</span>
        <span className="md:hidden">{t("modelCount", { count: modelCount })}</span>
      </td>
      <td className="w-11 border-b border-b-border py-3 pr-3.5 pl-0 text-right align-middle group-last:border-b-0 max-md:hidden">
        <svg
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="inline-block size-[18px] text-text-muted"
          aria-hidden="true"
        >
          <path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" />
        </svg>
      </td>
    </tr>
  );
}
