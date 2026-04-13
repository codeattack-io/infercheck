import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1520",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid / noise texture via radial gradients */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #1d4ed820 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, #1d4ed810 0%, transparent 70%)",
          }}
        />

        {/* Icon + Wordmark row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
            marginBottom: 40,
          }}
        >
          {/* Icon — rounded square, blue bg */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 26,
              background: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 0 0 1px #2563eb40",
            }}
          >
            {/* Magnifier SVG inlined */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              width="70"
              height="70"
            >
              {/* Magnifier ring */}
              <circle
                cx="13"
                cy="13"
                r="8"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              {/* Handle */}
              <line
                x1="19"
                y1="19"
                x2="25"
                y2="25"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Tick */}
              <polyline
                points="9,13 12,17 18,8"
                fill="none"
                stroke="#4ade80"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
            <span
              style={{
                fontSize: 88,
                fontWeight: 600,
                color: "#f8fafc",
                letterSpacing: "-2px",
                lineHeight: 1,
              }}
            >
              Infer
            </span>
            <span
              style={{
                fontSize: 88,
                fontWeight: 600,
                color: "#3b82f6",
                letterSpacing: "-2px",
                lineHeight: 1,
              }}
            >
              Check
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 28,
            color: "#94a3b8",
            margin: 0,
            letterSpacing: "-0.3px",
            textAlign: "center",
            maxWidth: 780,
            lineHeight: 1.4,
          }}
        >
          Find GDPR-compliant AI inference providers
        </p>

        {/* Bottom badge row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 48,
          }}
        >
          {[
            { label: "EU Data Residency", color: "#16a34a", bg: "#14532d30" },
            { label: "DPA Available", color: "#3b82f6", bg: "#1e3a8a30" },
            { label: "Training Opt-out", color: "#f59e0b", bg: "#78350f30" },
          ].map(({ label, color, bg }) => (
            <div
              key={label}
              style={{
                padding: "8px 18px",
                borderRadius: 9999,
                background: bg,
                border: `1px solid ${color}40`,
                color,
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.2px",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Domain label */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            right: 52,
            fontSize: 20,
            color: "#334155",
            letterSpacing: "0.5px",
          }}
        >
          infercheck.eu
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
