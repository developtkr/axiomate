import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Lightbulb,
  History,
  MessageSquareText,
  SearchCheck,
  Sigma,
  Sparkles,
  X,
} from "lucide-react";
import type { ReviewRun, Suggestion, SuggestionCategory } from "../types";

interface CoWorkerPanelProps {
  suggestions: Suggestion[];
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
  onRunReview: () => void;
  isReviewing: boolean;
  providerLabel: string;
  runs: ReviewRun[];
}

const categoryIcons: Record<SuggestionCategory, typeof Sigma> = {
  evidence: SearchCheck,
  logic: CircleAlert,
  math: Sigma,
  writing: MessageSquareText,
  latex: AlertTriangle,
};

export function CoWorkerPanel({ suggestions, onApply, onDismiss, onRunReview, isReviewing, providerLabel, runs }: CoWorkerPanelProps) {
  const [filter, setFilter] = useState<"all" | "history" | SuggestionCategory>("all");
  const visible = filter === "all" ? suggestions : suggestions.filter((item) => item.category === filter);

  return (
    <aside className="coworker-panel">
      <header className="coworker-heading">
        <div>
          <span className="presence-dot" />
          <div><small>RESEARCH CO-WORKER</small><strong>Axiom</strong></div>
        </div>
        <button className="model-button">{providerLabel} <ChevronDown size={12} /></button>
      </header>

      <section className="review-callout">
        <div className="review-icon"><Bot size={19} /></div>
        <div>
          <strong>Paper-aware review</strong>
          <p>Check evidence, argument structure, mathematical notation, and writing together.</p>
        </div>
        <button onClick={onRunReview} disabled={isReviewing}>
          {isReviewing ? "Reviewing…" : "Run review"}<Sparkles size={14} />
        </button>
      </section>

      <div className="filter-row" role="tablist" aria-label="Suggestion filters">
        {(["all", "math", "evidence", "logic", "writing", "history"] as const).map((item) => (
          <button
            className={filter === item ? "active" : ""}
            key={item}
            onClick={() => setFilter(item)}
            role="tab"
          >
            {item === "all" ? `All ${suggestions.length}` : item === "history" ? `History ${runs.length}` : item}
          </button>
        ))}
      </div>

      <div className="suggestion-list">
        {filter === "history" && runs.length === 0 && (
          <div className="empty-state"><History size={22} /><strong>No review runs yet</strong><p>Run a review, apply a patch, or compile.</p></div>
        )}
        {filter === "history" && runs.map((run) => (
          <article className={`run-card run-${run.status}`} key={run.id}>
            <div><History size={13} /><strong>{run.label}</strong><span>{new Date(run.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
            <p>{run.provider} · {run.findingCount} finding{run.findingCount === 1 ? "" : "s"}</p>
            <small>{run.status}</small>
          </article>
        ))}
        {filter !== "history" && visible.length === 0 && (
          <div className="empty-state"><Check size={22} /><strong>No open suggestions</strong><p>This view is clear.</p></div>
        )}
        {filter !== "history" && visible.map((suggestion) => {
          const Icon = categoryIcons[suggestion.category];
          return (
            <article className={`suggestion-card severity-${suggestion.severity}`} key={suggestion.id}>
              <div className="suggestion-meta">
                <span><Icon size={13} /> {suggestion.category}</span>
                <span>{suggestion.file}:{suggestion.line}</span>
              </div>
              <h3>{suggestion.title}</h3>
              <p>{suggestion.detail}</p>
              <details>
                <summary>Why Axiom flagged this</summary>
                <p>{suggestion.rationale}</p>
                {suggestion.related && <small>RELATED · {suggestion.related.join(" · ")}</small>}
              </details>
              {suggestion.original && suggestion.replacement && (
                <div className="mini-diff">
                  <span className="diff-remove">− {suggestion.original}</span>
                  <span className="diff-add">+ {suggestion.replacement}</span>
                </div>
              )}
              <div className="suggestion-actions">
                {suggestion.replacement ? (
                  <button className="apply-button" onClick={() => onApply(suggestion)}>
                    Apply patch <ArrowRight size={13} />
                  </button>
                ) : (
                  <button className="inspect-button"><Lightbulb size={13} /> Inspect</button>
                )}
                <button className="dismiss-button" onClick={() => onDismiss(suggestion)} title="Dismiss suggestion">
                  <X size={14} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
