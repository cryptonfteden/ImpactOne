import { memo } from "react";

/**
 * Phase E2 — Beta Trust Improvements. Backward compatible: every existing
 * caller that only passes `message` renders exactly as before (a single
 * subtle line). `title`/`icon`/`actionLabel`+`onAction` are additive,
 * opt-in props for the small number of empty states that benefit from a
 * more considered treatment (e.g. Recommendations, a first-time user's
 * most likely early empty screen) — no behavior change for callers that
 * don't pass them.
 */
// Phase X5 — Part 7, Private Beta Polish. "No data available." was a cold
// dead end with no next step. Callers with something more specific to say
// still pass their own `message` (most do) — this default only fires for
// the rare caller that doesn't.
function EmptyState({ message = "Nothing here yet — check back once there's real data to show.", title, icon, actionLabel, onAction, actionDisabled = false }) {
  if (!title && !icon && !actionLabel) {
    return <p className="company-description subtle">{message}</p>;
  }

  return (
    <div className="empty-state">
      {icon ? <span className="empty-state__icon" aria-hidden="true">{icon}</span> : null}
      {title ? <p className="empty-state__title">{title}</p> : null}
      <p className="empty-state__message">{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="ghost-button empty-state__action" onClick={onAction} disabled={actionDisabled}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default memo(EmptyState);
