import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface BooleanRowProps {
  label: string;
  value?: boolean | null;
  valueText?: string;
  href?: string;
}

export function BooleanList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={`m-0 list-none divide-y divide-border p-0 ${className ?? ""}`}>{children}</ul>;
}

export function BooleanRow({ label, value, valueText, href }: BooleanRowProps) {
  const t = useTranslations("BooleanRow");
  const answer = value === undefined ? null : value === true ? t("yes") : value === false ? t("no") : t("unknown");
  const shown = valueText ?? answer;

  return (
    <li className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-2.5 py-[5px]">
      <Mark value={value} />
      <div className="min-w-0">
        <span className="block text-15 leading-[1.4] text-text-primary">
          {label}
          {answer !== null ? <span className="sr-only">: {answer}</span> : null}
        </span>
        {shown ? (
          <span
            className="block text-14 text-text-muted"
            aria-hidden={valueText === undefined && href === undefined ? "true" : undefined}
          >
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline">
                {shown}
              </a>
            ) : (
              shown
            )}
          </span>
        ) : null}
      </div>
    </li>
  );
}

const MARK_CLASS = "mt-[3px] size-4";

function Mark({ value }: { value: boolean | null | undefined }) {
  if (value === true) {
    return (
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${MARK_CLASS} text-compliant-text`}
      >
        <path d="m3 8.5 3.2 3L13 4.5" />
      </svg>
    );
  }
  if (value === false) {
    return (
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={`${MARK_CLASS} text-noncompliant-text`}
      >
        <path d="m4 4 8 8M12 4l-8 8" />
      </svg>
    );
  }
  if (value === null) {
    return (
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={`${MARK_CLASS} text-unverified-text`}
      >
        <path d="M5.6 6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6" />
        <circle cx="8" cy="12.6" r=".7" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`${MARK_CLASS} text-text-muted`}>
      <circle cx="8" cy="8" r="2.5" fill="currentColor" />
    </svg>
  );
}
