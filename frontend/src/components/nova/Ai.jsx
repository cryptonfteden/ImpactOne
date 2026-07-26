import { ConfidenceBadge } from "./Badge";

// Phase X12C.0 — NOVA Showcase. The real AI Visual Language from
// NOVA_DESIGN_BIBLE.md §11 — one component per named concept (Thinking,
// Learning, Updated, Memory, Confidence, Recommendation), each reusing
// the SAME confidence-band vocabulary (Badge.jsx's confidenceBand) rather
// than inventing its own.

// AI Thinking — the signature looping gradient (motion.css's
// .nova-ai-thinking, defined once in X12B), never a generic spinner.
export function AiThinking({ label = "Thinking…" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--nova-space-3)" }} role="status" aria-live="polite">
      <span className="nova-ai-thinking" style={{ inlineSize: 24, blockSize: 24, borderRadius: "var(--nova-radius-full)" }} aria-hidden="true" />
      <span className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}

// AI Learning — a real evidence-accumulation bar, not a percentage,
// distinct from AI Confidence (this measures "has enough evidence
// arrived," not "how confident is the model").
export function AiLearning({ sampleSize, minimumSampleSize }) {
  const active = sampleSize >= minimumSampleSize;
  const pct = Math.min(100, (sampleSize / minimumSampleSize) * 100);
  return (
    <div>
      <div className="nova-progress">
        <div
          className="nova-progress__fill"
          style={{ inlineSize: `${pct}%`, backgroundColor: active ? "var(--nova-color-brand-signal)" : "var(--nova-color-text-tertiary)" }}
        />
      </div>
      <div className="nova-text-xs" style={{ marginTop: "var(--nova-space-1)", color: "var(--nova-color-text-tertiary)" }}>
        {sampleSize} / {minimumSampleSize} outcomes needed{active ? " — Active" : ""}
      </div>
    </div>
  );
}

// AI Updated — a small cyan freshness marker, deliberately a different
// hue from AI (violet) or brand (blue) per §11's "freshness is its own
// signal" rule.
export function AiUpdated({ minutesAgo }) {
  return (
    <span className="nova-text-xs" style={{ display: "inline-flex", alignItems: "center", gap: "var(--nova-space-1)", color: "var(--nova-color-brand-cyan)" }}>
      <span aria-hidden="true" style={{ inlineSize: 6, blockSize: 6, borderRadius: "var(--nova-radius-full)", backgroundColor: "var(--nova-color-brand-cyan)" }} />
      Updated {minutesAgo}m ago
    </span>
  );
}

// AI Memory — retrieved, not generated; a distinct, quieter card treatment
// (surface border, not violet) per §11's "retrieval is more trustworthy
// than generation, keep that legible" rule.
export function AiMemory({ headline, relevanceConfidence }) {
  return (
    <div className="nova-card" style={{ border: "var(--nova-border-subtle)", borderRadius: "var(--nova-radius-lg)" }}>
      <span className="nova-heading-eyebrow">🕐 Previously…</span>
      <p className="nova-text-sm">{headline}</p>
      <div className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
        Relevance: {relevanceConfidence}/100
      </div>
      <div className="nova-confidence-bar">
        <div className="nova-confidence-bar__fill" style={{ inlineSize: `${relevanceConfidence}%` }} />
      </div>
    </div>
  );
}

// AI Confidence — the shared bar + the same 4-band badge used everywhere.
export function AiConfidence({ score }) {
  return (
    <div>
      <div className="nova-confidence-bar">
        <div className="nova-confidence-bar__fill" style={{ inlineSize: `${score}%` }} />
      </div>
      <div style={{ marginTop: "var(--nova-space-2)" }}>
        <ConfidenceBadge score={score} />
      </div>
    </div>
  );
}

// AI Recommendation — the violet-marked card + action badge + confidence,
// the product's single most differentiating component per §11.
export function AiRecommendation({ symbol, action, confidence }) {
  return (
    <div className="nova-card" data-variant="recommendation" style={{ border: "1px solid var(--nova-color-brand-violet)", borderRadius: "var(--nova-radius-lg)", padding: "var(--nova-space-6)" }}>
      <div className="nova-card__eyebrow">
        <span className="nova-badge" data-tone={action === "BUY" ? "positive" : action === "EXIT" ? "negative" : "warning"}>
          {action}
        </span>
        <ConfidenceBadge score={confidence} />
      </div>
      <strong className="nova-text-lg">{symbol}</strong>
    </div>
  );
}
