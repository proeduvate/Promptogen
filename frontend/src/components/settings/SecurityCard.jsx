import { KeyRound, Link2, Check, LogOut } from "lucide-react";
import SettingsCard from "./SettingsCard";
import { ToggleRow } from "../Toggle";
import { USER } from "../../data/content";
import { btn } from "../../lib/ui";

const ACCOUNTS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "microsoft", label: "Microsoft" },
];

/* Password / authentication, connected accounts and logout (spec §57). */
export default function SecurityCard({ settings, onChange, onLogout }) {
  const connected = settings.connectedAccounts ?? {};

  return (
    <SettingsCard icon={KeyRound} title="Sign-in & Security" description="How you sign in to Promptogen.">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">Password</p>
          <p className="truncate text-[12px] text-muted">Signed in as {USER.email}</p>
        </div>
        {/* Hand-off point: start the change-password flow once auth exists. */}
        <button type="button" onClick={() => console.log("Change password")} className={btn("secondary", "sm")}>
          Change password
        </button>
      </div>

      <div className="mt-4">
        <ToggleRow
          label="Two-factor authentication"
          description="Ask for a code from your authenticator app when signing in."
          checked={settings.twoFactor}
          onChange={(value) => onChange("twoFactor", value)}
        />
      </div>

      <h3 className="mb-2 mt-5 flex items-center gap-2 text-[13px] font-medium">
        <Link2 className="size-4 text-muted" />
        Connected accounts
      </h3>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {ACCOUNTS.map(({ id, label }) => {
          const isOn = Boolean(connected[id]);
          return (
            <li key={id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 text-[14px]">{label}</span>
              {isOn && (
                <span className="flex items-center gap-1 text-[12px] text-good">
                  <Check className="size-3.5" strokeWidth={2.5} />
                  Connected
                </span>
              )}
              {/* Hand-off point: run the OAuth flow for this account. */}
              <button
                type="button"
                onClick={() => onChange("connectedAccounts", { ...connected, [id]: !isOn })}
                className={btn(isOn ? "ghost" : "secondary", "sm")}
                aria-label={`${isOn ? "Disconnect" : "Connect"} ${label}`}
              >
                {isOn ? "Disconnect" : "Connect"}
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={onLogout} className={`${btn("secondary")} mt-5 w-full hover:text-bad`}>
        <LogOut className="size-4" />
        Log out
      </button>
    </SettingsCard>
  );
}
