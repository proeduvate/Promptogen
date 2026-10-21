import { Contact, Check, Settings2 } from "lucide-react";
import { CARD, LINK_BUTTON, btn } from "../../lib/ui";

/* Recently used Context Profiles on Home (spec §2, §20). */
export default function ContextProfilesRail({ profiles, activeId, onSetActive, onManage }) {
  const shown = [...profiles].sort((a, b) => (b.id === activeId) - (a.id === activeId)).slice(0, 3);

  return (
    <section className={`${CARD} p-6`} aria-labelledby="pg-profiles-rail">
      <div className="flex items-center justify-between gap-2">
        <h2 id="pg-profiles-rail" className="flex items-center gap-2 text-[17px] font-semibold">
          <Contact className="size-5 text-cyan" strokeWidth={1.75} />
          Your context
        </h2>
        <button type="button" onClick={onManage} className={LINK_BUTTON}>
          <Settings2 className="size-4" />
          Manage
        </button>
      </div>
      <p className="mt-1 text-[13px] text-muted">Reuse details without typing them again.</p>
      {shown.length === 0 ? (
        <button type="button" onClick={onManage} className={`${btn("secondary", "sm")} mt-4 w-full`}>
          Create a context profile
        </button>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((profile) => {
            const isActive = profile.id === activeId;
            return (
              <li key={profile.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{profile.name}</span>
                  <span className="block truncate text-[12px] text-faint">
                    {profile.fields.map(({ value }) => value).slice(0, 2).join(" · ")}
                  </span>
                </span>
                <button
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`${isActive ? "Stop using" : "Use"} ${profile.name}`}
                  onClick={() => onSetActive(isActive ? null : profile.id)}
                  className={btn(isActive ? "brandSoft" : "secondary", "sm")}
                >
                  {isActive && <Check className="size-3.5" />}
                  {isActive ? "In use" : "Use"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
