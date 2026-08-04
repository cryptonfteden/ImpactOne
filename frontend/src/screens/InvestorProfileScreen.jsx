import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, LoadingSpinner } from "../components/ui";
import { investorProfileApi, personalProgressApi } from "../services/api";
import CompoundInterestSimulator from "../components/profile/CompoundInterestSimulator";
import { logError } from "../utils/errorHandling";

// Sprint 31 Priority 2 — Personal Progress. Educational only: a trend
// label and the real two numbers it was derived from, never a score,
// point total, streak, or badge.
function PersonalProgress() {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let cancelled = false;
    personalProgressApi
      .get()
      .then((data) => {
        if (!cancelled) setProgress(data);
      })
      .catch((loadError) => logError("personal progress load failed", loadError));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!progress) return null;

  const { understanding, readingHabits, portfolioDiscipline } = progress;

  return (
    <SectionCard title="Your progress" subtitle="How your understanding, reading habits, and portfolio discipline have evolved" icon="◑" className="screen-card">
      <div className="explanation-section">
        <p className="explanation-section__title">Understanding</p>
        {understanding.hasEnoughData ? (
          <p className="company-description subtle">
            "Don't understand" feedback went from {understanding.earlierDontUnderstandRatePct}% to {understanding.recentDontUnderstandRatePct}% of your feedback — trend: {understanding.trend}.
          </p>
        ) : (
          <p className="company-description subtle">{understanding.message}</p>
        )}
      </div>
      <div className="explanation-section">
        <p className="explanation-section__title">Reading habits</p>
        {readingHabits.hasEnoughData ? (
          <p className="company-description subtle">
            {readingHabits.earlierViewCount} views earlier vs. {readingHabits.recentViewCount} more recently — you're {readingHabits.trend}.
          </p>
        ) : (
          <p className="company-description subtle">{readingHabits.message}</p>
        )}
      </div>
      <div className="explanation-section">
        <p className="explanation-section__title">Portfolio discipline</p>
        {portfolioDiscipline.hasEnoughData ? (
          <p className="company-description subtle">
            Cash reserve went from {portfolioDiscipline.earlierCashRatioPct}% to {portfolioDiscipline.recentCashRatioPct}% of your portfolio — trend: {portfolioDiscipline.trend}.
          </p>
        ) : (
          <p className="company-description subtle">{portfolioDiscipline.message}</p>
        )}
      </div>
    </SectionCard>
  );
}

// Sprint 33 Priority 1 — mobile information architecture. These 7 screens
// no longer have their own top-level nav slot on mobile; they stay fully
// reachable from here instead of being deleted. Desktop's Sidebar keeps
// its own richer, always-visible list independently of this section.
// Sprint 40 — "Dashboard" removed: it duplicated Home's content (see
// Sidebar.jsx's own comment and SPRINT_40_REPORT.md).
// Phase RC1-BLOCKERS-001 — this list pointed at "Watchlist" (the legacy,
// unreachable-from-Sidebar screen Sidebar.jsx's own comment already
// deprecated in favor of "Watchlist Folders"), giving mobile users a
// second, dead-end path to a screen desktop nav had already retired.
// Now points at the same canonical destination Sidebar.jsx uses.
const MORE_DESTINATIONS = ["Themes", "AI Analysis", "Alerts", "Global Intelligence", "Watchlist Folders", "Settings"];

function MoreLinks({ onNavigate }) {
  const destinations = import.meta.env.VITE_DEV_CONSOLE === "true" ? [...MORE_DESTINATIONS, "Intelligence Console"] : MORE_DESTINATIONS;

  return (
    <SectionCard title="More" subtitle="Everything else, one tap away" icon="◫" className="screen-card">
      <div className="more-links-grid">
        {destinations.map((destination) => (
          <Button key={destination} type="button" className="more-links-grid__item" onClick={() => onNavigate(destination)}>
            {destination}
          </Button>
        ))}
      </div>
    </SectionCard>
  );
}

/**
 * Sprint 20, Part 2 — the AI Investment Profile. Used two ways: as the
 * onboarding "reveal" (profile/investmentProfile injected as props,
 * onGetStarted provided) and as a persistent, revisitable "My Profile"
 * screen registered in screenMap (self-fetches both, no onGetStarted).
 */
export default function InvestorProfileScreen({ profile: injectedProfile, investmentProfile: injectedInvestmentProfile, onGetStarted, onNavigate }) {
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

      {!onGetStarted && onNavigate ? <MoreLinks onNavigate={onNavigate} /> : null}

      {!onGetStarted ? <PersonalProgress /> : null}

      {onGetStarted ? (
        <Button type="button" className="primary-action onboarding-continue-button" onClick={onGetStarted}>
          Get started
        </Button>
      ) : null}
    </div>
  );
}
