import { useState, useEffect } from "react";
import { Cpu, ChevronDown, Check, Key, Sparkles, ExternalLink, Zap, ShieldCheck } from "lucide-react";
import { fetchAvailableModels, resolveProviderForModel, GEMINI_FREE_TIER_MODELS } from "../../lib/api";

const PROVIDER_METADATA = {
  gemini: {
    label: "Google Gemini",
    keyName: "Gemini API Key",
    keyPlaceholder: "Paste Google AI Studio Key (AIzaSy...)",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyUrlLabel: "Get Free Key",
    badgeColor: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  groq: {
    label: "Groq LPU",
    keyName: "Groq API Key",
    keyPlaceholder: "Paste Groq API Key (gsk_...)",
    keyUrl: "https://console.groq.com/keys",
    keyUrlLabel: "Get Groq Key",
    badgeColor: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  },
  openai: {
    label: "OpenAI",
    keyName: "OpenAI API Key",
    keyPlaceholder: "Paste OpenAI API Key (sk-...)",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "Get OpenAI Key",
    badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  anthropic: {
    label: "Anthropic Claude",
    keyName: "Anthropic API Key",
    keyPlaceholder: "Paste Anthropic API Key (sk-ant-...)",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyUrlLabel: "Get Anthropic Key",
    badgeColor: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  },
};

export default function AIModelSelectorPanel({
  selectedModel = "gemini-3.5-flash-lite",
  onSelectModel,
  apiKey = "",
  onApiKeyChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [models, setModels] = useState(GEMINI_FREE_TIER_MODELS);
  const [providers, setProviders] = useState({});

  useEffect(() => {
    let mounted = true;
    fetchAvailableModels().then((data) => {
      if (mounted && data) {
        if (Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
        }
        if (data.providers) {
          setProviders(data.providers);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

  const current =
    models.find((m) => m.id === selectedModel) ||
    models[0] || {
      id: "gemini-3.5-flash-lite",
      label: "Gemini 3.5 Flash-Lite",
      provider: "gemini",
      provider_label: "Google Gemini",
      description: "Fast multimodal reasoning and prompt generation",
      free_tier: true,
    };

  const currentProviderKey = current.provider || resolveProviderForModel(current.id, models);
  const providerMeta = PROVIDER_METADATA[currentProviderKey] || PROVIDER_METADATA.gemini;
  const hasServerKey = current.has_server_key ?? Boolean(providers[currentProviderKey]?.has_token);

  return (
    <div className="relative rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
          <Cpu className="size-4 text-blue-400" />
          <span>AI Model Engine</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${
            current.free_tier
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : providerMeta.badgeColor
          }`}
        >
          {current.free_tier ? (
            <>
              <Sparkles className="size-3" />
              Free Tier
            </>
          ) : (
            <>
              <Zap className="size-3" />
              {providerMeta.label}
            </>
          )}
        </span>
      </div>

      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-[#1b2740] bg-[#0c1426] px-3 py-2 text-left text-[12px] text-slate-200 transition-colors hover:border-blue-500/40 hover:bg-[#121c34]"
      >
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="truncate font-semibold text-slate-100">{current.label || current.name}</span>
            <span className="shrink-0 text-[10px] text-slate-400 font-normal">
              • {current.provider_label || providerMeta.label}
            </span>
          </div>
          <span className="truncate text-[10.5px] text-slate-400">{current.id}</span>
        </div>
        <ChevronDown className="size-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-80 overflow-y-auto rounded-xl border border-[#1b2740] bg-[#0c1322] p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Available AI Models</span>
            <span>{models.length} Enabled</span>
          </div>
          {models.map((model) => {
            const isSel = model.id === selectedModel;
            const modelProv = model.provider || resolveProviderForModel(model.id);
            const provConfig = PROVIDER_METADATA[modelProv] || PROVIDER_METADATA.gemini;

            return (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onSelectModel?.(model.id, modelProv);
                  setIsOpen(false);
                }}
                className={`flex w-full items-start justify-between rounded-lg p-2 text-left transition-colors ${
                  isSel
                    ? "bg-blue-600/20 text-blue-300 font-semibold"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex flex-col pr-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] truncate">{model.label || model.name}</span>
                    <span className="rounded bg-slate-800/80 px-1.5 py-0.2 text-[9px] text-slate-300 border border-slate-700/60">
                      {model.provider_label || provConfig.label}
                    </span>
                    {model.badge && (
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-medium text-blue-300">
                        {model.badge}
                      </span>
                    )}
                  </div>
                  {model.description && (
                    <span className="text-[10px] leading-snug text-slate-400 mt-0.5 line-clamp-2">
                      {model.description}
                    </span>
                  )}
                  {model.limits && (
                    <span className="text-[9px] text-slate-500 mt-0.5">
                      Limits: {model.limits}
                    </span>
                  )}
                </div>
                {isSel && <Check className="size-3.5 text-blue-400 shrink-0 mt-0.5 ml-1" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Dynamic API Key Drawer for Active Provider */}
      <div className="mt-3 border-t border-[#172339] pt-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Key className="size-3 text-amber-400" />
            <span>{providerMeta.keyName}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="text-blue-400 hover:underline text-[11px]"
          >
            {apiKey ? "Change Key" : "Set Custom Key"}
          </button>
        </div>

        {apiKey && !showKeyInput && (
          <div className="mt-1 flex items-center justify-between rounded-lg bg-[#0e1628] px-2.5 py-1 text-[11px] text-slate-300">
            <span className="font-mono text-[10px] text-emerald-400">
              ••••••••{apiKey.slice(-4)}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Custom Key Active</span>
          </div>
        )}

        {!apiKey && !showKeyInput && (
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-500">
            {hasServerKey ? (
              <>
                <ShieldCheck className="size-3 text-emerald-500/80 shrink-0" />
                <span>Backend token configured in server environment.</span>
              </>
            ) : (
              <span className="text-amber-400/90 font-medium">
                No server token detected for {providerMeta.label}. Please provide custom key.
              </span>
            )}
          </div>
        )}

        {showKeyInput && (
          <div className="mt-2 space-y-2 rounded-xl border border-[#1b2740] bg-[#0e1628] p-2.5">
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder={providerMeta.keyPlaceholder}
              className="w-full rounded-lg border border-[#23314d] bg-[#070b14] px-2.5 py-1.5 text-[11px] font-mono text-slate-100 placeholder:text-slate-600 outline-none focus:border-blue-500"
            />
            <div className="flex items-center justify-between">
              <a
                href={providerMeta.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-400"
              >
                <span>{providerMeta.keyUrlLabel}</span>
                <ExternalLink className="size-2.5" />
              </a>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTempKey("");
                    onApiKeyChange?.("", currentProviderKey);
                    setShowKeyInput(false);
                  }}
                  className="rounded px-2 py-0.5 text-[10.5px] text-slate-400 hover:text-white"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApiKeyChange?.(tempKey.trim(), currentProviderKey);
                    setShowKeyInput(false);
                  }}
                  className="rounded bg-blue-600 px-2.5 py-0.5 text-[10.5px] font-medium text-white hover:bg-blue-500"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
