"use client";

// ProviderModelRow: a single row in the provider page model table.
// Client component so we can handle hover state and row-level navigation.

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Model } from "@/db/schema";

// ─── Helpers (duplicated from provider page to keep this component self-contained) ─

function formatPrice(val: string | null | undefined): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n === 0) return "free";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

function formatContext(ctx: number | null): string {
  if (!ctx) return "—";
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
  if (ctx >= 1_000) return `${(ctx / 1_000).toFixed(0)}K`;
  return `${ctx}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ProviderModelRowProps {
  model: Model;
  gateway?: boolean;
}

export function ProviderModelRow({ model: m, gateway = false }: ProviderModelRowProps) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

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
          <span className="font-body text-[0.875rem] font-medium text-text-primary">
            {m.displayName}
          </span>
          {gateway ? (
            <span
              className="inline-flex items-center px-[6px] py-px font-body text-[0.625rem] font-medium rounded border whitespace-nowrap"
              style={{
                color: "var(--color-partial)",
                borderColor: "var(--color-partial)",
                backgroundColor: "color-mix(in srgb, var(--color-partial) 8%, transparent)",
              }}
            >
              via gateway
            </span>
          ) : null}
        </div>
        <div className="font-mono text-xs text-text-muted mt-0.5">{m.id}</div>
      </td>
      <td className="px-4 py-[10px] font-body text-[0.8125rem] text-text-secondary">
        {m.modality}
      </td>
      <td className="px-4 py-[10px] font-mono text-[0.8125rem] text-text-secondary">
        {formatContext(m.contextWindow)}
      </td>
      <td className="px-4 py-[10px] font-mono text-[0.8125rem] text-text-secondary">
        {formatPrice(m.inputPricePerMTokens)}
      </td>
      <td className="px-4 py-[10px] font-mono text-[0.8125rem] text-text-secondary">
        {formatPrice(m.outputPricePerMTokens)}
      </td>
    </tr>
  );
}
