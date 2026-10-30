import { useTranslations } from "next-intl";
import { NeutralPill } from "@/components/NeutralPill";

interface GatewayPillProps {
  providerName: string;
}

export function GatewayPill({ providerName }: GatewayPillProps) {
  const t = useTranslations("GatewayPill");

  return <NeutralPill title={t("title", { providerName })}>{t("label")}</NeutralPill>;
}
