import useInvestorProfile from "./hooks/useInvestorProfile";
import MainLayout from "./layout/MainLayout";
import OnboardingFlow from "./screens/onboarding/OnboardingFlow";

/**
 * Sprint 20 — the onboarding gate. Shown once, full-screen, before any
 * part of the existing app shell renders, based on whether an
 * InvestorProfile exists server-side. No "skip the whole flow" escape
 * hatch: only age is required, everything else is a fast tap-or-skip, so
 * the flow itself is fast enough not to need one.
 */
export default function AppRoot() {
  const { hasProfile, isLoading, createProfile } = useInvestorProfile();

  if (isLoading || hasProfile === null) {
    return <div className="onboarding-shell" aria-busy="true" />;
  }

  if (!hasProfile) {
    return <OnboardingFlow onComplete={createProfile} />;
  }

  return <MainLayout />;
}
