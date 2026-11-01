/* Shared class strings so new screens reuse the exact surfaces and
   buttons already established on the Home dashboard. */
export const CARD = "rounded-2xl border border-line bg-surface";

export const ICON_TILE = "grid shrink-0 place-items-center rounded-xl ring-1";

export const LINK_BUTTON =
  "flex items-center gap-1.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-strong";

const BUTTON_SIZES = {
  md: "px-4 py-2.5 text-[14px]",
  sm: "px-3 py-2 text-[13px]",
  icon: "p-2.5",
};

const BUTTON_VARIANTS = {
  primary: "bg-brand-strong text-white hover:bg-brand",
  secondary: "border border-line bg-surface-2 hover:bg-surface-3",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
  brandSoft: "border border-brand/40 bg-brand/10 text-brand hover:bg-brand/15",
  pinkSoft: "border border-pink/40 bg-pink/10 text-pink hover:bg-pink/15",
  purpleSoft: "border border-purple/40 bg-purple/10 text-purple hover:bg-purple/15",
};

export const btn = (variant = "secondary", size = "md") =>
  [
    "flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    BUTTON_SIZES[size],
    BUTTON_VARIANTS[variant],
  ].join(" ");
