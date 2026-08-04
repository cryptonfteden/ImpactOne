import { useCallback, useEffect, useState } from "react";
import { investorProfileApi } from "../services/api";
import { trackEvent } from "../utils/analytics";

const ONBOARDED_KEY = "impactone-onboarded";
const PROFILE_EVENT = "impactone:investor-profile-updated";

function readOnboardedFlag() {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(ONBOARDED_KEY) === "true";
}

function writeOnboardedFlag(value) {
  if (typeof window === "undefined") {
    return;
  }
  if (value) {
    localStorage.setItem(ONBOARDED_KEY, "true");
  } else {
    localStorage.removeItem(ONBOARDED_KEY);
  }
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
  });
}

/**
 * Sprint 20 — the InvestorProfile singleton lives server-side (so the
 * backend's feed-personalization and home-summary logic can read it
 * without depending on the client). The localStorage flag here is purely a
 * fast, instant gate signal for returning users (avoids a flash of the
 * onboarding flow on every reload) — it is always verified against, and
 * self-corrected by, a real fetch, never treated as the source of truth.
 */
export default function useInvestorProfile() {
  const [profile, setProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(() => (readOnboardedFlag() ? true : null));
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Sprint 35 Priority 5 — "returning_user" telemetry. Captured before
    // the fetch so it reflects whether *this session started* already
    // onboarded (a real returning user), not whether onboarding just
    // completed moments ago in the same session (createProfile sets the
    // flag directly and never calls refresh).
    const wasAlreadyOnboarded = readOnboardedFlag();
    try {
      const found = await investorProfileApi.get();
      setProfile(found);
      setHasProfile(true);
      writeOnboardedFlag(true);
      if (wasAlreadyOnboarded) {
        trackEvent("returning_user");
      }
    } catch (error) {
      // Sprint 34 — a 404 means the server genuinely has no profile (a
      // real first-time account) and should route to onboarding. Any
      // other failure (offline, timeout, 5xx — error.status is undefined
      // for a network-level fetch failure) means we simply couldn't ask,
      // which is not the same thing: a real returning user's profile
      // still exists, we just couldn't confirm it right now. Wiping the
      // onboarded flag in that case would wrongly bounce them back into
      // onboarding every time their connection hiccups.
      if (error?.status === 404) {
        setProfile(null);
        setHasProfile(false);
        writeOnboardedFlag(false);
      } else if (!readOnboardedFlag()) {
        // No prior successful state to fall back to either — honestly
        // unknown, not "no profile."
        setHasProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProfile = useCallback(async (data) => {
    const created = await investorProfileApi.create(data);
    setProfile(created);
    setHasProfile(true);
    writeOnboardedFlag(true);
    return created;
  }, []);

  const updateProfile = useCallback(async (data) => {
    const updated = await investorProfileApi.update(data);
    setProfile(updated);
    return updated;
  }, []);

  return { profile, hasProfile, isLoading, createProfile, updateProfile, refresh };
}
