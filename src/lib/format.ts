export interface PriceFormat {
  locale: string;
  freeLabel: string;
  currency?: string;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, digits: number, currency?: string, maxDigits = digits): Intl.NumberFormat {
  const key = `${locale}|${currency ?? ""}|${digits}|${maxDigits}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      ...(currency ? { style: "currency", currency } : {}),
      minimumFractionDigits: digits,
      maximumFractionDigits: maxDigits,
    });
    numberFormats.set(key, format);
  }
  return format;
}

export function formatPrice(
  val: string | null | undefined,
  { locale, freeLabel, currency = "USD" }: PriceFormat
): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n === 0) return freeLabel;
  return numberFormat(locale, 2, currency, n < 0.01 ? 4 : 3).format(n);
}

export function formatContext(n: number | null, locale: string): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${numberFormat(locale, 1).format(n / 1_000_000)}M`;
  if (n >= 1_000) return `${numberFormat(locale, 0).format(n / 1_000)}K`;
  return `${n}`;
}

const AUTHOR_PREFIX = /^[A-Za-z][\w.\- ]{0,29}:\s+/;

/** The model name without the "<Author>: " prefix that OpenRouter puts in front of it. */
export function modelDisplayName(name: string): string {
  return name.replace(AUTHOR_PREFIX, "") || name;
}
