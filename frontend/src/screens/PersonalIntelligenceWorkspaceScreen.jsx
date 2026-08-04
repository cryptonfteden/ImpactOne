import { useEffect, useState } from "react";
import { Page, Container, Section, Stack } from "../components/layout";
import { Card, Badge, MetricArc, EmptyState, Skeleton, HeroCard, DemoModeBanner, IntelligenceCard } from "../components/nova";
import { useI18n } from "../i18n/I18nProvider";
import { personalizationApi, intelligenceApi, claimsApi } from "../services/api";
import { withRequestCache } from "../services/requestCache";
import { usePlatformContext } from "../context/PlatformContext";
import useInvestorProfile from "../hooks/useInvestorProfile";
import useWatchlist from "../hooks/useWatchlist";
import { prioritizeClaims, rankByScore, buildClaimReasoningSections } from "../services/intelligenceEngine";
import { logError } from "../utils/errorHandling";
import { fallbackPersonalization, fallbackWatchlistRankings, fallbackClaims } from "./personalIntelligence/personalIntelligenceMockData";

// Phase PERSONAL-INTELLIGENCE-001 — transforms ImpactOne from a market
// platform into a personalized one: given the user's own real Investor
// Profile (risk tolerance, investment horizon) and real personalization
// snapshot (preferred sectors, derived from real held positions), this
// Workspace answers "why does this matter to YOU specifically," not just
// "what is happening." Built entirely from the existing Design System
// (HeroCard, IntelligenceCard, MetricArc, DemoModeBanner, EmptyState),
// the shared intelligenceEngine.js (prioritizeClaims, rankByScore,
// buildClaimReasoningSections), and PlatformContext/requestCache — no
// new component, no duplicated business logic. The real Investor Profile
// itself is never fetched or gated here a second time — this screen
// reuses the same `useInvestorProfile` hook every other profile-aware
// part of the app already shares, rather than reimplementing its
// has-a-profile detection.

const MAX_PERSONAL_ITEMS = 5;
const ACTIVE_CLAIMS_CACHE_KEY = "claims:active:200";

const SECTION_LABELS = {
  personalization: "Your Preferences",
  watchlistPriorities: "Watchlist Priorities",
  claims: "Personalized Opportunities & Risks",
};

// A real Claim is personally relevant when it genuinely touches a
// sector the user's own real held positions favor, or a symbol already
// on the user's own real watchlist — never a fabricated relevance score.
function isPersonallyRelevant(claim, preferredSectorNames, watchlist) {
  const touchesPreferredSector = claim.sectors?.some((sector) => preferredSectorNames.includes(sector));
  const touchesWatchlist = claim.symbols?.some((symbol) => watchlist.includes(symbol));
  return Boolean(touchesPreferredSector || touchesWatchlist);
}

function describeRiskProfile(profile) {
  const parts = [];
  if (profile?.riskTolerance) parts.push(`${profile.riskTolerance.toLowerCase()} risk tolerance`);
  if (profile?.investmentHorizon) parts.push(`${profile.investmentHorizon.replace("_", " ").toLowerCase()} horizon`);
  return parts.length ? parts.join(", ") : "no risk profile recorded yet";
}

