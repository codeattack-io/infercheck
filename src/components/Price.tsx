import { useLocale, useTranslations } from "next-intl";
import type { CatalogModel } from "@/components/types";
import { formatPrice } from "@/lib/format";

type PriceProps = { model: Pick<CatalogModel, "inputPricePerMTokens" | "outputPricePerMTokens" | "priceCurrency"> };

/** Input · output price per 1M tokens, or "Price not published" when neither is known. */
export function Price({ model }: PriceProps) {
  const t = useTranslations("ModelRow");
  const tf = useTranslations("Format");
  const locale = useLocale();
  if (model.inputPricePerMTokens === null && model.outputPricePerMTokens === null) {
    return <span className="text-14 text-text-muted">{t("priceNotPublished")}</span>;
  }
  const format = { locale, freeLabel: tf("free"), currency: model.priceCurrency };
  return (
    <>
      <span className="inline-block min-w-[4.6em] text-right max-md:min-w-0">
        {formatPrice(model.inputPricePerMTokens, format)}
      </span>
      <span aria-hidden="true" className="px-1 text-border-strong">
        ·
      </span>
      <span className="inline-block min-w-[4.6em] text-right max-md:min-w-0">
        {formatPrice(model.outputPricePerMTokens, format)}
      </span>
    </>
  );
}
