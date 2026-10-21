import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Contact,
  HelpCircle,
  Loader2,
  Paperclip,
  Pencil,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Dialog from "./Dialog";
import Stepper from "./Stepper";
import QuestionField, { GROUP_TYPES } from "./wizard/Fields";
import SectionBody, { SectionLabel } from "./prompt/SectionBody";
import { IMPORTANCE, PROFILE_PREFILL, QUESTION_BANK } from "../data/questions";
import { TONE_FIELD } from "../data/contextProfiles";
import useSettings from "../hooks/useSettings";
import {
  analyzeIntent,
  complexityOf,
  detectContradictions,
  domainLabel,
  estimateTokens,
  redact,
  scanSecurity,
} from "../lib/analysis";
import {
  buildPrompt,
  formatAnswer,
  isAnswered,
  prefillAnswers,
  questionsFor,
  readinessOf,
  savedToneOf,
  toneGroup,
  toneLabel,
  visibleQuestions,
} from "../lib/promptBuilder";
import { wait } from "../lib/simulate";
import { btn } from "../lib/ui";

const STEPS = [
  { id: "understand", label: "Understand" },
  { id: "questions", label: "Questions" },
  { id: "review", label: "Review" },
];

const DOMAIN_QUESTION = {
  name: "domain",
  type: "single",
  options: Object.keys(QUESTION_BANK).map((id) => ({ value: id, label: domainLabel(id) })),
};

const nameOf = (question) => question.short ?? question.context ?? question.title;

const BADGE = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1";

function ImportancePill({ level }) {
  const { label, pill } = IMPORTANCE[level];
  return <span className={`${BADGE} ${pill}`}>{label}</span>;
}

function SourceBadge({ source }) {
  return (
    <span className={`${BADGE} bg-purple/10 text-purple ring-purple/25`}>
      <Contact className="size-3" />
      From {source}
    </span>
  );
}

/* One adaptive question: title, importance, where a pre-filled answer came
   from, the input, and anything that belongs under it (e.g. tone conflict). */
function QuestionBlock({ question, value, source, onChange, children }) {
  const id = `pg-q-${question.name}`;
  const titleId = `${id}-title`;
  const hintId = question.hint ? `${id}-hint` : undefined;
  const grouped = GROUP_TYPES.has(question.type);
  const Title = grouped ? "p" : "label";

  return (
    <div
      id={`${id}-block`}
      role={grouped ? "group" : undefined}
      aria-labelledby={grouped ? titleId : undefined}
      aria-describedby={grouped ? hintId : undefined}
      className="min-w-0 rounded-xl border border-line bg-surface-2 p-4"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Title id={titleId} htmlFor={grouped ? undefined : id} className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
          {question.title}
          <ImportancePill level={question.importance} />
        </Title>
        {source && <SourceBadge source={source} />}
      </div>
      {question.hint && (
        <p id={hintId} className="mt-1 text-[13px] text-muted">
          {question.hint}
        </p>
      )}
      <div className="mt-3">
        <QuestionField id={id} question={question} value={value} onChange={onChange} describedBy={grouped ? undefined : hintId} />
      </div>
      {children}
    </div>
  );
}

function ReadinessMeter({ readiness }) {
  const { score, label, tone, bar, missingRequired, remaining } = readiness;
  const ready = missingRequired.length === 0;
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[13px]">
        <span className="font-medium">
          Prompt readiness:{" "}
          <span className={tone}>
            {score}% · {label}
          </span>
        </span>
        <span className="text-muted max-sm:hidden">
          {ready
            ? "We have enough information to create your prompt."
            : `Answer ${missingRequired.length} required question${missingRequired.length === 1 ? "" : "s"} for the best result.`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Prompt readiness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`${score}% · ${label}`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"
      >
        <div className={`h-full rounded-full ${bar} transition-[width] duration-500 motion-reduce:transition-none`} style={{ width: `${score}%` }} />
      </div>
      {ready && remaining > 0 && (
        <p className="mt-1.5 text-[12px] text-faint max-sm:hidden">
          Optional: Answer {remaining} more question{remaining === 1 ? "" : "s"} to improve the prompt quality.
        </p>
      )}
    </div>
  );
}

