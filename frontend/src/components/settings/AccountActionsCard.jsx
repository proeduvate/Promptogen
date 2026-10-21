import { useState } from "react";
import { Database, Download, Trash2, ChevronRight } from "lucide-react";
import SettingsCard from "./SettingsCard";
import ConfirmDialog from "../ConfirmDialog";

/* Destructive actions ask first. Hand-off point: wire each `run` to the
   account API once it exists. */
const ACTIONS = [
  {
    id: "export",
    title: "Export My Data",
    body: "Download all your prompts and settings.",
    icon: Download,
    run: () => console.log("Export my data"),
  },
  {
    id: "clear",
    title: "Clear Prompt History",
    body: "Remove all your saved prompts.",
    icon: Trash2,
    tone: "bad",
    confirm: {
      title: "Clear prompt history?",
      body: "This removes all your saved prompts. It can't be undone.",
      label: "Clear history",
    },
    run: () => console.log("Clear prompt history"),
  },
  {
    id: "delete",
    title: "Delete Account",
    body: "Permanently delete your account and data.",
    icon: Trash2,
    tone: "bad",
    danger: true,
    confirm: {
      title: "Delete your account?",
      body: "This permanently deletes your account, prompts and settings. It can't be undone.",
      label: "Delete account",
    },
    run: () => console.log("Delete account"),
  },
];

export default function AccountActionsCard() {
  const [pending, setPending] = useState(null);

  return (
    <SettingsCard icon={Database} title="Account Actions" description="Manage your account data.">
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {ACTIONS.map((action) => {
          const { id, title, body, icon: Icon, tone, danger } = action;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => (action.confirm ? setPending(action) : action.run())}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <span
                  className={[
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    tone === "bad" ? "bg-bad/10 text-bad" : "bg-surface-3 text-text",
                  ].join(" ")}
                >
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] font-medium ${danger ? "text-bad" : ""}`}>{title}</span>
                  <span className="block text-[13px] text-muted">{body}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.confirm.title}
        body={pending?.confirm.body}
        confirmLabel={pending?.confirm.label}
        onConfirm={() => pending?.run()}
        onClose={() => setPending(null)}
      />
    </SettingsCard>
  );
}
