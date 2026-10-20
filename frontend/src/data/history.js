import { FilePlus2, Sparkles, Wand2, FlaskConical, Bookmark, Share2, LayoutTemplate, Download } from "lucide-react";

/* Activity types shown on the History timeline. */
export const ACTIVITY_TYPES = {
  created: { label: "Created", icon: FilePlus2, tone: "text-brand", tint: "bg-brand/10 ring-brand/20" },
  generated: { label: "Generated", icon: Sparkles, tone: "text-purple", tint: "bg-purple/10 ring-purple/20" },
  improved: { label: "Improved", icon: Wand2, tone: "text-pink", tint: "bg-pink/10 ring-pink/20" },
  tested: { label: "Tested", icon: FlaskConical, tone: "text-good", tint: "bg-good/10 ring-good/20" },
  saved: { label: "Saved", icon: Bookmark, tone: "text-amber", tint: "bg-amber/10 ring-amber/20" },
  shared: { label: "Shared", icon: Share2, tone: "text-cyan", tint: "bg-cyan/10 ring-cyan/20" },
  template: { label: "Template", icon: LayoutTemplate, tone: "text-brand", tint: "bg-brand/10 ring-brand/20" },
  exported: { label: "Exported", icon: Download, tone: "text-muted", tint: "bg-surface-3 ring-line" },
};

const at = (daysAgo, hours, minutes) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
};

/* Seed timeline (mirrors the spec's example day). New activity from the
   workspace is added on top at runtime.
   Hand-off point: load the timeline from the history API. */
export const SEED_ACTIVITY = [
  { id: "h1", type: "saved", title: "Saved V3", prompt: "Marketing Strategy", at: at(0, 11, 5) },
  { id: "h2", type: "tested", title: "Tested V3", detail: "5 / 5 criteria passed", prompt: "Marketing Strategy", at: at(0, 11, 2) },
  { id: "h3", type: "improved", title: "Applied Context improvement", prompt: "Marketing Strategy", at: at(0, 10, 51) },
  { id: "h4", type: "generated", title: "Generated V2", prompt: "Marketing Strategy", at: at(0, 10, 47) },
  { id: "h5", type: "created", title: "Created “Marketing Strategy”", prompt: "Marketing Strategy", at: at(0, 10, 42) },
  { id: "h6", type: "shared", title: "Shared a view-only link", prompt: "Product launch email sequence", at: at(1, 16, 20) },
  { id: "h7", type: "tested", title: "Tested V3 on 3 models in Model Lab", detail: "Recommended: Claude 3.5 Sonnet", prompt: "Product launch email sequence", at: at(1, 15, 34) },
  { id: "h8", type: "improved", title: "Optimized for clarity", detail: "4 changes accepted", prompt: "Product launch email sequence", at: at(1, 15, 3) },
  { id: "h9", type: "template", title: "Converted to template", detail: "3 variables detected", prompt: "Social media content calendar", at: at(3, 9, 48) },
  { id: "h10", type: "exported", title: "Exported as Markdown", prompt: "Code review best practices guide", at: at(4, 14, 12) },
  { id: "h11", type: "created", title: "Created “Competitor analysis framework”", prompt: "Competitor analysis framework", at: at(5, 11, 30) },
];
