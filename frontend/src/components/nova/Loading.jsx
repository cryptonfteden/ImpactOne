// Phase X12C.0 — NOVA Showcase. Skeleton, Progress, and the real empty/
// offline/reconnect states from NOVA_DESIGN_BIBLE.md §15 — one file since
// they're all "the honest state while something isn't ready yet."
export function Skeleton({ width = "100%", height = 16, radius, className = "" }) {
  return (
    <div
      className={`nova-skeleton ${className}`.trim()}
      style={{ inlineSize: width, blockSize: height, borderRadius: radius ? radius : undefined }}
      aria-hidden="true"
    />
  );
}

export function ProgressBar({ value, max = 100, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      {label ? <div className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)", marginBottom: "var(--nova-space-1)" }}>{label}</div> : null}
      <div className="nova-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className="nova-progress__fill" style={{ inlineSize: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ icon = "◇", title, description }) {
  return (
    <div className="nova-empty-state">
      <div aria-hidden="true" style={{ fontSize: 32 }}>
        {icon}
      </div>
      <strong style={{ color: "var(--nova-color-text-secondary)" }}>{title}</strong>
      {description ? <p className="nova-text-sm">{description}</p> : null}
    </div>
  );
}

export function OfflineBanner({ lastUpdatedLabel }) {
  return (
    <div className="nova-banner" data-tone="warning" role="status">
      <span>You&apos;re offline. Showing the last data from {lastUpdatedLabel || "an earlier session"}.</span>
    </div>
  );
}

export function ReconnectBanner() {
  return (
    <div className="nova-banner" data-tone="success" role="status">
      <span>Back online — refreshing…</span>
    </div>
  );
}
