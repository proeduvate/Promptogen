import {
  PenLine,
  MessagesSquare,
  Sparkles,
  Gauge,
  Wand2,
  ClipboardCheck,
  ChevronDown,
  FlaskConical,
  LayoutTemplate,
  Contact,
  GitCompare,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { CARD, ICON_TILE, btn } from "../lib/ui";

const GETTING_STARTED = [
  { title: "Describe your idea", body: "Type what you want to achieve on Home. No prompt engineering needed.", icon: PenLine },
  { title: "Answer a few questions", body: "Promptogen asks only what matters for your task. Optional ones can be skipped.", icon: MessagesSquare },
  { title: "Generate your prompt", body: "Get a structured prompt with role, objective, context, requirements and output format.", icon: Sparkles },
  { title: "Check its quality", body: "See an explainable score. Click any dimension to learn why it scored that way.", icon: Gauge },
  { title: "Improve it", body: "Apply suggestions or optimize for a goal. Every change is shown with a reason.", icon: Wand2 },
  { title: "Copy, test or save", body: "Use it anywhere, test it against success criteria, or save it to your library.", icon: ClipboardCheck },
];

const SUCCESS_LOOP = ["Idea", "Understand", "Ask", "Generate", "Analyze", "Test", "Diagnose", "Improve", "Compare", "Save", "Reuse"];

const FEATURES = [
  { title: "Prompt Quality", body: "Eight dimensions such as clarity, context and constraints, each with an explanation.", icon: Gauge, tone: "text-brand", tint: "bg-brand/10 ring-brand/20" },
  { title: "Testing & Evaluation", body: "Define success criteria, run the prompt and get a separate Tested Performance score.", icon: ClipboardCheck, tone: "text-good", tint: "bg-good/10 ring-good/20" },
  { title: "Model Lab", body: "Run one prompt on several models and get a recommendation based on measured results.", icon: FlaskConical, tone: "text-purple", tint: "bg-purple/10 ring-purple/20", nav: "model-lab" },
  { title: "Context Profiles", body: "Save details you repeat (company, audience, tone) and reuse them in any prompt.", icon: Contact, tone: "text-cyan", tint: "bg-cyan/10 ring-cyan/20", nav: "settings" },
  { title: "Smart Templates", body: "Start from a template with variables; Promptogen asks for the values before generating.", icon: LayoutTemplate, tone: "text-amber", tint: "bg-amber/10 ring-amber/20", nav: "templates" },
  { title: "Versions", body: "Every meaningful change can become a version you can compare, restore or mark as preferred.", icon: GitCompare, tone: "text-pink", tint: "bg-pink/10 ring-pink/20", nav: "my-prompts" },
];

const FAQ = [
  {
    q: "Do I need to know prompt engineering?",
    a: "No. Tell Promptogen what you want to achieve and it figures out how to ask the AI properly. Advanced controls stay hidden until you switch to Advanced mode in Settings.",
  },
  {
    q: "What's the difference between Prompt Quality and Tested Performance?",
    a: "Prompt Quality measures how well the prompt is constructed. Tested Performance measures how well it actually performed against your success criteria and test cases. A high quality score is not proof that the AI output will be correct.",
  },
  {
    q: "What are Context Profiles?",
    a: "Reusable sets of details like your company, audience, brand tone and market. Pick one while creating a prompt and Promptogen uses the relevant parts. If your request conflicts with a saved preference, you choose which one wins.",
  },
  {
    q: "Is my data private?",
    a: "You control your data in Settings → Data & Privacy: turn prompt history and analytics on or off, export everything, clear your history or delete your account. Promptogen also warns you before running or sharing a prompt that seems to contain secrets such as API keys.",
  },
  {
    q: "Which AI models are supported?",
    a: "Model Lab and the testing playground list the supported models. Connect your providers in Settings → AI Models. API keys are stored encrypted and never shown again in plain text.",
  },
  {
    q: "How are costs estimated?",
    a: "From estimated token counts and each model's published list prices. Every cost estimate states the pricing it assumes.",
  },
];

/* Guide & Help (spec §66, §68): how Promptogen works and answers to common questions. */
export default function HelpPage({ chrome, onNavigate, onRequestFeature, onStartPrompt }) {
  return (
    <PageShell
      chrome={chrome}
      header={<PageHeader title="Guide & Help" subtitle="Everything you need to go from idea to a high-performing prompt." />}
    >
      <div className="space-y-5">
        <section className={`${CARD} p-6`} aria-labelledby="pg-help-start">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="pg-help-start" className="text-[19px] font-semibold">Get started in six steps</h2>
              <p className="mt-1 text-[13px] text-muted">This is the default, simple workflow.</p>
            </div>
            <button type="button" onClick={onStartPrompt} className={btn("primary", "sm")}>
              Create a prompt
              <ArrowRight className="size-4" />
            </button>
          </div>
          <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {GETTING_STARTED.map(({ title, body, icon: Icon }, index) => (
              <li key={title} className="flex gap-3 rounded-xl border border-line bg-surface-2 p-4">
                <span className={`${ICON_TILE} size-10 bg-brand/10 ring-brand/20`}>
                  <Icon className="size-5 text-brand" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">
                    <span className="mr-1.5 text-faint">{String(index + 1).padStart(2, "0")}</span>
                    {title}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${CARD} p-6`} aria-labelledby="pg-help-loop">
          <h2 id="pg-help-loop" className="text-[19px] font-semibold">The Prompt Success Loop</h2>
          <p className="mt-1 text-[13px] text-muted">
            Generating a prompt isn't the end. Promptogen helps you find out whether it actually works.
          </p>
          <ol className="mt-5 flex flex-wrap items-center gap-2">
            {SUCCESS_LOOP.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-brand/30 bg-brand/5 px-3 py-1.5 text-[13px] font-medium">
                  <span className="mr-1 text-brand">{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </span>
                {index < SUCCESS_LOOP.length - 1 && <ArrowRight aria-hidden className="size-3.5 text-faint" />}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="pg-help-features">
          <h2 id="pg-help-features" className="mb-3 text-[19px] font-semibold">What each feature does</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map(({ title, body, icon: Icon, tone, tint, nav }) => (
              <article key={title} className={`${CARD} flex flex-col p-5`}>
                <span className={`${ICON_TILE} size-11 ${tint}`}>
                  <Icon className={`size-[22px] ${tone}`} strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
                <p className="mt-1 flex-1 text-[13px] leading-5 text-muted">{body}</p>
                {nav && (
                  <button type="button" onClick={() => onNavigate(nav)} className={`${btn("ghost", "sm")} mt-3 self-start`}>
                    Open
                    <ArrowRight className="size-4" />
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className={`${CARD} p-6`} aria-labelledby="pg-help-faq">
          <h2 id="pg-help-faq" className="text-[19px] font-semibold">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[14px] font-medium transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-[14px] leading-6 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${CARD} flex flex-wrap items-center gap-4 p-6`}>
          <span className={`${ICON_TILE} size-11 bg-amber/10 ring-amber/20`}>
            <Lightbulb className="size-[22px] text-amber" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold">Missing something?</h2>
            <p className="text-[13px] text-muted">Tell us what would make Promptogen better for you.</p>
          </div>
          <button type="button" onClick={onRequestFeature} className={btn("secondary", "sm")}>
            Request a feature
          </button>
        </section>
      </div>
    </PageShell>
  );
}
