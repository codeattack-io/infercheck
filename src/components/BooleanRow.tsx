import { useTranslations } from "next-intl";

interface BooleanRowProps {
  label: string;
  value: boolean | null;
  href?: string;
  secondary?: string;
  note?: string;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: { row: "flex items-center gap-2", symbol: "text-[0.8125rem]", label: "text-[0.8125rem]" },
  md: { row: "flex items-start gap-[10px]", symbol: "text-[0.875rem] mt-px", label: "text-[0.875rem]" },
};

export function BooleanRow({ label, value, href, secondary, note, size = "sm", className }: BooleanRowProps) {
  const t = useTranslations("BooleanRow");
  const sz = SIZE_CLASSES[size];
  const valueText = value === true ? t("yes") : value === false ? t("no") : t("unknown");
  const symbol = value === true ? "✓" : value === false ? "✗" : "?";
  const symbolColor = value === true ? "text-compliant" : value === false ? "text-noncompliant" : "text-text-muted";

  const labelNode = (
    <span className={`font-body text-text-secondary ${sz.label}`}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-link no-underline">
          {label} ↗
        </a>
      ) : (
        label
      )}
      <span className="sr-only">: {valueText}</span>
    </span>
  );

  return (
    <div className={className ? `${sz.row} ${className}` : sz.row}>
      <span className={`font-mono w-3.5 text-center shrink-0 ${sz.symbol} ${symbolColor}`} aria-hidden="true">
        {symbol}
      </span>
      {size === "md" ? (
        <div>
          {labelNode}
          {secondary ? <span className="font-body text-xs text-text-muted ml-1.5">({secondary})</span> : null}
          {note ? <span className="font-body text-xs text-text-muted italic ml-1.5">{note}</span> : null}
        </div>
      ) : (
        labelNode
      )}
    </div>
  );
}
