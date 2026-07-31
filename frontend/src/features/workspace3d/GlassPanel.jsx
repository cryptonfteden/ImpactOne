// Phase IMPACTONE-3D-WORKSPACE-001 — the glassmorphism floating panel
// every workspace module's real, existing screen renders inside once
// focused. Plain CSS (backdrop-filter blur + translucent gradient +
// soft box-shadow) — no 3D dependency, no new business logic, just the
// presentation shell the mission asks every "card"/panel to have.
export default function GlassPanel({ title, onClose, children }) {
  return (
    <div className="workspace3d-glass-panel" role="region" aria-label={title}>
      <div className="workspace3d-glass-panel__header">
        <span className="workspace3d-glass-panel__title">{title}</span>
        <button type="button" className="workspace3d-glass-panel__close" onClick={onClose} aria-label={`Close ${title}`}>
          ×
        </button>
      </div>
      <div className="workspace3d-glass-panel__body">{children}</div>
    </div>
  );
}
