import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { TierIcon } from "@/components/ComplianceBadge";
import type { ComplianceTier } from "@/lib/compliance";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// NOTE: ImageResponse cannot read CSS custom properties; these mirror the @theme tokens in globals.css.
const COLORS = {
  bg: "#f7f6f1",
  border: "#e4e1d9",
  textPrimary: "#161a1f",
  textMuted: "#5b6470",
  accent: "#1d4ed8",
};

const TIER_COLORS: Record<ComplianceTier, { text: string; bg: string }> = {
  compliant: { text: "#15803d", bg: "#e9f8ee" },
  partial: { text: "#855900", bg: "#fdf5d9" },
  noncompliant: { text: "#b42318", bg: "#fdecea" },
  unverified: { text: "#4b5563", bg: "#eef0f3" },
};

const TIERS = Object.keys(TIER_COLORS) as ComplianceTier[];

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OgImage" });
  const tTier = await getTranslations({ locale, namespace: "ComplianceBadge" });

  const [dmSansRegular, dmSansSemiBold, instrumentSerif, icon] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/DMSans-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/DMSans-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(process.cwd(), "public/logos/infercheck/icon-color.svg"), "base64"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: COLORS.bg,
        color: COLORS.textPrimary,
        fontFamily: "DM Sans",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <img src={`data:image/svg+xml;base64,${icon}`} width={60} height={60} alt="" />
          <div style={{ display: "flex", fontSize: 42, fontWeight: 600 }}>
            <span>Infer</span>
            <span style={{ color: COLORS.accent }}>Check</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: COLORS.textMuted }}>infercheck.eu</div>
      </div>

      <div
        style={{
          display: "flex",
          fontFamily: "Instrument Serif",
          fontSize: 80,
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
          maxWidth: 1000,
        }}
      >
        {t("title")}
      </div>

      <div style={{ display: "flex", gap: 12, paddingTop: 32, borderTop: `2px solid ${COLORS.border}` }}>
        {TIERS.map((tier) => (
          <div
            key={tier}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 20px 8px 16px",
              borderRadius: 999,
              fontSize: 24,
              fontWeight: 600,
              color: TIER_COLORS[tier].text,
              background: TIER_COLORS[tier].bg,
            }}
          >
            <TierIcon tier={tier} size={22} />
            {tTier(`short.${tier}`)}
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "DM Sans", data: dmSansRegular, weight: 400, style: "normal" },
        { name: "DM Sans", data: dmSansSemiBold, weight: 600, style: "normal" },
        { name: "Instrument Serif", data: instrumentSerif, weight: 400, style: "normal" },
      ],
    }
  );
}
