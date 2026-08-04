// Phase X12C.0 — NOVA Showcase. Semantic badges + the confidence-band
// vocabulary from NOVA_DESIGN_BIBLE.md §11 — the ONE confidence
// representation reused everywhere confidence appears in the product.
export default function Badge({ children, tone = "neutral", className = "", ...rest }) {
  return (
    <span className={`nova-badge ${className}`.trim()} data-tone={tone} {...rest}>
      {children}
    </span>
  );
}

// §11's fixed 4-band vocabulary: Low/Moderate/High/Very High — same
// bands, same colors, everywhere (recommendations, calibration, source
// trust). Never reimplemented per-feature.
export function confidenceBand(score) {
  if (score >= 85) return { label: "Very High", tone: "positive" };
  if (score >= 65) return { label: "High", tone: "info" };
  if (score >= 40) return { label: "Moderate", tone: "warning" };
  return { label: "Low", tone: "neutral" };
}

export function ConfidenceBadge({ score }) {
  const { label, tone } = confidenceBand(score);
  return <Badge tone={tone}>{label} · {score}/100</Badge>;
}

// A real, evidence-count badge — distinct from confidence (this names
// how much evidence, not how confident the model is in it).
export function EvidenceBadge({ count, label = "evidence" }) {
  return <Badge tone="neutral">{count} {label}</Badge>;
}
