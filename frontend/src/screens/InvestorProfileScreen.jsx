import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, LoadingSpinner } from "../components/ui";
import { investorProfileApi } from "../services/api";
import CompoundInterestSimulator from "../components/profile/CompoundInterestSimulator";
import { logError } from "../utils/errorHandling";

/**
 * Sprint 20, Part 2 — the AI Investment Profile. Used two ways: as the
 * onboarding "reveal" (profile/investmentProfile injected as props,
 * onGetStarted provided) and as a persistent, revisitable "My Profile"
 * screen registered in screenMap (self-fetches both, no onGetStarted).
 */
export default function InvestorProfileScreen({ profile: injectedProfile, investmentProfile: injectedInvestmentProfile, onGetStarted }) {
  const [profile, setProfile] = useState(injectedProfile || null);
  const [investmentProfile, setInvestmentProfile] = useState(injectedInvestmentProfile || null);
  const [isLoading, setIsLoading] = useState(!injectedProfile);
  const [error, setError] = useState("");

  useEffect(() => {
    if (injectedProfile && injectedInvestmentProfile) {
      return;
    }

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [profileData, investmentProfileData] = await Promise.all([
          injectedProfile ? Promise.resolve(injectedProfile) : investorProfileApi.get(),
          investorProfileApi.getInvestmentProfile(),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setInvestmentProfile(investmentProfileData);
          setError("");
        }
      } catch (loadError) {
        logError("investor profile load failed", loadError);
        if (!cancelled) {
          setError("We couldn't load your investment profile right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [injectedProfile, injectedInvestmentProfile]);

  if (isLoading) {
    return (
      <div className="screen-page">
        <LoadingSpinner label="Building your investment profile" />
      </div>
    );
  }

  if (error || !investmentProfile) {
    return (
      <div className="screen-page">
        <p className="company-description negative">{error || "No investment profile available yet."}</p>
      </div>
    );
  }

  const { suggestedAllocation, diversificationExplanation, expectedVolatility, suggestedAnnualReturnPct, educationalExplanation, assumptionsDisclosure } = investmentProfile;

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Your AI Investment Profile</p>
          <h1>{onGetStarted ? "Here's what we built for you" : "Your Investment Profile"}</h1>
          <p className="subtext">{assumptionsDisclosure}</p>
        </div>
      </section>

      <SectionCard title="Suggested portfolio" subtitle="A starting point, not a mandate" icon="◧" className="screen-card">
        <div className="allocation-bar">
          <div className="allocation-bar__segment allocation-bar__segment--stocks" style={{ width: `${suggestedAllocation.stocks}%` }} />
          <div className="allocation-bar__segment allocation-bar__segment--bonds" style={{ width: `${suggestedAllocation.bonds}%` }} />
          <div className="allocation-bar__segment allocation-bar__segment--cash" style={{ width: `${suggestedAllocation.cash}%` }} />
        </div>
        <div className="allocation-legend">
          <span>Stocks {suggestedAllocation.stocks}%</span>
          <span>Bonds {suggestedAllocation.bonds}%</span>
          <span>Cash {suggestedAllocation.cash}%</span>
        </div>
        <p className="company-description">{diversificationExplanation}</p>
      </SectionCard>

      <SectionCard title="Expected volatility" subtitle="How much this could swing in a typical year" icon="◔" className="screen-card">
        <p className="company-description">
          {expectedVolatility.lowPct}%-{expectedVolatility.highPct}% — {expectedVolatility.label}
        </p>
        <p className="company-description subtle">An illustration based on long-run historical asset-class averages, not a forecast.</p>
      </SectionCard>

      <SectionCard title="Compound-interest simulator" subtitle="Adjust the assumptions yourself" icon="◈" className="screen-card">
        <CompoundInterestSimulator
          monthlyInvestmentAmount={profile?.monthlyInvestmentAmount}
          suggestedAnnualReturnPct={suggestedAnnualReturnPct}
          country={profile?.country}
        />
      </SectionCard>

      <SectionCard title="What this means" subtitle="Educational explanation" icon="◍" className="screen-card">
        <p className="company-description">{educationalExplanation}</p>
      </SectionCard>

      {onGetStarted ? (
        <Button type="button" className="primary-action onboarding-continue-button" onClick={onGetStarted}>
          Get started
        </Button>
      ) : null}
    </div>
  );
}
