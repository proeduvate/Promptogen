import * as LucideIcons from "lucide-react";

/**
 * Resolves an icon prop that could be either a Lucide component or an icon string name.
 */
export function resolveIcon(icon, fallback = LucideIcons.FileText) {
  if (!icon) return fallback;
  if (typeof icon === "function" || (typeof icon === "object" && icon.$$typeof)) {
    return icon;
  }
  if (typeof icon === "string" && LucideIcons[icon]) {
    return LucideIcons[icon];
  }
  return fallback;
}