export default function PersonalIntelligenceWorkspaceScreen() {
  const { dir } = useI18n();
  const { profile, hasProfile, isLoading: profileIsLoading } = useInvestorProfile();
  const { watchlist } = useWatchlist();
  const { selectClaim } = usePlatformContext();

  const [isLoading, setIsLoading] = useState(true);
  const [personalization, setPersonalization] = useState(fallbackPersonalization);
  const [watchlistRankings, setWatchlistRankings] = useState(fallbackWatchlistRankings);
  const [claims, setClaims] = useState(fallbackClaims);
  const [liveSections, setLiveSections] = useState({ personalization: true, watchlistPriorities: true, claims: true });

  useEffect(() => {
    let cancelled = false;

    if (profileIsLoading) return undefined;
    if (!hasProfile) {
      setIsLoading(false);
      return undefined;
    }

    async function load() {
      setIsLoading(true);
      const fetches = [
        withRequestCache("personalization:profile", () => personalizationApi.get()),
        withRequestCache(ACTIVE_CLAIMS_CACHE_KEY, () => claimsApi.listActive({ limit: 200 })),
      ];
      if (watchlist.length) {
        fetches.push(withRequestCache(`intelligence:watchlist-priority:${watchlist.join(",")}`, () => intelligenceApi.watchlistPriority({ watchlist })));
      }

      const [personalizationResult, claimsResult, watchlistResult] = await Promise.allSettled(fetches);
      if (cancelled) return;

      const nextLive = {};
      const connected = [];
      const unavailable = [];

      if (personalizationResult.status === "fulfilled") {
        setPersonalization(personalizationResult.value);
        nextLive.personalization = true;
        connected.push("Personalization");
      } else {
        logError("personal intelligence personalization load failed", personalizationResult.reason);
        setPersonalization(fallbackPersonalization);
        nextLive.personalization = false;
        unavailable.push("Personalization");
      }

      if (claimsResult.status === "fulfilled") {
        setClaims(claimsResult.value?.claims || []);
        nextLive.claims = true;
        connected.push("Claims");
      } else {
        logError("personal intelligence claims load failed", claimsResult.reason);
        setClaims(fallbackClaims);
        nextLive.claims = false;
        unavailable.push("Claims");
      }

      if (!watchlist.length) {
        setWatchlistRankings([]);
        nextLive.watchlistPriorities = true;
      } else if (watchlistResult?.status === "fulfilled") {
        setWatchlistRankings(watchlistResult.value?.watchlistRankings || []);
        nextLive.watchlistPriorities = true;
        connected.push("Watchlist Priority");
      } else {
        logError("personal intelligence watchlist priority load failed", watchlistResult?.reason);
        setWatchlistRankings(fallbackWatchlistRankings);
        nextLive.watchlistPriorities = false;
        unavailable.push("Watchlist Priority");
      }

      setLiveSections(nextLive);
      setIsLoading(false);
      console.info("[PersonalIntelligence] service status", { connected, unavailable: [...new Set(unavailable)] });
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileIsLoading, hasProfile, watchlist.join(",")]);

  const preferredSectorNames = (personalization?.preferredSectors || []).map((entry) => entry.key);
  const relevantClaims = claims.filter((claim) => isPersonallyRelevant(claim, preferredSectorNames, watchlist));
  const personalizedOpportunities = prioritizeClaims(relevantClaims.filter((claim) => claim.expectedDirection === "BULLISH")).slice(0, MAX_PERSONAL_ITEMS);
  const personalizedRisks = prioritizeClaims(relevantClaims.filter((claim) => claim.expectedDirection === "BEARISH")).slice(0, MAX_PERSONAL_ITEMS);
  const heroClaim = prioritizeClaims([...personalizedOpportunities, ...personalizedRisks])[0] || null;
  const rankedWatchlistPriorities = rankByScore(watchlistRankings, "overallAiScore");

  useEffect(() => {
    if (!isLoading && heroClaim) {
      selectClaim(heroClaim);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, heroClaim?.claimId]);

  if (profileIsLoading || isLoading) {
    return (
      <Page className="screen-page personal-intelligence-workspace-screen" dir={dir}>
        <Container>
          <Stack gap={6} aria-busy="true" aria-label="Assembling your personal intelligence">
            <Skeleton height={180} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </Stack>
        </Container>
      </Page>
    );
  }

  return (
    <Page className="screen-page personal-intelligence-workspace-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-4)" }}>
          <span className="nova-heading-eyebrow">Personal Intelligence Workspace</span>
          <h1 className="nova-heading-h1">Why this matters to you</h1>
          <p className="nova-heading-subtext">Personalized against your own real risk profile, preferred sectors, and watchlist — never a generic market view.</p>
        </Stack>

        {!hasProfile ? (
          <Section aria-label="Personalized Opportunities & Risks" className="mc-tier-1">
            <Card>
              <EmptyState icon="◇" title="Complete your investor profile to unlock personal intelligence." />
            </Card>
          </Section>
        ) : (
          <>
            <DemoModeBanner liveSections={liveSections} sectionLabels={SECTION_LABELS} />

            {/* Tier 1 — the single most personally relevant real Claim */}
            <Section aria-label="Personalized Opportunities & Risks" className="mc-tier-1">
              {heroClaim ? (
                <HeroCard eyebrow="Why This Matters to You">
                  <Stack direction="horizontal" gap={6} align="center" wrap>
                    <MetricArc score={heroClaim.confidence} metric="confidence" size="lg" showValue />
                    <Stack gap={2} style={{ flex: 1, minInlineSize: 240 }}>
                      <h2 className="nova-heading-h1">{(heroClaim.symbols || []).join(", ")}</h2>
                      <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
                        As an investor with {describeRiskProfile(profile)}, this is the real Claim most relevant to your own preferences right now.
                      </p>
                      <Badge tone={heroClaim.expectedDirection === "BULLISH" ? "positive" : "negative"}>{heroClaim.expectedDirection}</Badge>
                    </Stack>
                  </Stack>
                </HeroCard>
              ) : (
                <Card>
                  <EmptyState icon="◇" title="No active Claim currently touches your preferred sectors or watchlist." />
                </Card>
              )}
            </Section>

            {/* Tier 2 — your real profile + preferences */}
            <Section aria-label="Your Preferences" className="mc-tier-2">
              <Card title="Risk Profile & Investment Horizon">
                <Stack direction="horizontal" gap={2} wrap>
                  {profile?.riskTolerance ? <Badge tone="neutral">Risk: {profile.riskTolerance}</Badge> : null}
                  {profile?.investmentHorizon ? <Badge tone="neutral">Horizon: {profile.investmentHorizon}</Badge> : null}
                  {!profile?.riskTolerance && !profile?.investmentHorizon ? <EmptyState icon="◇" title="No risk profile recorded yet." /> : null}
                </Stack>
              </Card>

              <Card title="Preferred Sectors">
                {preferredSectorNames.length ? (
                  <Stack direction="horizontal" gap={2} wrap>
                    {preferredSectorNames.map((sector) => (
                      <Badge key={sector} tone="neutral">{sector}</Badge>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState icon="◇" title="No preferred sectors yet — open a position to build a real preference signal." />
                )}
              </Card>
            </Section>

            {/* Tier 3 — personalized opportunities/risks + watchlist priorities */}
            <Section aria-label="Context" className="mc-tier-3">
              <Card title="Personalized Opportunities">
                {personalizedOpportunities.length ? (
                  <Stack gap={4}>
                    {personalizedOpportunities.map((claim) => (
                      <IntelligenceCard
                        key={claim.claimId}
                        eyebrow={(claim.symbols || []).join(", ")}
                        claim={claim}
                        sections={[
                          { label: "Why this matters to you", content: `Touches ${preferredSectorNames.filter((s) => claim.sectors?.includes(s)).join(", ") || "your watchlist"} — a sector or symbol you already favor.` },
                          ...buildClaimReasoningSections(claim),
                        ]}
                      />
                    ))}
                  </Stack>
                ) : (
                  <EmptyState icon="◇" title="No personalized opportunities right now." />
                )}
              </Card>

              <Card title="Personalized Risks">
                {personalizedRisks.length ? (
                  <Stack gap={4}>
                    {personalizedRisks.map((claim) => (
                      <IntelligenceCard
                        key={claim.claimId}
                        eyebrow={(claim.symbols || []).join(", ")}
                        claim={claim}
                        sections={[
                          { label: "Why this matters to you", content: `Touches ${preferredSectorNames.filter((s) => claim.sectors?.includes(s)).join(", ") || "your watchlist"} — a sector or symbol you already favor.` },
                          ...buildClaimReasoningSections(claim),
                        ]}
                      />
                    ))}
                  </Stack>
                ) : (
                  <EmptyState icon="◇" title="No personalized risks right now." />
                )}
              </Card>

              <Card title="Watchlist Priorities">
                {rankedWatchlistPriorities.length ? (
                  <ul className="stack-list">
                    {rankedWatchlistPriorities.map((ranking) => (
                      <li key={ranking.symbol}>
                        <Stack direction="horizontal" gap={2} align="center" wrap>
                          <MetricArc score={ranking.overallAiScore} metric="attention" size="sm" showValue />
                          <strong className="nova-text-sm">{ranking.symbol}</strong>
                        </Stack>
                        <p className="nova-text-xs" style={{ color: "var(--nova-color-text-secondary)" }}>
                          {ranking.explanation}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="◇" title="Add a ticker to your watchlist to see personalized priorities here." />
                )}
              </Card>
            </Section>
          </>
        )}
      </Container>
    </Page>
  );
}
