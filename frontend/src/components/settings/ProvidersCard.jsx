import { useId, useState } from "react";
import { PlugZap, KeyRound, Check, Lock, Unplug } from "lucide-react";
import SettingsCard from "./SettingsCard";
import Dialog from "../Dialog";
import { MODELS_CATALOG, PROVIDERS } from "../../data/models";
import { btn } from "../../lib/ui";

const KEY_HINTS = { OpenAI: "sk-…", Anthropic: "sk-ant-…", Google: "AIza…", Meta: "Your provider key", Mistral: "Your Mistral key" };

/* Only a masked hint is ever kept on the client. */
const maskKey = (key) => (key.length > 10 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "••••••••");

function ConnectDialog({ provider, onConnect, onClose }) {
  const id = useId();
  const [key, setKey] = useState("");
  const valid = key.trim().length >= 12;

  const connect = () => {
    // Hand-off point: send the key over HTTPS to be stored encrypted server-side.
    // It is never logged, kept in local storage, or shown again in plain text.
    onConnect(provider, { masked: maskKey(key.trim()), connectedAt: Date.now() });
    setKey("");
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      icon={KeyRound}
      title={`Connect ${provider}`}
      description="Paste an API key from your provider dashboard."
      footer={
        <>
          <button type="button" onClick={onClose} className={btn("secondary")}>
            Cancel
          </button>
          <button type="button" onClick={connect} disabled={!valid} className={btn("primary")}>
            <PlugZap className="size-4" />
            Connect
          </button>
        </>
      }
    >
      <label htmlFor={`${id}-key`} className="mb-2 block text-[13px] font-medium">
        API key
      </label>
      <input
        id={`${id}-key`}
        data-autofocus
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={key}
        onChange={(event) => setKey(event.target.value)}
        placeholder={KEY_HINTS[provider]}
        className="w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 font-mono text-[14px] text-text outline-none placeholder:text-faint focus:border-brand/60"
      />
      <p className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-muted">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-good" />
        Keys are encrypted at rest and never displayed in plain text after saving. Only the last four characters are shown.
      </p>
    </Dialog>
  );
}

/* Connected providers, keys and model availability (spec §38). */
export default function ProvidersCard({ providers, onChange }) {
  const [connecting, setConnecting] = useState(null);

  const connect = (provider, connection) => onChange({ ...providers, [provider]: connection });
  const disconnect = (provider) => {
    const next = { ...providers };
    delete next[provider];
    onChange(next);
  };

  return (
    <SettingsCard icon={PlugZap} title="Connected Providers" description="Connect AI providers to test prompts and run Model Lab with real models.">
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {PROVIDERS.map((provider) => {
          const connection = providers[provider];
          return (
            <li key={provider} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{provider}</p>
                <p className="text-[12px] text-muted">
                  {connection ? (
                    <>
                      Key <span className="font-mono">{connection.masked}</span> · connected{" "}
                      {new Date(connection.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </>
                  ) : (
                    "Not connected"
                  )}
                </p>
              </div>
              {connection ? (
                <>
                  <span className="flex items-center gap-1 rounded-full bg-good/10 px-2.5 py-0.5 text-[12px] font-medium text-good">
                    <Check className="size-3.5" strokeWidth={2.5} />
                    Connected
                  </span>
                  <button type="button" onClick={() => disconnect(provider)} className={btn("ghost", "sm")} aria-label={`Disconnect ${provider}`}>
                    <Unplug className="size-4" />
                    Disconnect
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConnecting(provider)} className={btn("secondary", "sm")}>
                  <KeyRound className="size-4" />
                  Connect
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 className="mb-2 mt-6 text-[13px] font-medium">Model availability</h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MODELS_CATALOG.map((model) => {
          const available = Boolean(providers[model.provider]);
          return (
            <li key={model.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{model.name}</span>
                <span className="block text-[11px] text-faint">{model.provider}</span>
              </span>
              <span className={`shrink-0 text-[12px] ${available ? "text-good" : "text-muted"}`}>
                {available ? "Available" : "Connect provider"}
              </span>
            </li>
          );
        })}
      </ul>

      {connecting && <ConnectDialog provider={connecting} onConnect={connect} onClose={() => setConnecting(null)} />}
    </SettingsCard>
  );
}
