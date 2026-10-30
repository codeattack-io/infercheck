"use client";

import { memo, useId, useState, type MouseEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { FuseResultMatch } from "fuse.js";
import { Link } from "@/i18n/navigation";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { ComplianceFields } from "@/components/ComplianceFields";
import { GatewayPill } from "@/components/GatewayPill";
import { Price } from "@/components/Price";
import { VerificationLabel } from "@/components/VerificationLabel";
import { getComplianceTier, isFullProvider, TIER_CLASSES } from "@/lib/compliance";
import { providerName as getProviderName, type PrimaryColumn } from "@/lib/model-list";
import { buttonClass } from "@/lib/styles";
import type { ModelWithProvider } from "@/components/types";

function highlight(text: string, matches: readonly FuseResultMatch[] | undefined, key: string): ReactNode {
  const indices = matches?.find((m) => m.key === key && m.value === text)?.indices;
  if (!indices?.length) return text;

  const merged: [number, number][] = [];
  for (const [start, end] of indices.toSorted((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <mark key={start} className="rounded-[2px] bg-accent-subtle text-inherit">
        {text.slice(start, end + 1)}
      </mark>
    );
    cursor = end + 1;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

interface ModelRowProps {
  item: ModelWithProvider;
  dimmed?: boolean;
  matches?: readonly FuseResultMatch[];
  primary?: PrimaryColumn;
}

function ModelRowInner({ item, dimmed = false, matches, primary = "model" }: ModelRowProps) {
  const { model, provider } = item;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const t = useTranslations("ModelRow");
  const tType = useTranslations("ProviderType");

  const tier = provider ? getComplianceTier(provider) : "unverified";
  const line = TIER_CLASSES[tier].line;
  const compliance = provider && isFullProvider(provider) ? provider.compliance : null;
  const providerName = getProviderName(item);
  const toggle = () => setOpen((value) => !value);

  const onRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as Element).closest("a, button, [title]")) return;
    if (window.getSelection()?.type === "Range") return;
    toggle();
  };

  const name =
    primary === "model"
      ? highlight(model.displayName, matches, "model.displayName")
      : highlight(providerName, matches, "provider.name");
  const secondary =
    primary === "model" ? highlight(providerName, matches, "provider.name") : provider ? tType(provider.type) : null;

  return (
    <>
      <tr
        onClick={onRowClick}
        data-dimmed={dimmed ? "" : undefined}
        data-open={open ? "" : undefined}
        className={`group relative cursor-pointer transition-colors duration-150 ease-out hover:bg-row-hover data-open:bg-row-hover max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:border-b max-md:border-l-3 max-md:border-b-border max-md:py-3 max-md:pr-3.5 max-md:pl-[13px] max-md:[grid-template-areas:'model_comp'_'num_num'] ${line}`}
      >
        <td
          className={`border-b border-border py-3 pr-4 pl-[17px] align-middle md:border-l-3 ${line} max-md:block max-md:border-0 max-md:p-0 max-md:[grid-area:model]`}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              data-row-button
              onClick={toggle}
              aria-expanded={open}
              aria-controls={panelId}
              className="cursor-pointer text-left text-16 leading-[1.35] font-medium text-pretty text-text-primary focus-visible:rounded-[3px] focus-visible:outline-offset-3 max-md:after:absolute max-md:after:inset-0 max-md:after:content-['']"
            >
              {dimmed ? <span className="sr-only">{t("dimmed")} </span> : null}
              {name}
            </button>
            {primary === "model" && !model.isNativeModel ? <GatewayPill providerName={providerName} /> : null}
          </span>
          {secondary ? <span className="mt-0.5 block text-14 text-text-muted max-md:text-15">{secondary}</span> : null}
        </td>
        <td className="border-b border-border px-4 py-3 align-middle max-md:block max-md:self-start max-md:border-0 max-md:p-0 max-md:[grid-area:comp]">
          <ComplianceBadge tier={tier} compliance={compliance} />
        </td>
        <td className="border-b border-border px-4 py-3 align-middle text-15 text-text-secondary max-md:hidden">
          {compliance === null
            ? "—"
            : compliance.dataResidency.euOnly
              ? t("euResidency")
              : compliance.dataResidency.regions.join(", ") || "—"}
        </td>
        <td className="border-b border-border px-4 py-3 text-right align-middle text-15 whitespace-nowrap tabular-nums max-md:block max-md:border-0 max-md:p-0 max-md:text-left max-md:text-16 max-md:[grid-area:num]">
          <Price model={model} />
        </td>
        <td className="w-11 border-b border-border py-3 pr-3.5 pl-0 text-right align-middle max-md:hidden">
          <svg
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="inline-block size-[18px] align-middle text-text-muted transition-transform duration-150 ease-out group-data-open:rotate-180"
          >
            <path d="m4.5 7 4.5 4.5L13.5 7" />
          </svg>
        </td>
      </tr>
      {open ? (
        <tr id={panelId} className="max-md:block">
          <td colSpan={5} className="border-b border-border bg-surface-sunken p-0 max-md:block">
            <ModelPanel item={item} line={dimmed ? "border-l-border-strong" : line} primary={primary} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export const ModelRow = memo(ModelRowInner);

const LABEL_CLASS = "m-0 mb-2 text-13 font-semibold text-text-muted";
const PROSE_CLASS = "m-0 max-w-[62ch] text-15 text-pretty text-text-secondary";

function ModelPanel({ item, line, primary }: { item: ModelWithProvider; line: string; primary: PrimaryColumn }) {
  const { model, provider } = item;
  const t = useTranslations("ModelRow");
  const tType = useTranslations("ProviderType");
  const providerName = getProviderName(item);
  const compliance = provider && isFullProvider(provider) ? provider.compliance : null;

  const notes: { label: string; text: string }[] = [];
  if (compliance?.dataResidency.euRegionDetails) {
    notes.push({ label: t("euRouting"), text: compliance.dataResidency.euRegionDetails });
  }
  if (compliance?.dataUsage.retentionPolicy) {
    notes.push({ label: t("retention"), text: compliance.dataUsage.retentionPolicy });
  }
  if (!model.isNativeModel) {
    notes.push({ label: t("gateway"), text: t("gatewayNote", { providerName }) });
  }

  const meta = [
    provider ? tType(provider.type) : null,
    compliance?.headquarters ? t("headquarters", { country: compliance.headquarters }) : null,
  ].filter(Boolean);
  const sources = provider?.sourceUrls ?? [];

  return (
    <div
      className={`grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-10 gap-y-5 border-l-3 ${line} px-5 pt-5 pb-6 max-md:grid-cols-1 max-md:gap-[18px] max-md:pt-4 max-md:pr-3.5 max-md:pb-5 max-md:pl-[13px]`}
    >
      <div className="col-span-full flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="m-0 text-17 font-semibold text-text-primary">
          {providerName}
          {meta.length > 0 ? (
            <span className="ml-2 text-15 font-normal text-text-muted">{meta.join(" · ")}</span>
          ) : null}
        </h3>
        <div className="flex flex-wrap gap-2 max-md:flex-col max-md:items-start">
          {primary === "model" && model.canonicalModelId ? (
            <Link href={`/model/${model.canonicalModelId}`} className={`${buttonClass("secondary")} max-md:py-[9px]`}>
              {t("allProviders")}
            </Link>
          ) : null}
          {provider ? (
            <Link href={`/provider/${provider.slug}`} className={`${buttonClass("primary")} max-md:py-[9px]`}>
              {t("fullProviderProfile")}
            </Link>
          ) : null}
        </div>
      </div>

      <div>
        <h4 className={LABEL_CLASS}>{t("compliance")}</h4>
        {compliance ? (
          <ComplianceFields compliance={compliance} />
        ) : (
          <p className={PROSE_CLASS}>{t("noComplianceData")}</p>
        )}
      </div>

      {notes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <Section key={note.label} label={note.label}>
              <p className={PROSE_CLASS}>{note.text}</p>
            </Section>
          ))}
        </div>
      ) : null}

      {sources.length > 0 || compliance ? (
        <div className="col-span-full grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-10 gap-y-5 border-t border-border pt-4 max-md:grid-cols-1">
          {sources.length > 0 ? (
            <Section label={t("sources")}>
              <ul className="m-0 list-none p-0">
                {sources.map((url) => (
                  <li key={url} className="text-14 [overflow-wrap:anywhere]">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline">
                      {url.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {provider && compliance ? (
            <Section label={t("status")} className={sources.length > 0 ? "" : "md:col-start-2"}>
              <VerificationLabel provider={provider} className="text-15 text-text-secondary" />
            </Section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Section({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <h4 className={LABEL_CLASS}>{label}</h4>
      {children}
    </div>
  );
}
