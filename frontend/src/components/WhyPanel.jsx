import { CheckCircle2 } from "lucide-react";
import { BENEFITS } from "../data/content";

export default function WhyPanel() {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-[19px] font-semibold">Why Promptogen?</h2>
      <ul className="mt-5 space-y-4">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-brand" strokeWidth={2} />
            <span className="text-[14px] leading-6 text-muted">{benefit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
