import { useEffect, useState } from "react";

const STORAGE_KEY = "impactone_welcome_seen_v1";

/**
 * Phase E2 — Beta Trust Improvements. A lightweight, dismissible,
 * one-time overlay shown after onboarding completes, before a beta
 * user's first look at Home. Does not gate or delay any real content —
 * it renders on top of the already-loaded app shell and can be dismissed
 * immediately. Shown at most once per browser (localStorage flag); never
 * reappears after being dismissed. Purely presentational — no new data
 * source, no change to any screen's underlying logic.
 */
export default function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (e.g. private browsing) — skip the
      // overlay silently rather than risk breaking the app shell.
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Best-effort only — if it can't persist, the overlay simply
      // reappears next visit, which is a minor inconvenience, not a bug.
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-overlay-title">
      <div className="welcome-card">
        <p className="welcome-card__eyebrow">Welcome to the beta</p>
        <h2 id="welcome-overlay-title">A few things worth knowing before you dive in</h2>
        <ul className="welcome-card__list">
          <li>
            <span className="welcome-card__bullet" aria-hidden="true">→</span>
            <span>Recommendations appear when the engine finds a real opportunity — an empty list at first is normal, not broken.</span>
          </li>
          <li>
            <span className="welcome-card__bullet" aria-hidden="true">→</span>
            <span>Portfolio is simulated paper trading — no real money, no broker connection.</span>
          </li>
          <li>
            <span className="welcome-card__bullet" aria-hidden="true">→</span>
            <span>Everything here is advisory only — nothing acts on your behalf automatically.</span>
          </li>
        </ul>
        <div className="welcome-card__actions">
          <button type="button" className="primary-action" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
