import { useState } from "react";
import useInvestorProfile from "./hooks/useInvestorProfile";
import { useBetaIdentity, IDENTITY_STATUS } from "./hooks/useBetaIdentity";
import MainLayout from "./layout/MainLayout";
import OnboardingFlow from "./screens/onboarding/OnboardingFlow";
import BetaInviteGate, { SEEN_STORAGE_KEY } from "./screens/onboarding/BetaInviteGate";
import { LoadingSpinner } from "./components/ui";

function hasSeenBetaInviteGate() {
  try {
    return Boolean(window.localStorage.getItem(SEEN_STORAGE_KEY));
  } catch {
    return true; // fail open — never block onboarding over a storage read error
  }
}

const RECOVERY_COPY = {
  [IDENTITY_STATUS.EXPIRED]: {
    title: "Your invite has expired",
    description: "Ask the founder for a new invite code to keep your portfolio and recommendations.",
  },
  [IDENTITY_STATUS.INVALID]: {
    title: "We couldn't find your session",
    description: "Enter your invite code again — nothing you've saved has been lost.",
  },
};

/**
 * Sprint 20 — the onboarding gate. Shown once, full-screen, before any
 * part of the existing app shell renders, based on whether an
 * InvestorProfile exists server-side. No "skip the whole flow" escape
 * hatch: only age is required, everything else is a fast tap-or-skip, so
 * the flow itself is fast enough not to need one.
 *
 * onboardingInProgress guards against a real race: useInvestorProfile's
 * hasProfile flips true the instant createProfile() resolves, which would
 * otherwise unmount OnboardingFlow (and its investment-profile "reveal")
 * before the user ever sees it. Once onboarding has started, this stays
 * true until the user explicitly taps "Get started" on the reveal.
 */
export default function AppRoot() {
  const { hasProfile, isLoading, createProfile } = useInvestorProfile();
  const [onboardingInProgress, setOnboardingInProgress] = useState(false);
  const [betaGateDone, setBetaGateDone] = useState(hasSeenBetaInviteGate);
  const identity = useBetaIdentity();

  // Phase X4 — Part 1. A stored/expired/invalid identity is resolved
  // (or recovered from) before anything else renders, so no protected
  // feature downstream ever has to handle a technical identity error
  // itself — by the time MainLayout mounts, identity is either READY or
  // the user has explicitly skipped the beta entirely.
  if (identity.status === IDENTITY_STATUS.CHECKING || identity.status === IDENTITY_STATUS.RECOVERING) {
    return (
      <div className="onboarding-shell boot-loading" aria-busy="true">
        <LoadingSpinner label="Loading ImpactOne" />
        <p className="boot-loading__title">ImpactOne</p>
      </div>
    );
  }

  if (identity.status === IDENTITY_STATUS.EXPIRED || identity.status === IDENTITY_STATUS.INVALID) {
    const copy = RECOVERY_COPY[identity.status];
    return (
      <BetaInviteGate
        onDone={() => setBetaGateDone(true)}
        resolveCode={identity.resolveCode}
        message={identity.message}
        isSubmitting={false}
        title={copy.title}
        description={copy.description}
      />
    );
  }

  if (isLoading || hasProfile === null) {
    // Phase E2 — a beta user's literal first pixel used to be an
    // unstyled blank div. Same brief moment, now branded rather than
    // silent — no new data dependency, purely presentational.
    return (
      <div className="onboarding-shell boot-loading" aria-busy="true">
        <LoadingSpinner label="Loading ImpactOne" />
        <p className="boot-loading__title">ImpactOne</p>
      </div>
    );
  }

  if (!hasProfile && !betaGateDone && identity.status === IDENTITY_STATUS.NEEDS_CODE) {
    return <BetaInviteGate onDone={() => setBetaGateDone(true)} resolveCode={identity.resolveCode} message={identity.message} isSubmitting={false} />;
  }

  if (!hasProfile || onboardingInProgress) {
    return (
      <OnboardingFlow
        onComplete={(data) => {
          setOnboardingInProgress(true);
          return createProfile(data);
        }}
        onFinish={() => setOnboardingInProgress(false)}
      />
    );
  }

  return <MainLayout />;
}
