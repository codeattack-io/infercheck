import { useTranslations } from "next-intl";

interface GatewayPillProps {
  size?: "sm" | "md";
  title?: string;
}

const SIZE_CLASSES = {
  sm: "px-[6px] text-[0.625rem]",
  md: "gap-[5px] px-[7px] text-[0.6875rem]",
};

export function GatewayPill({ size = "md", title }: GatewayPillProps) {
  const t = useTranslations("GatewayPill");

  return (
    <span
      className={`inline-flex items-center py-px font-body font-medium rounded border whitespace-nowrap text-partial border-partial bg-[color-mix(in_srgb,var(--color-partial)_8%,transparent)] ${SIZE_CLASSES[size]}`}
      title={title}
    >
      {t("label")}
    </span>
  );
}
