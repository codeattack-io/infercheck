import { useTranslations } from "next-intl";
import { NeutralPill } from "@/components/NeutralPill";

interface GatewayPillProps {
  providerName: string;
  className?: string;
}

export function GatewayPill({ providerName, className }: GatewayPillProps) {
  const t = useTranslations("GatewayPill");

  return (
    <NeutralPill title={t("title", { providerName })} className={className}>
      {t("label")}
    </NeutralPill>
  );
}
