import { useState } from "react";
import useInvestorProfile from "./hooks/useInvestorProfile";
import MainLayout from "./layout/MainLayout";
import OnboardingFlow from "./screens/onboarding/OnboardingFlow";

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

  if (isLoading || hasProfile === null) {
    return <div className="onboarding-shell" aria-busy="true" />;
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
