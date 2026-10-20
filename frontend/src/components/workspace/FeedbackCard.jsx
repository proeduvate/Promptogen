import { useState } from "react";
import { MessageSquareHeart, ThumbsDown, ThumbsUp } from "lucide-react";
import { modeById } from "../../lib/optimizer";
import { CARD, btn } from "../../lib/ui";

export const FEEDBACK_REASONS = [
  { id: "incorrect", label: "Incorrect result", mode: "reliability" },
  { id: "generic", label: "Too generic", mode: "specificity" },
  { id: "missing", label: "Missing information", mode: "context" },
  { id: "verbose", label: "Too verbose", mode: "concise" },
  { id: "format", label: "Wrong format", mode: "format" },
  { id: "instructions", label: "Did not follow instructions", mode: "structure" },
  { id: "other", label: "Other", mode: null },
];

/* "Did this prompt give you the result you wanted?" (spec §53). A No
   asks what went wrong and points at the optimizer goal that fixes it. */
export default function FeedbackCard({ versionLabel, onSubmit, onFix, onMarkSuccessful }) {
  const [answer, setAnswer] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const fixes = [...new Set(reasons.map((id) => FEEDBACK_REASONS.find((reason) => reason.id === id).mode).filter(Boolean))];

  const submit = (value, picked = reasons) => {
    // Hand-off point: send feedback to the learning service.
    onSubmit({ helpful: value === "yes", reasons: picked, note: note.trim(), version: versionLabel, at: Date.now() });
    setSent(true);
  };

  return (
    <section aria-labelledby="pg-feedback-title" className={`${CARD} p-6`}>
      <h2 id="pg-feedback-title" className="flex items-center gap-2 text-[17px] font-semibold">
        <MessageSquareHeart className="size-[18px] text-pink" strokeWidth={1.75} />
        Feedback
      </h2>
      {!answer && (
        <>
          <p className="mt-2 text-[14px]">Did this prompt give you the result you wanted?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAnswer("yes");
                submit("yes", []);
              }}
              className={btn("secondary", "sm")}
            >
              <ThumbsUp className="size-4" />
              Yes
            </button>
            <button type="button" onClick={() => setAnswer("no")} className={btn("secondary", "sm")}>
              <ThumbsDown className="size-4" />
              No
            </button>
          </div>
        </>
      )}
      {answer === "yes" && (
        <div className="mt-2 text-[13px] text-muted">
          <p>Thanks! Promptogen learns from versions that work for you.</p>
          <button type="button" onClick={onMarkSuccessful} className={`${btn("secondary", "sm")} mt-3`}>
            Mark {versionLabel} as preferred
          </button>
        </div>
      )}
      {answer === "no" && !sent && (
        <form
          className="mt-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit("no");
          }}
        >
          <fieldset>
            <legend className="text-[14px]">What went wrong?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {FEEDBACK_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-[13px] hover:bg-surface-3 has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                >
                  <input
                    type="checkbox"
                    checked={reasons.includes(reason.id)}
                    onChange={() => setReasons((list) => (list.includes(reason.id) ? list.filter((id) => id !== reason.id) : [...list, reason.id]))}
                    className="accent-brand"
                  />
                  {reason.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-3 block text-[13px] text-muted">
            Anything else? <span className="text-faint">(optional)</span>
            <textarea rows={2} value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full resize-y rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-text outline-none focus:border-brand/60" />
          </label>
          <button type="submit" disabled={reasons.length === 0} className={`${btn("primary", "sm")} mt-3`}>
            Send feedback
          </button>
        </form>
      )}
      {answer === "no" && sent && (
        <div className="mt-2 text-[13px]">
          <p className="text-muted">Thanks. Based on your feedback, try:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {fixes.map((mode) => (
              <button key={mode} type="button" onClick={() => onFix(mode)} className={btn("purpleSoft", "sm")}>
                {modeById(mode).label}
              </button>
            ))}
            {fixes.length === 0 && <span className="text-muted">Testing it against success criteria to find what's missing.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
