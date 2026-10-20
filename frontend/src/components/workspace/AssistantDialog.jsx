import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal, Sparkles } from "lucide-react";
import Dialog from "../Dialog";
import { CONTEXT_GAPS } from "../../lib/quality";
import { proposeChanges } from "../../lib/optimizer";
import { btn } from "../../lib/ui";

const STARTERS = ["Why is my context score low?", "Make this prompt shorter without losing requirements.", "What information am I missing?"];

/* Rule-based replies from the live quality report. Each reply can carry
   actions that open the optimizer or tester.
   Hand-off point: replace with the assistant service. */
function reply(question, { quality, sections, domain, modelId }) {
  const text = question.toLowerCase();
  const dimension = quality.dimensions.find((item) => text.includes(item.label.toLowerCase()) || text.includes(item.id));

  if (dimension && /why|score|low|explain|how/.test(text)) {
    return {
      text: `${dimension.label} is ${dimension.score}/100. ${dimension.summary}${dimension.missing.length ? ` Missing: ${dimension.missing.join("; ")}.` : ""} ${dimension.note ?? ""}`.trim(),
      actions: dimension.id === "context" && dimension.missing.length ? [{ label: "Add missing context", mode: "context" }] : [{ label: "Show suggestions", focus: "suggestions" }],
    };
  }
  if (/short|concise|trim|token|cheaper|length/.test(text)) {
    const count = proposeChanges("concise", sections, { domain, modelId }).length;
    return count
      ? { text: `I found ${count === 1 ? "1 change that removes" : `${count} changes that remove`} filler and repetition without touching your requirements. Review them before anything is applied.`, actions: [{ label: "Review changes", mode: "concise" }] }
      : { text: "It's already lean: I couldn't find filler or repeated lines to remove without losing requirements." };
  }
  if (/missing|gap|forgot|what else|information/.test(text)) {
    const gaps = quality.dimensions.find((item) => item.id === "context").gaps ?? [];
    const others = quality.dimensions.filter((item) => item.id !== "context" && item.score < 80).map((item) => item.label);
    if (!gaps.length && !others.length) return { text: "Nothing important is missing. Consider testing it against success criteria next.", actions: [{ label: "Test prompt", test: true }] };
    return {
      text: `${gaps.length ? `The AI would have to guess: ${gaps.map((label) => CONTEXT_GAPS[label].name.toLowerCase()).join(", ")}.` : ""}${others.length ? ` Weaker areas: ${others.join(", ")}.` : ""}`.trim(),
      actions: gaps.length ? [{ label: "Add missing context", mode: "context" }] : [],
    };
  }
  if (/test|work|reliab/.test(text)) {
    return { text: "Testing checks the response against your own success criteria and gives a Tested Performance score, separate from quality.", actions: [{ label: "Test prompt", test: true }] };
  }
  if (/improve|better|stronger|fix/.test(text)) {
    const weakest = [...quality.dimensions].sort((a, b) => a.score - b.score)[0];
    const mode = { clarity: "clarity", specificity: "specificity", context: "context", structure: "structure", constraints: "constraints", output: "format", actionability: "detailed", consistency: "clarity" }[weakest.id];
    return { text: `The biggest gain is in ${weakest.label} (${weakest.score}/100). ${weakest.summary}`, actions: [{ label: `Improve ${weakest.label}`, mode }] };
  }
  return { text: "I can explain any score, find missing information, shorten the prompt, or suggest the most useful improvement. Try one of these:", starters: true };
}

/* Smart Prompt Assistant (spec §41): ask about the prompt in plain words. */
export default function AssistantDialog({ quality, sections, domain, modelId, onClose, onOptimize, onTest, onFocusSuggestions }) {
  const [messages, setMessages] = useState([{ from: "assistant", text: "Hi! Ask me anything about this prompt.", starters: true }]);
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const ask = (question) => {
    const value = question.trim();
    if (!value) return;
    setMessages((list) => [...list, { from: "user", text: value }, { from: "assistant", ...reply(value, { quality, sections, domain, modelId }) }]);
    setDraft("");
  };

  const runAction = (action) => {
    if (action.mode) onOptimize(action.mode);
    else if (action.test) onTest();
    else if (action.focus) onFocusSuggestions();
  };

  const footer = (
    <form
      className="flex w-full gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        ask(draft);
      }}
    >
      <input data-autofocus aria-label="Ask the assistant" value={draft} maxLength={300} placeholder="Ask about this prompt…" onChange={(event) => setDraft(event.target.value)} className="w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] outline-none focus:border-brand/60" />
      <button type="submit" disabled={!draft.trim()} aria-label="Send" className={`${btn("primary")} shrink-0`}>
        <SendHorizontal className="size-4" />
      </button>
    </form>
  );

  return (
    <Dialog open onClose={onClose} title="Prompt Assistant" description="Explains scores, finds gaps and proposes changes you can review." icon={Bot} tone="purple" size="lg" footer={footer}>
      <ol className="space-y-3" aria-live="polite">
        {messages.map((message, index) => (
          <li key={index} className={`flex ${message.from === "user" ? "justify-end" : ""}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-5 ${message.from === "user" ? "bg-brand-strong text-white" : "border border-line bg-surface-2"}`}>
              {message.from === "assistant" && (
                <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-purple">
                  <Sparkles className="size-3" />
                  Assistant
                </span>
              )}
              <p>{message.text}</p>
              {message.actions?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.actions.map((action) => (
                    <button key={action.label} type="button" onClick={() => runAction(action)} className={btn("purpleSoft", "sm")}>
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              {message.starters && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {STARTERS.map((starter) => (
                    <button key={starter} type="button" onClick={() => ask(starter)} className="rounded-full border border-line bg-surface px-3 py-1 text-left text-[12px] text-text hover:bg-surface-3">
                      {starter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div ref={endRef} />
    </Dialog>
  );
}