function ToneConflict({ current, saved, onKeep, onUseSaved }) {
  return (
    <div className="mt-3 rounded-lg border border-amber/40 bg-amber/5 p-3.5">
      <p className="flex items-start gap-2 text-[13px] leading-5">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber" />
        <span>
          <span className="font-medium text-text">Tone conflict.</span>{" "}
          <span className="text-muted">
            Your saved preference ({saved.source}) is <span className="font-medium text-text">{toneLabel(saved.tone)}</span>, but this
            request asks for a <span className="font-medium text-text">{toneLabel(current)}</span> tone. Which should we use?
          </span>
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2 sm:pl-6">
        <button type="button" onClick={onKeep} className={btn("brandSoft", "sm")}>
          Use {toneLabel(current)} for this prompt
        </button>
        <button type="button" onClick={onUseSaved} className={btn("secondary", "sm")}>
          Use {toneLabel(saved.tone)} (saved preference)
        </button>
      </div>
    </div>
  );
}

function Notice({ tone, icon: Icon, title, children }) {
  const styles = {
    amber: "border-amber/40 bg-amber/5 text-amber",
    bad: "border-bad/40 bg-bad/5 text-bad",
    good: "border-good/35 bg-good/5 text-good",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <h4 className="flex items-center gap-2 text-[14px] font-semibold">
        <Icon className="size-[18px] shrink-0" strokeWidth={2} />
        <span className="text-text">{title}</span>
      </h4>
      <div className="mt-1.5 text-[13px] text-muted sm:pl-[26px]">{children}</div>
    </div>
  );
}

/* Adaptive questioning (spec §3 understanding, §4/§52 domain questions,
   §45 readiness, §46 missing context, §22 tone conflicts). Mount it only
   while open so every run starts from the current idea and settings. */
