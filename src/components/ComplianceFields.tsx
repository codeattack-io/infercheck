import { useTranslations } from "next-intl";
import { BooleanList, BooleanRow } from "@/components/BooleanRow";
import type { Compliance } from "@/lib/compliance";

/** Every compliance field of a provider as a compliance field list. */
export function ComplianceFields({ compliance: c }: { compliance: Compliance }) {
  const t = useTranslations("ComplianceFields");
  const answer = (value: boolean | null) => (value === null ? t("unknownNotStated") : value ? t("yes") : t("no"));
  const unknownText = (value: boolean | null) => (value === null ? t("unknownNotStated") : undefined);
  const trains = c.dataUsage.trainsOnCustomerData;
  const leavesEu = c.dataResidency.dataLeavesEuAtInference;
  const sub = c.subProcessors;

  return (
    <BooleanList>
      <BooleanRow label={t("euOnly")} value={c.dataResidency.euOnly} />
      <BooleanRow
        label={t("inferenceInEu")}
        value={leavesEu === null ? null : !leavesEu}
        valueText={unknownText(leavesEu)}
      />
      <BooleanRow
        label={t("dpa")}
        value={c.dpa.available}
        valueText={
          c.dpa.available && c.dpa.signedVia !== "not_available"
            ? t("withDetail", { answer: t("yes"), detail: t(`dpaSignedVia.${c.dpa.signedVia}`) })
            : undefined
        }
        href={c.dpa.url ?? undefined}
      />
      <BooleanRow label={t("noTraining")} value={trains === null ? null : !trains} valueText={unknownText(trains)} />
      <BooleanRow label={t("sccs")} value={c.sccs} valueText={unknownText(c.sccs)} />
      <BooleanRow
        label={t("adequacy")}
        value={c.adequacyDecision}
        valueText={
          c.headquarters && c.adequacyDecision !== null
            ? t("withCountry", { answer: answer(c.adequacyDecision), country: c.headquarters })
            : unknownText(c.adequacyDecision)
        }
      />
      <BooleanRow
        label={t("subProcessors")}
        value={sub.disclosed}
        valueText={
          !sub.disclosed
            ? t("subProcessorsHidden")
            : sub.includesEuEntities === null
              ? t("subProcessorsDisclosed")
              : t(sub.includesEuEntities ? "subProcessorsWithEu" : "subProcessorsWithoutEu")
        }
        href={sub.url ?? undefined}
      />
      <BooleanRow
        label={t("certifications")}
        valueText={c.certifications.length > 0 ? c.certifications.join(", ") : t("certificationsNone")}
      />
      <BooleanRow label={t("euAiAct")} valueText={t(`euAiActStatus.${c.euAiAct.status}`)} />
    </BooleanList>
  );
}
