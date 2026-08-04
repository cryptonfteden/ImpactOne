import { useCallback, useEffect, useState } from "react";
import { betaApi } from "../services/api";
import { trackEvent } from "../utils/analytics";

// Phase X4 — Beta Identity Flow. A first-time beta user must reach every
// protected feature with zero manual steps: an invite code arriving as a
// URL query param (?invite=CODE) resolves automatically, a previously
// resolved identity is restored and re-validated via whoami on every
// mount, and every failure mode below is translated into one of a small,
// closed set of friendly states — the raw errorCode/message never reaches
// the UI. "Skipped" (no code, no stored identity) is a legitimate resting
// state, not an error: this whole mechanism stays fully backward
// compatible with a non-beta session (see BetaInviteGate.jsx).
const BETA_USER_ID_STORAGE_KEY = "impactone-beta-user-id";
const BETA_USER_LABEL_STORAGE_KEY = "impactone-beta-user-label";

export const IDENTITY_STATUS = {
  CHECKING: "CHECKING",
  READY: "READY",
  NEEDS_CODE: "NEEDS_CODE",
  INVALID: "INVALID",
  EXPIRED: "EXPIRED",
  RECOVERING: "RECOVERING",
};

const FRIENDLY_MESSAGE = {
  INVALID_CODE: "That invite code wasn't recognized. Double-check it and try again.",
  EXPIRED_CODE: "That invite code has expired. Ask the founder for a new one.",
  MISSING_CODE: "Enter an invite code to continue.",
  NO_IDENTITY: "Your session couldn't be found. Enter your invite code again to continue.",
};

function readStoredIdentity() {
  try {
    const betaUserId = window.localStorage.getItem(BETA_USER_ID_STORAGE_KEY);
    const label = window.localStorage.getItem(BETA_USER_LABEL_STORAGE_KEY) || "";
    return betaUserId ? { betaUserId, label } : null;
  } catch {
    return null;
  }
}

function persistIdentity(identity) {
  try {
    window.localStorage.setItem(BETA_USER_ID_STORAGE_KEY, identity.betaUserId);
    window.localStorage.setItem(BETA_USER_LABEL_STORAGE_KEY, identity.label || "");
  } catch {
    // best-effort only
  }
}

function clearStoredIdentity() {
  try {
    window.localStorage.removeItem(BETA_USER_ID_STORAGE_KEY);
    window.localStorage.removeItem(BETA_USER_LABEL_STORAGE_KEY);
  } catch {
    // best-effort only
  }
}

function inviteCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("invite");
  } catch {
    return null;
  }
}

export function useBetaIdentity() {
  const [status, setStatus] = useState(IDENTITY_STATUS.CHECKING);
  const [identity, setIdentity] = useState(null);
  const [message, setMessage] = useState("");

  const resolveCode = useCallback(async (code) => {
    setStatus(IDENTITY_STATUS.RECOVERING);
    setMessage("");
    try {
      const result = await betaApi.resolveInviteCode(code);
      const resolved = { betaUserId: result.betaUserId, label: result.label || "" };
      persistIdentity(resolved);
      setIdentity(resolved);
      setStatus(IDENTITY_STATUS.READY);
      trackEvent("invite_accepted");
      trackEvent("login");
      return true;
    } catch (error) {
      const friendly = FRIENDLY_MESSAGE[error?.errorCode] || "Couldn't verify that code right now. Please try again.";
      setMessage(friendly);
      setStatus(error?.errorCode === "EXPIRED_CODE" ? IDENTITY_STATUS.EXPIRED : IDENTITY_STATUS.INVALID);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    trackEvent("logout");
    clearStoredIdentity();
    setIdentity(null);
    setMessage("");
    setStatus(IDENTITY_STATUS.NEEDS_CODE);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const urlCode = inviteCodeFromUrl();
      if (urlCode) {
        const ok = await resolveCode(urlCode);
        if (ok && !cancelled) {
          try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("invite");
            window.history.replaceState({}, "", cleanUrl.toString());
          } catch {
            // best-effort only
          }
        }
        return;
      }

      const stored = readStoredIdentity();
      if (!stored) {
        if (!cancelled) setStatus(IDENTITY_STATUS.NEEDS_CODE);
        return;
      }

      try {
        const confirmed = await betaApi.whoami();
        if (cancelled) return;
        if (!confirmed) {
          clearStoredIdentity();
          setMessage(FRIENDLY_MESSAGE.NO_IDENTITY);
          setStatus(IDENTITY_STATUS.INVALID);
          return;
        }
        setIdentity({ betaUserId: confirmed.betaUserId, label: confirmed.label || "" });
        setStatus(IDENTITY_STATUS.READY);
        trackEvent("login");
      } catch {
        // Network/server failure restoring a session is never treated as
        // "your identity is invalid" — that would be a fabricated
        // diagnosis. Trust the stored identity and let the next real
        // request surface the problem honestly.
        if (!cancelled) {
          setIdentity(stored);
          setStatus(IDENTITY_STATUS.READY);
        }
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, identity, message, resolveCode, logout };
}

export { BETA_USER_ID_STORAGE_KEY, BETA_USER_LABEL_STORAGE_KEY };
