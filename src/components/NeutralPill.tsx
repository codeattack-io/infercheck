import type { ReactNode } from "react";

interface NeutralPillProps {
  children: ReactNode;
  surface?: "plain" | "alt";
  title?: string;
  className?: string;
}

const SURFACE_CLASSES = {
  plain: "px-2 py-px",
  alt: "bg-surface-alt px-2.5 py-0.5",
};

export function NeutralPill({ children, surface = "plain", title, className }: NeutralPillProps) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center rounded-full border border-border text-13 font-medium text-text-muted whitespace-nowrap",
        SURFACE_CLASSES[surface],
        title ? "cursor-help" : "",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
