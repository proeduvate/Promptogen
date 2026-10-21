import { ChevronDown } from "lucide-react";

/* Native select with the app's field styling. `options` are { value, label, disabled? }. */
export default function SelectInput({ value, onChange, options, className = "", ...rest }) {
  return (
    <span className={`relative block ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-lg border border-line bg-surface-2 py-2.5 pl-3.5 pr-10 text-[14px] text-text outline-none transition-colors focus:border-brand/60"
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
