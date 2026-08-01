import { useEffect, useRef } from "react";

// Phase IMPACTONE-3D-WORKSPACE-001 — the glassmorphism floating panel
// every workspace module's real, existing screen renders inside once
// focused. Plain CSS (backdrop-filter blur + translucent gradient +
// soft box-shadow) — no 3D dependency, no new business logic, just the
// presentation shell the mission asks every "card"/panel to have.
//
// Phase APPLE-QUALITY-001 — two real, standard panel/dialog
// accessibility behaviors this component was missing entirely:
// 1. Focus moves to the panel's own close button the moment it opens —
//    previously, opening a panel left keyboard focus wherever it was
//    before (usually the 3D node just clicked), so a keyboard/screen-
//    reader user had no indication the panel had appeared at all.
// 2. Escape closes the panel — the standard, expected keyboard
//    shortcut for any dismissible overlay, previously unimplemented.
export default function GlassPanel({ title, onClose, children }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="workspace3d-glass-panel" role="region" aria-label={title}>
      <div className="workspace3d-glass-panel__header">
        <span className="workspace3d-glass-panel__title">{title}</span>
        <button ref={closeButtonRef} type="button" className="workspace3d-glass-panel__close" onClick={onClose} aria-label={`Close ${title}`}>
          ×
        </button>
      </div>
      <div className="workspace3d-glass-panel__body">{children}</div>
    </div>
  );
}
