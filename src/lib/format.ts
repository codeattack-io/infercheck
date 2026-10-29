export interface PriceFormat {
  locale: string;
  freeLabel: string;
  currency?: string;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, digits: number, currency?: string): Intl.NumberFormat {
  const key = `${locale}|${currency ?? ""}|${digits}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      ...(currency ? { style: "currency", currency } : {}),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
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
  const digits = n < 0.01 ? 4 : n < 1 ? 3 : 2;
  return numberFormat(locale, digits, currency).format(n);
}

export function formatContext(n: number | null, locale: string): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${numberFormat(locale, 1).format(n / 1_000_000)}M`;
  if (n >= 1_000) return `${numberFormat(locale, 0).format(n / 1_000)}K`;
  return `${n}`;
}
