import { useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import type { ProviderConfig } from "../lib/aiProvider";
import type { StyleProfile } from "../types";

interface SettingsDialogProps {
  initialConfig?: ProviderConfig;
  initialStyleProfile: StyleProfile;
  onClose: () => void;
  onSave: (config: ProviderConfig | undefined, styleProfile: StyleProfile) => void;
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

export function SettingsDialog({ initialConfig, initialStyleProfile, onClose, onSave }: SettingsDialogProps) {
  const [config, setConfig] = useState(initialConfig ?? defaultConfig);
  const [styleProfile, setStyleProfile] = useState(initialStyleProfile);

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
        <div className="settings-divider"><span>WRITING PROFILE</span></div>
        <div className="style-grid">
          <label>
            Venue
            <select value={styleProfile.venue} onChange={(event) => setStyleProfile({ ...styleProfile, venue: event.target.value as StyleProfile["venue"] })}>
              <option value="generic">Generic paper</option><option value="acl">ACL</option><option value="neurips">NeurIPS</option><option value="thesis">Thesis</option>
            </select>
          </label>
          <label>
            Voice
            <select value={styleProfile.voice} onChange={(event) => setStyleProfile({ ...styleProfile, voice: event.target.value as StyleProfile["voice"] })}>
              <option value="concise">Concise</option><option value="balanced">Balanced</option><option value="explanatory">Explanatory</option>
            </select>
          </label>
          <label>
            English
            <select value={styleProfile.english} onChange={(event) => setStyleProfile({ ...styleProfile, english: event.target.value as StyleProfile["english"] })}>
              <option value="american">American</option><option value="british">British</option>
            </select>
          </label>
        </div>
        <label>
          Phrases to avoid <small>comma or new line separated</small>
          <textarea value={styleProfile.avoidPhrases} onChange={(event) => setStyleProfile({ ...styleProfile, avoidPhrases: event.target.value })} placeholder="clearly, obviously" />
        </label>
        <ol className="model-usage-steps">
          <li>Choose a gateway and enter its exact model ID.</li>
          <li>Connect, then use <strong>Run review</strong> in the co-worker panel.</li>
          <li>The current main `.tex` file is sent; every returned patch still requires approval.</li>
        </ol>
        <footer>
          {initialConfig && <button className="disconnect-button" onClick={() => onSave(undefined, styleProfile)}>Disconnect model</button>}
          <button className="save-profile-button" onClick={() => onSave(initialConfig, styleProfile)}>Save profile</button>
          <button className="save-settings-button" disabled={!config.baseUrl || !config.model || !config.apiKey} onClick={() => onSave(config, styleProfile)}>Connect model</button>
        </footer>
      </section>
    </div>
  );
}
