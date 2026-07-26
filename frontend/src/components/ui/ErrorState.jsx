import { memo } from "react";

/**
 * Phase X6 — Part 3, Investor-Friendly Error Experience. Backward
 * compatible: every existing caller that only passes `message` renders
 * exactly as before (a single subtle line) — this is additive, same
 * precedent as EmptyState.jsx's own title/actionLabel extension.
 *
 * The four richer props answer exactly what the mission asks every
 * runtime error to answer: `reason` (why), `canContinue` (is the rest of
 * the app still usable — defaults true, since almost every error in this
 * app is scoped to one screen/widget, not the whole session), and
 * `onRetry`/`retryLabel` (can they retry, and how). `message` itself is
 * always the "what happened," in plain language — callers are
 * responsible for never passing a raw caught-error string here (see
 * PRIVATE_BETA_POLISH.md).
 */
function ErrorState({ message = "Something went wrong.", reason, canContinue = true, onRetry, retryLabel = "Try again" }) {
  if (!reason && !onRetry && canContinue) {
    return <p className="company-description negative">{message}</p>;
  }

  return (
    <div className="error-state">
      <p className="company-description negative">{message}</p>
      {reason ? <p className="company-description subtle">{reason}</p> : null}
      {!canContinue ? (
        <p className="company-description subtle negative">The rest of this screen may not work correctly until this is resolved.</p>
      ) : null}
      {onRetry ? (
        <button type="button" className="ghost-button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export default memo(ErrorState);
