import { useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import type { ProviderConfig } from "../lib/aiProvider";

interface SettingsDialogProps {
  initialConfig?: ProviderConfig;
  onClose: () => void;
  onSave: (config?: ProviderConfig) => void;
}

const defaultConfig: ProviderConfig = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-5-mini",
};

const presets = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-5-mini" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-5-mini" },
  { label: "Custom", baseUrl: "", model: "" },
] as const;

export function SettingsDialog({ initialConfig, onClose, onSave }: SettingsDialogProps) {
  const [config, setConfig] = useState(initialConfig ?? defaultConfig);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><KeyRound size={17} /><h2 id="settings-title">Model connection</h2></div>
          <button onClick={onClose} aria-label="Close settings"><X size={16} /></button>
        </header>
        <p>Connect OpenAI, OpenRouter, or any OpenAI-compatible gateway for a second-pass semantic review. Deterministic checks always run locally.</p>
        <div className="provider-presets" aria-label="Gateway presets">
          {presets.map((preset) => (
            <button
              className={preset.baseUrl && config.baseUrl === preset.baseUrl ? "active" : ""}
              key={preset.label}
              onClick={() => setConfig({ ...config, baseUrl: preset.baseUrl, model: preset.model })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <label>
          Gateway host
          <input value={config.baseUrl} onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })} spellCheck={false} />
        </label>
        <label>
          Model
          <input value={config.model} onChange={(event) => setConfig({ ...config, model: event.target.value })} spellCheck={false} />
        </label>
        <label>
          API key
          <input type="password" value={config.apiKey} onChange={(event) => setConfig({ ...config, apiKey: event.target.value })} placeholder="sk-…" autoComplete="off" />
        </label>
        <div className="privacy-note"><ShieldCheck size={14} /><span>The key is held in memory for this session only. It is never written to the project or run history.</span></div>
        <ol className="model-usage-steps">
          <li>Choose a gateway and enter its exact model ID.</li>
          <li>Connect, then use <strong>Run review</strong> in the co-worker panel.</li>
          <li>The current main `.tex` file is sent; every returned patch still requires approval.</li>
        </ol>
        <footer>
          {initialConfig && <button className="disconnect-button" onClick={() => onSave(undefined)}>Disconnect</button>}
          <button className="save-settings-button" disabled={!config.baseUrl || !config.model || !config.apiKey} onClick={() => onSave(config)}>Connect model</button>
        </footer>
      </section>
    </div>
  );
}
