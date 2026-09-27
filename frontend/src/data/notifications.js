import { TrendingUp, BarChart3, LayoutTemplate, Share2, Crown } from "lucide-react";

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

/* Mock feed until a notifications API exists. Times are relative to page
   load so the list always reads as recent. */
export const NOTIFICATIONS = [
  {
    id: "n1",
    title: "Prompt analysis ready",
    body: "“Marketing Campaign Strategy” scored 85/100 — see what could push it higher.",
    createdAt: minutesAgo(5),
    unread: true,
    icon: TrendingUp,
    tone: "text-good",
    tint: "bg-good/10 ring-good/20",
  },
  {
    id: "n2",
    title: "Weekly analytics report",
    body: "Your average prompt strength rose 6% this week.",
    createdAt: minutesAgo(2 * 60),
    unread: true,
    icon: BarChart3,
    tone: "text-brand",
    tint: "bg-brand/10 ring-brand/20",
  },
  {
    id: "n3",
    title: "New templates available",
    body: "5 new Education templates were added to the library.",
    createdAt: minutesAgo(26 * 60),
    unread: false,
    icon: LayoutTemplate,
    tone: "text-purple",
    tint: "bg-purple/10 ring-purple/20",
  },
  {
    id: "n4",
    title: "Prompt shared with you",
    body: "A teammate shared “Onboarding Email Sequence” with you.",
    createdAt: minutesAgo(3 * 24 * 60),
    unread: false,
    icon: Share2,
    tone: "text-pink",
    tint: "bg-pink/10 ring-pink/20",
  },
  {
    id: "n5",
    title: "Your Pro trial ends soon",
    body: "Upgrade to keep unlimited generations and advanced analytics.",
    createdAt: minutesAgo(5 * 24 * 60),
    unread: false,
    icon: Crown,
    tone: "text-amber",
    tint: "bg-amber/10 ring-amber/20",
  },
];
