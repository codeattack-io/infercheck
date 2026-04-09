// Server component — static, no interactivity needed.

export function DisclaimerBanner() {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface-alt)",
        borderLeft: "3px solid var(--color-border)",
        padding: "10px 16px",
      }}
      role="note"
      aria-label="Disclaimer"
    >
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-body)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        This directory provides sourced information about AI providers&apos; data practices. It is
        not legal advice. Always verify directly with the provider and consult legal counsel for
        compliance decisions.
      </p>
    </div>
  );
}
