import { UserRound, PenLine } from "lucide-react";
import SettingsCard from "./SettingsCard";
import { USER } from "../../data/content";
import { btn } from "../../lib/ui";

/* `detailed` (Profile page) adds the full list of account fields. */
export default function AccountCard({ detailed = false }) {
  const details = [
    { label: "Full name", value: USER.name },
    { label: "Email", value: USER.email },
    { label: "Role", value: USER.title },
    { label: "Organization", value: USER.organization },
  ];

  return (
    <SettingsCard icon={UserRound} title="Account" description="Manage your account information.">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-good/20 text-[26px] font-semibold text-good">
          {USER.initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">{USER.name}</p>
          <p className="truncate text-[13px] text-muted">{USER.email}</p>
        </div>
        {/* Hand-off point: open the profile editor once account APIs exist. */}
        <button
          type="button"
          onClick={() => console.log("Edit profile")}
          className={`${btn("secondary", "sm")} w-full sm:w-auto`}
        >
          <PenLine className="size-4" strokeWidth={1.75} />
          Edit Profile
        </button>
      </div>

      {detailed && (
        <dl className="mt-6 divide-y divide-line rounded-xl border border-line">
          {details.map(({ label, value }) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3.5">
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="text-[14px] font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </SettingsCard>
  );
}
