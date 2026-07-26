import { useEffect, useState } from "react";

const SEEN_STORAGE_KEY = "impactone-beta-invite-seen";

/**
 * Phase H2 — Beta User Isolation, extended in Phase X4 (Beta Identity
 * Flow). A single, optional, one-time screen shown before the existing
 * onboarding wizard (never inserted into its fixed 7-step flow, to avoid
 * touching its step-index logic). Skippable: a user with no code (or
 * outside the beta) proceeds exactly as before this phase, with no
 * betaUserId ever set — full backward compatibility.
 *
 * X4: identity resolution itself now lives in useBetaIdentity — this
 * component is a thin, presentational shell over it, so the same
 * resolve/error logic drives both first-time entry and recovery from an
 * expired/invalid stored identity. `message` is always a pre-translated,
 * friendly string — this component never renders a raw errorCode or
 * server error message.
 */
export default function BetaInviteGate({ onDone, resolveCode, message, isSubmitting, title, description }) {
  const [code, setCode] = useState("");

  useEffect(() => {
    setCode("");
  }, [message]);

  function skip() {
    try {
      window.localStorage.setItem(SEEN_STORAGE_KEY, "1");
    } catch {
      // best-effort only
    }
    onDone();
  }

  async function submit() {
    const trimmed = code.trim();
    if (!trimmed) {
      skip();
      return;
    }
    const ok = await resolveCode(trimmed);
    if (ok) {
      try {
        window.localStorage.setItem(SEEN_STORAGE_KEY, "1");
      } catch {
        // best-effort only
      }
      onDone();
    }
  }

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card onboarding-card--centered">
        <p className="eyebrow">Private beta</p>
        <h1 className="onboarding-title">{title || "Have an invite code?"}</h1>
        <p className="company-description subtle">
          {description || "If the founder gave you one, enter it below so your portfolio and recommendations stay yours alone. Not required — you can skip this."}
        </p>
        <div className="onboarding-numeric-step">
          <input
            type="text"
            className="onboarding-numeric-input"
            placeholder="Invite code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            autoFocus
          />
          {message ? <p className="onboarding-error">{message}</p> : null}
          <button type="button" className="onboarding-continue-button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Checking..." : "Continue"}
          </button>
        </div>
        <div className="onboarding-skip-row">
          <button type="button" className="onboarding-skip-button" onClick={skip}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export { SEEN_STORAGE_KEY };