export default function QuestionsModal({ seed = "", profile = null, attachments = [], onClose, onComplete }) {
  const [settings] = useSettings();
  const intent = useMemo(() => analyzeIntent(seed), [seed]);
  const [domain, setDomain] = useState(intent.domain);
  const [{ answers, sources }, setState] = useState(() => prefillAnswers(intent.domain, { idea: seed, profile, settings }));
  const [step, setStep] = useState(0);
  const [showOptional, setShowOptional] = useState(settings.experience === "advanced");
  const [toneDecision, setToneDecision] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [focusTarget, setFocusTarget] = useState(null);
  const headingRef = useRef(null);
  const aliveRef = useRef(true);
  const firstRender = useRef(true);

  useEffect(() => () => {
    aliveRef.current = false;
  }, []);

  /* Each step change moves focus to its heading, or to the question asked for. */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (focusTarget) {
      const block = document.getElementById(`pg-q-${focusTarget}-block`);
      block?.scrollIntoView({ block: "center" });
      block?.querySelector("input, textarea, select, button")?.focus({ preventScroll: true });
      setFocusTarget(null);
      return;
    }
    headingRef.current?.focus();
  }, [step, focusTarget]);

  const questions = questionsFor(domain, settings);
  const visible = visibleQuestions(questions, answers);
  const readiness = readinessOf(questions, answers);
  const shown = showOptional ? visible : visible.filter((question) => question.importance !== "optional" || question.showIf);
  const hiddenCount = visible.length - shown.length;
  const missing = [...readiness.missingRequired, ...readiness.missingRecommended];
  const goalReady = isAnswered({ type: "textarea" }, answers.goal);

  const saved = savedToneOf(profile, settings);
  const toneConflict =
    saved &&
    answers.tone &&
    toneDecision !== answers.tone &&
    toneGroup(answers.tone) &&
    toneGroup(saved.tone) &&
    toneGroup(answers.tone) !== toneGroup(saved.tone);

  const freeText = Object.values(answers).filter((value) => typeof value === "string").join("\n");
  const findings = scanSecurity(freeText);
  const contradictions = detectContradictions(freeText);
  const complexity = complexityOf(seed);

  const setAnswer = (name, value) =>
    setState((current) => {
      const nextSources = { ...current.sources };
      delete nextSources[name];
      return { answers: { ...current.answers, [name]: value }, sources: nextSources };
    });

  const changeDomain = (next) => {
    setDomain(next);
    setToneDecision(null);
    setState((current) => {
      const fresh = prefillAnswers(next, { idea: seed, profile, settings });
      return { answers: { ...fresh.answers, goal: current.answers.goal }, sources: fresh.sources };
    });
  };

  const applySavedTone = () => {
    setState((current) => ({
      answers: { ...current.answers, tone: saved.tone },
      sources: { ...current.sources, tone: saved.source },
    }));
    setToneDecision(saved.tone);
  };

  const removeSensitive = () =>
    setState((current) => ({
      sources: current.sources,
      answers: Object.fromEntries(
        Object.entries(current.answers).map(([name, value]) => [name, typeof value === "string" ? redact(value, findings) : value]),
      ),
    }));

  const editQuestion = (question) => {
    if (question.importance === "optional") setShowOptional(true);
    setFocusTarget(question.name);
    setStep(1);
  };

  const generate = async () => {
    if (!goalReady || generating) return;
    setGenerating(true);
    // Hand-off point: the prompt-generation API call replaces this short wait.
    await wait(700);
    if (aliveRef.current) onComplete(buildPrompt({ domain, answers, profile, settings, attachments }));
  };

  const prefilled = visible.filter((question) => question.name !== "goal" && sources[question.name]);
  const profileFields =
    profile?.fields.filter(
      ({ label }) =>
        label === TONE_FIELD || (PROFILE_PREFILL[label.toLowerCase()] ?? []).some((name) => questions.some((question) => question.name === name)),
    ) ?? [];
  const preview = step === 2 ? buildPrompt({ domain, answers, profile, settings, attachments }) : null;
  const answered = visible.filter((question) => isAnswered(question, answers[question.name]));

  const toneBlock = toneConflict && (
    <ToneConflict current={answers.tone} saved={saved} onKeep={() => setToneDecision(answers.tone)} onUseSaved={applySavedTone} />
  );

  const heading = (text) => (
    <h3 ref={headingRef} tabIndex={-1} data-autofocus className="text-[17px] font-semibold outline-none">
      {text}
    </h3>
  );

  const footer = (
    <>
      <button type="button" onClick={step === 0 ? onClose : () => setStep(step - 1)} className={`${btn()} mr-auto`}>
        {step > 0 && <ArrowLeft className="size-4" />}
        {step === 0 ? "Cancel" : "Back"}
      </button>
      {step < 2 && (
        <button type="button" onClick={() => setStep(step + 1)} disabled={!goalReady} className={btn("primary")}>
          {step === 0 ? "Continue" : "Review"}
          <ArrowRight className="size-4" />
        </button>
      )}
      {step === 2 && missing.length === 0 && (
        <button type="button" onClick={generate} disabled={!goalReady || generating} className={btn("primary")}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {generating ? "Generating…" : "Generate Prompt"}
        </button>
      )}
    </>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title="Answer a Few Questions"
      description="Help our AI understand your needs better."
      icon={HelpCircle}
      tone="purple"
      size="xl"
      footer={footer}
      subheader={
        <>
          <Stepper steps={STEPS} current={step} onStepClick={setStep} />
          {step > 0 && <ReadinessMeter readiness={readiness} />}
        </>
      }
    >
      {step === 0 && (
        <div className="space-y-5">
          {heading("Here's what we understood")}
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-faint">Your request</p>
            <p className="mt-1 text-[15px] leading-6">{intent.intent || "Tell us what you'd like the AI to do in the next step."}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
              {complexity && (
                <span>
                  Complexity: <span className={`font-medium ${complexity.tone}`}>{complexity.level}</span>
                </span>
              )}
              <span>About {estimateTokens(seed)} tokens</span>
              {attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="size-3.5" />
                  {attachments.length} attachment{attachments.length === 1 ? "" : "s"} included as context
                </span>
              )}
            </div>
          </div>

          <div role="group" aria-labelledby="pg-domain-title">
            <p id="pg-domain-title" className="text-[14px] font-semibold">
              Task type
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              We detected <span className="font-medium text-text">{domainLabel(intent.domain)}</span>. Change it if that's not right; the
              questions adapt and start over.
            </p>
            <div className="mt-3">
              <QuestionField id="pg-domain" question={DOMAIN_QUESTION} value={domain} onChange={changeDomain} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line p-4">
              <h4 className="flex items-center gap-2 text-[13px] font-semibold">
                <Check className="size-4 text-good" strokeWidth={2.5} />
                What we already know
              </h4>
              {prefilled.length === 0 ? (
                <p className="mt-2 text-[13px] text-faint">Nothing specific yet. We'll ask.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-[13px]">
                  {prefilled.map((question) => (
                    <li key={question.name} className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-muted">{nameOf(question)}:</span>
                      <span className="font-medium">{formatAnswer(question, answers[question.name])}</span>
                      <span className="text-[12px] text-faint">from {sources[question.name]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-line p-4">
              <h4 className="flex items-center gap-2 text-[13px] font-semibold">
                <CircleAlert className="size-4 text-amber" strokeWidth={2.25} />
                What we'll ask about
              </h4>
              {missing.length === 0 ? (
                <p className="mt-2 text-[13px] text-faint">Nothing essential is missing.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {missing.map((question) => (
                    <li key={question.name} className="rounded-full bg-surface-3 px-2.5 py-1 text-[12px]">
                      {nameOf(question)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4 text-[13px]">
            <Contact className="mt-0.5 size-[18px] shrink-0 text-cyan" strokeWidth={1.75} />
            {profile ? (
              <p className="text-muted">
                Using <span className="font-medium text-text">{profile.name}</span>
                {profileFields.length
                  ? `: ${profileFields.map(({ label }) => label).join(", ")} will be reused.`
                  : ". None of its details apply to this task type."}
              </p>
            ) : (
              <p className="text-muted">No context profile in use. Pick one on Home to skip questions you've answered before.</p>
            )}
          </div>

          {findings.length > 0 && (
            <Notice tone="bad" icon={ShieldAlert} title={findings[0].title}>
              {findings[0].body} You can remove it before generating.
            </Notice>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            {heading(`${domainLabel(domain)} questions`)}
            <p className="mt-0.5 text-[13px] text-muted">Answer what you can. Required questions matter most, and pre-filled answers can be changed.</p>
          </div>
          {shown.map((question) => (
            <QuestionBlock
              key={question.name}
              question={question}
              value={answers[question.name]}
              source={sources[question.name]}
              onChange={(value) => setAnswer(question.name, value)}
            >
              {question.name === "tone" && toneBlock}
            </QuestionBlock>
          ))}
          {hiddenCount > 0 && (
            <button type="button" onClick={() => setShowOptional(true)} className={btn("secondary", "sm")}>
              Show {hiddenCount} optional question{hiddenCount === 1 ? "" : "s"}
            </button>
          )}
          {!goalReady && <p className="text-[13px] text-bad">Describe what you want the AI to do to continue.</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {heading("Review before generating")}

          {missing.length > 0 ? (
            <Notice tone="amber" icon={CircleAlert} title="Missing context detected">
              <p>The following details could improve your prompt:</p>
              <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {missing.map((question) => (
                  <li key={question.name} className="flex items-center gap-2 text-text">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-amber" />
                    {nameOf(question)}
                    {question.importance === "required" && <span className="text-[11px] font-medium text-bad">Required</span>}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => editQuestion(missing[0])} className={btn("primary", "sm")}>
                  <Pencil className="size-3.5" />
                  Add Details
                </button>
                <button type="button" onClick={generate} disabled={!goalReady || generating} className={btn("secondary", "sm")}>
                  {generating && <Loader2 className="size-3.5 animate-spin" />}
                  {generating ? "Generating…" : "Generate Anyway"}
                </button>
              </div>
            </Notice>
          ) : (
            <Notice tone="good" icon={Check} title="Everything essential is here">
              Your prompt will be generated at the <span className="font-medium text-text">{readiness.label}</span> level.
            </Notice>
          )}

          {toneBlock}

          {findings.map((finding) => (
            <Notice key={finding.kind + finding.title} tone={finding.severity === "high" ? "bad" : "amber"} icon={ShieldAlert} title={finding.title}>
              <p>{finding.body}</p>
              {(finding.kind === "secret" || finding.kind === "personal") && (
                <button type="button" onClick={removeSensitive} className={`${btn("secondary", "sm")} mt-3`}>
                  Remove it
                </button>
              )}
            </Notice>
          ))}

          {contradictions.map(({ first, second, note }) => (
            <Notice key={first + second} tone="amber" icon={CircleAlert} title="Potential conflict">
              <p>
                “{first}” and “{second}”
              </p>
              <p className="mt-1">{note}</p>
            </Notice>
          ))}

          <section aria-labelledby="pg-review-answers">
            <h4 id="pg-review-answers" className="text-[14px] font-semibold">
              Your answers
            </h4>
            <dl className="mt-2 divide-y divide-line rounded-xl border border-line">
              {answered.map((question) => (
                <div key={question.name} className="flex items-start gap-3 px-4 py-2.5 text-[13px]">
                  <dt className="w-[36%] shrink-0 text-muted">{question.name === "goal" ? "Goal" : nameOf(question)}</dt>
                  <dd className="min-w-0 flex-1 whitespace-pre-line break-words">{formatAnswer(question, answers[question.name])}</dd>
                  <button
                    type="button"
                    onClick={() => editQuestion(question)}
                    aria-label={`Edit ${question.name === "goal" ? "goal" : nameOf(question)}`}
                    className="-my-1 grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
              ))}
            </dl>
          </section>

          <details open={settings.experience === "advanced"} className="group rounded-xl border border-line">
            <summary className="cursor-pointer select-none px-4 py-3 text-[14px] font-semibold">Prompt preview</summary>
            <div className="space-y-3 border-t border-line px-4 py-3">
              {preview.sections.map((section) => (
                <div key={section.id}>
                  <SectionLabel section={section} compact />
                  <div className="mt-1">
                    <SectionBody section={section} compact />
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </Dialog>
  );
}
