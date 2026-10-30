import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GatewayPill } from "@/components/GatewayPill";
import { Price } from "@/components/Price";
import { formatContext } from "@/lib/format";
import type { ProviderModel } from "@/components/types";

interface ProviderModelRowProps {
  model: ProviderModel;
  /** Marks the row as a third-party model served through this provider. */
  gatewayProviderName?: string;
}

const TD_CLASS = "border-b border-border px-4 py-3 align-middle text-15 max-md:border-0 max-md:p-0";

export function ProviderModelRow({ model: m, gatewayProviderName }: ProviderModelRowProps) {
  const t = useTranslations("ProviderPage.models");
  const locale = useLocale();
  const modality = t.has(`modality.${m.modality}`) ? t(`modality.${m.modality}`) : m.modality;
  const href = `/model/${encodeURIComponent(m.canonicalModelId ?? m.id.split("/").pop() ?? m.id)}`;

  return (
    <tr className="group relative transition-colors duration-150 ease-out hover:bg-row-hover max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-baseline max-md:gap-x-3 max-md:gap-y-1.5 max-md:border-b max-md:border-b-border max-md:px-3.5 max-md:py-3">
      <td className={`${TD_CLASS} pl-5 max-md:col-span-full`}>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={href}
            className="text-16 leading-[1.35] font-medium text-pretty text-text-primary no-underline after:absolute after:inset-0 after:content-[''] focus-visible:rounded-[3px] focus-visible:outline-offset-3"
          >
            {m.displayName}
          </Link>
          {gatewayProviderName ? <GatewayPill providerName={gatewayProviderName} className="relative" /> : null}
        </span>
        <span className="mt-0.5 block text-14 text-text-muted [overflow-wrap:anywhere]">{m.id}</span>
      </td>
      <td className={`${TD_CLASS} text-text-secondary max-md:hidden`}>{modality}</td>
      <td
        className={`${TD_CLASS} text-right whitespace-nowrap text-text-secondary tabular-nums max-md:order-last max-md:text-14 max-md:text-text-muted`}
      >
        <span className="md:hidden">{modality} · </span>
        {formatContext(m.contextWindow, locale)}
      </td>
      <td className={`${TD_CLASS} text-right whitespace-nowrap tabular-nums max-md:text-left max-md:text-16`}>
        <Price model={m} />
      </td>
      <td className="w-11 border-b border-border py-3 pr-3.5 pl-0 text-right align-middle max-md:hidden">
        <svg
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="inline-block size-[18px] align-middle text-text-muted"
        >
          <path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" />
        </svg>
      </td>
    </tr>
  );
}
