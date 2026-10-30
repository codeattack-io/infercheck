export type ButtonVariant = "primary" | "secondary";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-button border bg-surface px-3 py-[7px] text-14 font-medium whitespace-nowrap no-underline cursor-pointer transition-colors duration-100 ease-out max-md:text-15";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-accent text-accent-ink hover:bg-accent-subtle",
  secondary: "border-border-strong text-text-secondary hover:border-text-secondary",
};

export function buttonClass(variant: ButtonVariant = "secondary"): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]}`;
}

export const CHIP_CLASS =
  "inline-flex items-center rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-15 leading-[1.4] font-medium text-text-primary whitespace-nowrap cursor-pointer transition-colors duration-100 ease-out hover:border-text-secondary max-md:px-3 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-white";
