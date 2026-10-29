"use client";

// ProviderModelRow: a single row in the provider page model table.
// Client component so we can handle hover state and row-level navigation.

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { ProviderModel } from "@/components/types";
import { GatewayPill } from "@/components/GatewayPill";
import { useLocale, useTranslations } from "next-intl";
import { formatContext, formatPrice } from "@/lib/format";

interface ProviderModelRowProps {
  model: ProviderModel;
  gateway?: boolean;
}

export function ProviderModelRow({ model: m, gateway = false }: ProviderModelRowProps) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const tf = useTranslations("Format");
  const priceFormat = { locale, freeLabel: tf("free") };

  const href = `/model/${encodeURIComponent(m.canonicalModelId ?? m.id.split("/").pop() ?? m.id)}`;

  function handleClick() {
    router.push(href);
  }

  return (
    <tr
      key={`${m.id}::${m.providerSlug}`}
      className="border-b border-border last:border-b-0 cursor-pointer transition-colors duration-100 ease-in-out"
      style={{
        backgroundColor: hovered
          ? "color-mix(in srgb, var(--color-surface-alt) 60%, var(--color-surface))"
          : "var(--color-surface)",
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="px-4 py-[10px]">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={href}
            onClick={(e) => e.stopPropagation()}
            className="font-body text-[0.875rem] font-medium text-text-primary no-underline"
          >
            {m.displayName}
          </Link>
          {gateway ? <GatewayPill size="sm" /> : null}
        </div>
        <div className="font-mono text-xs text-text-muted mt-0.5">{m.id}</div>
      </td>
      <td className="px-4 py-[10px] font-body text-[0.8125rem] text-text-secondary">{m.modality}</td>
      <td className="px-4 py-[10px] font-mono text-[0.8125rem] text-text-secondary">
        {formatContext(m.contextWindow, locale)}
      </td>
      <td className="px-4 py-[10px] font-mono text-[0.8125rem] text-text-secondary">
        {formatPrice(m.inputPricePerMTokens, priceFormat)}
      </td>
      <td className="px-4 py-[10px] font-mono text-[0.8125rem] text-text-secondary">
        {formatPrice(m.outputPricePerMTokens, priceFormat)}
      </td>
    </tr>
  );
}
