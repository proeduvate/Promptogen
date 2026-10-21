import { BarChart3, FlaskConical, Megaphone, Share2 } from "lucide-react";

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

/* Only the four useful kinds from spec §55: shared prompt activity,
   important product updates, evaluation completed and the weekly summary.
   No promotional notifications. Each kind can be turned off in Settings.
   Mock feed until a notifications API exists; times are relative to page
   load so the list always reads as recent. */
export const EVALUATION_NOTIFICATION = {
  title: "Evaluation completed",
  icon: FlaskConical,
  tone: "text-good",
  tint: "bg-good/10 ring-good/20",
};

export const NOTIFICATIONS = [
  {
    id: "n1",
    ...EVALUATION_NOTIFICATION,
    body: "“Marketing Campaign Strategy” V3 passed 5 / 5 criteria on GPT-4o.",
    createdAt: minutesAgo(5),
    unread: true,
  },
  {
    id: "n2",
    title: "Your weekly prompt summary",
    body: "Average prompt quality rose from 79 to 84 this week. Constraints is still your weakest area.",
    createdAt: minutesAgo(2 * 60),
    unread: true,
    icon: BarChart3,
    tone: "text-brand",
    tint: "bg-brand/10 ring-brand/20",
  },
  {
    id: "n3",
    title: "Shared prompt activity",
    body: "Someone duplicated your shared prompt “Product launch email sequence”.",
    createdAt: minutesAgo(26 * 60),
    unread: false,
    icon: Share2,
    tone: "text-pink",
    tint: "bg-pink/10 ring-pink/20",
  },
  {
    id: "n4",
    title: "Product update",
    body: "Prompt Import is here: paste a prompt from any AI tool to analyze and save it.",
    createdAt: minutesAgo(3 * 24 * 60),
    unread: false,
    icon: Megaphone,
    tone: "text-purple",
    tint: "bg-purple/10 ring-purple/20",
  },
];
