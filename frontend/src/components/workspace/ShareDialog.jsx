import { useState } from "react";
import { Check, Copy, Link2, Share2, ShieldAlert } from "lucide-react";
import Dialog from "../Dialog";
import { copyText } from "../../lib/promptText";
import { hashString } from "../../lib/simulate";
import { btn } from "../../lib/ui";

const PERMISSIONS = [
  { value: "view", label: "View only", body: "People can read the prompt." },
  { value: "copy", label: "View and copy", body: "People can read and copy it." },
  { value: "duplicate", label: "View, copy and duplicate", body: "People can save their own copy to edit." },
  { value: "edit", label: "Edit", body: "Coming with Team Workspace.", disabled: true },
  { value: "comment", label: "Comment", body: "Coming with Team Workspace.", disabled: true },
];

/* Share a prompt by link with a permission level (spec §33). The security
   scan runs first (spec §42) and the link can be revoked at any time. */
export default function ShareDialog({ title, findings, link, onCreate, onRevoke, onRedact, onClose }) {
  const [permission, setPermission] = useState(link?.permission ?? "view");
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);
  const risky = findings.length > 0;

  const create = () => {
    // Hand-off point: create the link through the sharing API.
    const id = hashString(`${title}:${Date.now()}`).toString(36);
    onCreate({ url: `${window.location.origin}/s/${id}`, permission, createdAt: Date.now() });
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className={`${btn()} mr-auto`}>
        Done
      </button>
      {link ? (
        <button type="button" onClick={onRevoke} className={btn("danger")}>
          Revoke link
        </button>
      ) : (
        <button type="button" onClick={create} disabled={risky && !acknowledged} className={btn("primary")}>
          <Link2 className="size-4" />
          Create link
        </button>
      )}
    </>
  );

  return (
    <Dialog open onClose={onClose} title="Share Prompt" description={title} icon={Share2} tone="cyan" footer={footer}>
      {risky && !link && (
        <div className="mb-4 rounded-xl border border-bad/40 bg-bad/5 p-4 text-[13px]">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="size-4 text-bad" />
            {findings[0].title}
          </p>
          <p className="mt-1 text-muted">{findings[0].body} Anyone with the link will see it.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {findings.some((finding) => finding.kind === "secret" || finding.kind === "personal") && (
              <button type="button" onClick={onRedact} className={btn("secondary", "sm")}>
                Remove it first
              </button>
            )}
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="accent-brand" />
              I understand; share anyway
            </label>
          </div>
        </div>
      )}

      {link ? (
        <div>
          <p className="text-[13px] text-muted">
            Anyone with this link can <span className="font-medium text-text">{PERMISSIONS.find(({ value }) => value === link.permission).label.toLowerCase()}</span>.
          </p>
          <div className="mt-3 flex gap-2">
            <input readOnly aria-label="Share link" value={link.url} onFocus={(event) => event.target.select()} className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] outline-none" />
            <button type="button" onClick={async () => setCopied(await copyText(link.url))} className={`${btn("secondary", "sm")} shrink-0`}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-[12px] text-faint">Links show the version in the editor when they were created. Revoke to stop access.</p>
        </div>
      ) : (
        <fieldset>
          <legend className="text-[13px] font-medium">Permission</legend>
          <div className="mt-2 space-y-2">
            {PERMISSIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 ${option.disabled ? "cursor-not-allowed border-line opacity-55" : "cursor-pointer border-line hover:bg-surface-2 has-[:checked]:border-brand has-[:checked]:bg-brand/5"}`}
              >
                <input type="radio" name="pg-share-permission" value={option.value} checked={permission === option.value} disabled={option.disabled} onChange={() => setPermission(option.value)} className="mt-1 accent-brand" />
                <span>
                  <span className="block text-[14px] font-medium">{option.label}</span>
                  <span className="block text-[12px] text-muted">{option.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Dialog>
  );
}
