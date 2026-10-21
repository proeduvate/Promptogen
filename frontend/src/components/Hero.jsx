import { useRef, useState } from "react";
import {
  CornerDownLeft,
  Paperclip,
  ImagePlus,
  Mic,
  MicOff,
  X,
  FileText,
  Image as ImageIcon,
  Contact,
  ChevronDown,
  Check,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import Menu from "./Menu";
import { SUGGESTED_CATEGORIES } from "../data/content";
import useSpeechInput from "../hooks/useSpeechInput";
import { complexityOf, estimateTokens, redact, scanSecurity } from "../lib/analysis";

const MAX_CHARS = 500;
const MAX_ATTACHMENTS = 5;
const MAX_BYTES = 10 * 1024 * 1024;

/* Fixed positions keep the starfield stable across rerenders. */
const STARS = [
  [4, 12], [9, 30], [14, 8], [22, 52], [27, 18], [33, 74], [41, 10],
  [48, 60], [55, 26], [62, 80], [68, 14], [74, 44], [81, 22], [88, 66],
  [93, 34], [97, 12], [18, 88], [59, 92], [86, 86],
];

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const TOOL_BUTTON =
  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:cursor-not-allowed disabled:opacity-40";

export default function Hero({
  value,
  onChange,
  onSubmit,
  attachments,
  onAttachmentsChange,
  profiles,
  activeProfileId,
  onProfileChange,
  onManageProfiles,
}) {
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const [attachError, setAttachError] = useState("");
  const speech = useSpeechInput((text) => onChange(`${value}${value && !value.endsWith(" ") ? " " : ""}${text}`.slice(0, MAX_CHARS)));

  const findings = scanSecurity(value);
  const complexity = complexityOf(value);
  const activeProfile = profiles.find(({ id }) => id === activeProfileId);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim()) onSubmit();
    }
  };

  const addFiles = (fileList, kind) => {
    const files = [...(fileList ?? [])];
    const tooBig = files.filter((file) => file.size > MAX_BYTES);
    const room = MAX_ATTACHMENTS - attachments.length;
    const accepted = files.filter((file) => file.size <= MAX_BYTES).slice(0, Math.max(0, room));
    setAttachError(
      tooBig.length
        ? `${tooBig.map((file) => file.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over 10 MB.`
        : files.length > accepted.length
          ? `You can attach up to ${MAX_ATTACHMENTS} files.`
          : "",
    );
    // Hand-off point: upload attachments with the idea once the generation API accepts files.
    onAttachmentsChange([
      ...attachments,
      ...accepted.map((file) => ({ id: `${file.name}-${file.size}-${Date.now()}`, name: file.name, size: file.size, kind })),
    ]);
  };

  const profileItems = [
    {
      id: "none",
      label: "No context",
      icon: activeProfileId ? undefined : Check,
      tone: "text-brand",
      onSelect: () => onProfileChange(null),
    },
    ...profiles.map((profile) => ({
      id: profile.id,
      label: profile.name,
      icon: profile.id === activeProfileId ? Check : undefined,
      tone: "text-brand",
      onSelect: () => onProfileChange(profile.id),
    })),
    { id: "manage", label: "Manage profiles…", icon: Settings2, onSelect: onManageProfiles },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface px-5 pb-8 pt-9 sm:px-8">
      {/* Decorative starfield */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {STARS.map(([left, top], index) => (
          <span
            key={index}
            className="absolute size-[3px] rounded-full bg-text/25"
            style={{ left: `${left}%`, top: `${top}%` }}
          />
        ))}
      </div>

      {/* Decorative paper plane + flight path */}
      <svg
        aria-hidden
        viewBox="0 0 220 170"
        className="pointer-events-none absolute right-6 top-24 hidden w-[220px] text-brand xl:block"
      >
        <path
          d="M6 158C36 150 74 128 104 96"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 9"
          opacity="0.55"
        />
        <path d="M170 24 108 96l34 10 8 30 42-100-22-12z" fill="currentColor" opacity="0.9" />
        <path d="M170 24 142 106l-34-10z" fill="currentColor" opacity="0.55" />
      </svg>

      <div className="relative">
        <div className="flex justify-center">
          <span className="rounded-full border border-brand/45 bg-brand/5 px-4 py-1.5 text-[13px] font-medium text-brand">
            AI-Powered Prompt Engineering
          </span>
        </div>

        <h1 className="mt-6 text-center text-[36px] font-bold leading-tight tracking-tight sm:text-[54px]">
          Welcome to <span className="text-brand">Promptogen</span>
        </h1>

        <p className="mx-auto mt-3 max-w-[560px] text-center text-[15px] leading-7 text-muted">
          From idea to high-performing prompts.
          <br />
          Tell us what you want to achieve; we'll help you ask AI properly.
        </p>

        {/* Composer */}
        <div className="mx-auto mt-9 max-w-[720px] rounded-xl border border-line bg-surface-2 p-5 focus-within:border-brand/50">
          <label htmlFor="pg-idea" className="block text-[16px] font-medium">
            What do you want to create today?
          </label>
          <textarea
            id="pg-idea"
            rows={3}
            maxLength={MAX_CHARS}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Create a marketing plan for my business."
            aria-describedby="pg-idea-meta"
            className="mt-3 w-full resize-none bg-transparent text-[15px] leading-7 text-text outline-none placeholder:text-faint"
          />

          {findings.length > 0 && (
            <div
              role="alert"
              className={`mt-2 rounded-lg border px-3.5 py-3 text-[13px] ${
                findings.some(({ severity }) => severity === "high") ? "border-bad/40 bg-bad/10" : "border-amber/40 bg-amber/10"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert
                  className={`mt-0.5 size-4 shrink-0 ${findings.some(({ severity }) => severity === "high") ? "text-bad" : "text-amber"}`}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  {findings.map((finding) => (
                    <p key={finding.title + finding.body}>
                      <span className="font-semibold">{finding.title}.</span> <span className="text-muted">{finding.body}</span>
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onChange(redact(value, findings.filter(({ kind }) => kind === "secret" || kind === "personal")))}
                  className="shrink-0 rounded-md border border-line bg-surface px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-surface-3"
                >
                  Remove it
                </button>
              </div>
            </div>
          )}

          {attachments.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attachments">
              {attachments.map((file) => {
                const Icon = file.kind === "image" ? ImageIcon : FileText;
                return (
                  <li key={file.id} className="flex max-w-[240px] items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px]">
                    <Icon className="size-3.5 shrink-0 text-brand" />
                    <span className="min-w-0 truncate">{file.name}</span>
                    <span className="shrink-0 text-faint">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => onAttachmentsChange(attachments.filter(({ id }) => id !== file.id))}
                      aria-label={`Remove ${file.name}`}
                      className="grid size-5 shrink-0 place-items-center rounded text-muted hover:bg-surface-3 hover:text-text"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {attachError && (
            <p role="status" className="mt-2 text-[12px] text-amber">
              {attachError}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-3">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx"
              className="hidden"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                addFiles(event.target.files, "file");
                event.target.value = "";
              }}
            />
            <input
              ref={imageRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                addFiles(event.target.files, "image");
                event.target.value = "";
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={attachments.length >= MAX_ATTACHMENTS} className={TOOL_BUTTON}>
              <Paperclip className="size-4" />
              <span className="hidden sm:inline">Attach file</span>
              <span className="sr-only sm:hidden">Attach file</span>
            </button>
            <button type="button" onClick={() => imageRef.current?.click()} disabled={attachments.length >= MAX_ATTACHMENTS} className={TOOL_BUTTON}>
              <ImagePlus className="size-4" />
              <span className="hidden sm:inline">Image</span>
              <span className="sr-only sm:hidden">Attach image</span>
            </button>
            <button
              type="button"
              onClick={speech.toggle}
              disabled={!speech.supported}
              aria-pressed={speech.listening}
              title={speech.supported ? undefined : "Voice input isn't supported in this browser"}
              className={`${TOOL_BUTTON} ${speech.listening ? "bg-bad/10 text-bad hover:bg-bad/15 hover:text-bad" : ""}`}
            >
              {speech.listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              <span className="hidden sm:inline">{speech.listening ? "Stop" : "Voice"}</span>
              <span className="sr-only sm:hidden">{speech.listening ? "Stop voice input" : "Voice input"}</span>
            </button>

            <Menu
              items={profileItems}
              align="start"
              renderTrigger={({ open, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  className={`${TOOL_BUTTON} ${activeProfile ? "text-brand" : ""}`}
                >
                  <Contact className="size-4" />
                  <span className="max-w-[160px] truncate">{activeProfile ? `Context: ${activeProfile.name}` : "Use context"}</span>
                  <ChevronDown className="size-3.5" />
                </button>
              )}
            />

            <div className="flex-1" />
            <button
              type="button"
              onClick={onSubmit}
              disabled={value.trim().length === 0}
              className="flex items-center gap-2 rounded-lg bg-brand-strong px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enter
              <CornerDownLeft className="size-4" />
            </button>
          </div>

          <p id="pg-idea-meta" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-faint">
            <span>
              {value.length}/{MAX_CHARS}
            </span>
            {complexity && (
              <>
                <span>
                  Complexity: <span className={complexity.tone}>{complexity.level}</span>
                </span>
                <span>~{estimateTokens(value)} tokens</span>
              </>
            )}
            {speech.listening && <span className="text-bad">Listening…</span>}
          </p>
        </div>

        {/* Suggested categories */}
        <p className="mt-7 text-[14px] text-muted">Not sure where to start? Pick a category:</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {SUGGESTED_CATEGORIES.map(({ id, label, icon: Icon, tone, seed }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(seed)}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-[14px] text-text transition-colors hover:border-brand/40 hover:bg-surface-3"
            >
              <Icon className={`size-[17px] ${tone}`} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
