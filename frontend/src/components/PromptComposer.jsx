import { useState, useRef, useEffect } from "react";
import { Sparkles, Paperclip, ArrowUpRight, ChevronDown, Check, X, FileText, Zap } from "lucide-react";
import { fetchAvailableModels, GEMINI_FREE_TIER_MODELS } from "../lib/api";
import { HERO_PHRASES } from "../data/heroPhrases";

export default function PromptComposer({
  value,
  onChange,
  onSubmit,
  isGenerating = false,
  selectedModel = "gemini-3.5-flash-lite",
  onSelectModel,
}) {
  const maxLength = 500;
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [models, setModels] = useState(GEMINI_FREE_TIER_MODELS);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchAvailableModels().then((data) => {
      if (mounted && data?.models?.length > 0) {
        setModels(data.models);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 30-second random hero phrase rotation
  const [phraseIndex, setPhraseIndex] = useState(() =>
    Math.floor(Math.random() * (HERO_PHRASES.length || 1))
  );
  const [fadeAnim, setFadeAnim] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFadeAnim(false);
      setTimeout(() => {
        setPhraseIndex(Math.floor(Math.random() * (HERO_PHRASES.length || 1)));
        setFadeAnim(true);
      }, 250);
    }, 30000); // exactly every 30 seconds

    return () => clearInterval(timer);
  }, []);

  const currentPhrase = HERO_PHRASES[phraseIndex] || {
    prefix: "Turn your ideas into",
    highlight: "powerful prompts",
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Multimodal attachment support (Gemini models, GPT-4o, Claude support attachments)
  const supportsAttachment = !selectedModel?.toLowerCase().includes("text-only");

  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isImage = file.type.startsWith("image/");
    const isText =
      file.type.startsWith("text/") ||
      file.name.match(/\.(json|sql|md|csv|py|js|ts|tsx|jsx|html|css|txt)$/i);

    if (isText) {
      reader.onload = () => {
        setAttachment({
          name: file.name,
          size: file.size,
          type: file.type || "text/plain",
          content: reader.result,
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        setAttachment({
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          content: reader.result, // base64 data url
          isBinary: true,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || attachment) && !isGenerating) {
        onSubmit(value, attachment);
      }
    }
  };

  const activeModelObj =
    models.find((m) => m.id === selectedModel) ||
    models[0] ||
    GEMINI_FREE_TIER_MODELS[0];

  return (
    <div className="flex flex-col items-center text-center">
      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-[12px] font-medium text-blue-300 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
        <Sparkles className="size-3.5 text-blue-400" />
        <span>Adaptive Multi-Model Prompt Engineering</span>
      </div>

      {/* Hero Headline (Rotates randomly every 30 seconds) */}
      <h1
        className={`mt-5 text-[36px] sm:text-[44px] font-extrabold tracking-tight text-white leading-tight transition-all duration-300 ${
          fadeAnim ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
        }`}
      >
        {currentPhrase.prefix}{" "}
        <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-sky-400 bg-clip-text text-transparent">
          {currentPhrase.highlight}
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mt-3 max-w-xl text-[14px] sm:text-[15px] leading-relaxed text-slate-400">
        AI-driven depth analysis identifies what's missing and asks adaptive questions to generate optimal, structured prompts.
      </p>

      {/* Main Input Box Card */}
      <div className="relative mt-8 w-full rounded-3xl border border-[#1b2742] bg-[#0c1322]/90 p-5 text-left shadow-[0_0_40px_-10px_rgba(37,99,235,0.15)] backdrop-blur-xl transition-all focus-within:border-blue-500/60 focus-within:shadow-[0_0_50px_-5px_rgba(37,99,235,0.25)]">
        <label
          htmlFor="pg-prompt-input"
          className="block text-[15px] font-medium text-slate-200"
        >
          What do you want to accomplish today?
        </label>

        <textarea
          id="pg-prompt-input"
          rows={3}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Build a microservice in Python with FastAPI, or create a growth marketing campaign..."
          className="mt-2 w-full resize-none bg-transparent text-[14px] sm:text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none"
        />

        {/* Attached file chip indicator */}
        {attachment && (
          <div className="mt-2 mb-1 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-200 w-fit">
            <Paperclip className="size-3.5 text-blue-400 shrink-0" />
            <span className="truncate max-w-[220px] font-medium">{attachment.name}</span>
            <span className="text-slate-400">({(attachment.size / 1024).toFixed(1)} KB)</span>
            <button
              type="button"
              onClick={handleRemoveAttachment}
              className="ml-1 text-slate-400 hover:text-white transition-colors"
              title="Remove attachment"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Bottom Toolbar inside card */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#172339] pt-3">
          {/* Left tools: Only working Attach Button + Gemini Model selector pill */}
          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileAttach}
              accept=".txt,.pdf,.doc,.docx,.json,.csv,.md,.py,.js,.jsx,.ts,.tsx,.sql,.html,.css,.png,.jpg,.jpeg,.webp"
            />

            <button
              type="button"
              disabled={!supportsAttachment}
              onClick={() => fileInputRef.current?.click()}
              title={
                supportsAttachment
                  ? "Attach context document, schema, code, or image"
                  : "Selected model does not support file attachments"
              }
              className={`grid size-8 place-items-center rounded-lg transition-colors ${
                supportsAttachment
                  ? "text-slate-400 hover:bg-white/5 hover:text-slate-200 cursor-pointer"
                  : "text-slate-600 opacity-40 cursor-not-allowed"
              }`}
            >
              <Paperclip className="size-4" />
            </button>

            {/* Model Selector Trigger */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-[#1b2740] bg-[#090e1a] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:text-white"
              >
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="truncate max-w-[140px] sm:max-w-none">{activeModelObj.label || activeModelObj.name}</span>
                <span className="rounded bg-slate-800/80 px-1 text-[9px] text-slate-300 border border-slate-700/60">
                  {activeModelObj.provider_label || (activeModelObj.free_tier ? "Free Tier" : "AI")}
                </span>
                <ChevronDown className="size-3 text-slate-400" />
              </button>

              {modelDropdownOpen && (
                <div className="absolute left-0 bottom-full mb-2 z-50 w-80 max-h-72 overflow-y-auto rounded-xl border border-[#1b2740] bg-[#0c1322] p-1.5 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Select AI Model</span>
                    <span>{models.length} Available</span>
                  </div>
                  {models.map((model) => {
                    const isSel = model.id === selectedModel;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onSelectModel?.(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`flex w-full items-start justify-between rounded-lg p-2 text-left transition-colors ${
                          isSel
                            ? "bg-blue-600/20 text-blue-300 font-semibold"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex flex-col pr-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11.5px] truncate">{model.label || model.name}</span>
                            <span className="rounded bg-slate-800/80 px-1 py-0.2 text-[8.5px] text-slate-300">
                              {model.provider_label || model.provider}
                            </span>
                            {model.badge && (
                              <span className="rounded bg-blue-500/20 px-1 py-0.2 text-[8.5px] text-blue-300">
                                {model.badge}
                              </span>
                            )}
                          </div>
                          {model.description && (
                            <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {model.description}
                            </span>
                          )}
                        </div>
                        {isSel && <Check className="size-3.5 text-blue-400 shrink-0 mt-0.5 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right side: Character counter & Submit button */}
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-slate-500">
              {value.length}/{maxLength}
            </span>

            <button
              type="button"
              onClick={() => onSubmit(value, attachment)}
              disabled={(!value.trim() && !attachment) || isGenerating}
              aria-label="Generate prompt"
              className="grid size-9 place-items-center rounded-xl bg-[#2563eb] text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUpRight className="size-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
