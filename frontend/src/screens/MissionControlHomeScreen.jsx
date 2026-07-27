import { useEffect, useMemo, useState } from "react";
import { Page, Container, Section, Grid, Stack } from "../components/layout";
import { Card, Badge, MetricArc, EmptyState, Skeleton, Button, HeroCard, DemoModeBanner, IntelligenceCard, AttentionLevelBadge } from "../components/nova";
import { useI18n } from "../i18n/I18nProvider";
import { morningBriefApi, claimsApi, portfolioEngineApi, marketSentimentApi, intelligenceApi } from "../services/api";
import { withRequestCache } from "../services/requestCache";
import { usePlatformContext } from "../context/PlatformContext";
import { logError } from "../utils/errorHandling";
import {
  todaysBrief as fallbackBrief,
  portfolioIntelligence as fallbackPortfolio,
  biggestRisk as fallbackRisk,
  bestOpportunity as fallbackOpportunity,
  claimsChanging as fallbackClaimsChanging,
  marketPulse as fallbackMarketPulse,
  liveIntelligenceCount as fallbackFeedCount,
} from "./missionControl/missionControlMockData";

// Phase MISSION-CONTROL-001 — the first production-quality implementation
// of IMPACTONE_DESIGN_BIBLE.md and MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md.
//
// Structure follows the masterplan's three tiers exactly:
//   Tier 1 — The Brief (hero + Today's Brief)
//   Tier 2 — Your Signals (Portfolio Intelligence, Biggest Risk, Best Opportunity)
//   Tier 3 — Context (Claims Changing, Market Pulse, Live Intelligence, Session Summary)
// Only three distinct visual/motion treatments exist across the whole
// screen — see components.css's `.mc-tier-1/2/3` rules — never a fourth,
// per-section-specific rule.
//
// Phase MISSION-CONTROL-002 — Confidence, Probability, and Attention are
// three independent metrics (see MetricArc.jsx) — every MetricArc
// instance below states its `metric` explicitly.
//
// Phase DESIGN-SYSTEM-001 — the hero card, Demo Mode banner, and
// Biggest Risk/Best Opportunity cards below are now the shared
// HeroCard/DemoModeBanner/IntelligenceCard components (extracted from
// this screen and PortfolioWorkspaceScreen.jsx's near-identical
// duplicates) — see DESIGN_SYSTEM.md. No visual change from this
// refactor.
//
// Phase LIVE-DATA-001 — this screen now fetches real data from six
// already-real, already-tested canonical services:
//   - Morning Brief    → morningBriefApi.getToday()
//   - Claims           → claimsApi.listActive() / listOvernightChanges() / listPortfolioRelevant()
//   - Attention Engine → attentionScore/attentionExplanation, already attached
//                        server-side to every Claim and Brief item above
//   - Portfolio Intelligence → portfolioEngineApi.getPerformanceDelta()
//   - Risk Assessment  → the highest-confidence real BEARISH claim from Claims
//   - Opportunity Assessment → the highest-confidence real BULLISH claim from Claims
// Two further sections (Market Pulse, Live Intelligence count) are also
// wired to their real services (Market Sentiment Engine, Daily Feed) so
// no part of the screen is left permanently on demo data once real data
// exists for it. Every fetch is independent and fault-isolated
// (Promise.allSettled) — a failure in one never blocks another. Each
// section falls back to missionControlMockData.js ONLY on a real fetch
// failure, never merely because real data was empty (an honestly empty
// real result is not "demo" — it renders its own real empty state). No
// new intelligence is computed here: Risk/Opportunity Assessment is a
// presentation-only filter/sort of the one real Claims fetch, exactly
// the same pattern already established across every other screen in
// this app (see UI_INTEGRATION_ARCHITECTURE.md).

// Phase PLATFORM-INTEGRATION-001 — same cache key News Intelligence uses
// for the identical real call (claimsApi.listOvernightChanges({limit:10})),
// so navigating between the two screens within the TTL window reuses the
// one real fetch instead of issuing a second (see requestCache.js).
const OVERNIGHT_CHANGES_CACHE_KEY = "claims:overnight-changes:10";

const BRIEF_COLLAPSED_COUNT = 3;
const STAGGER_STEP_MS = 60;
const MARKET_SENTIMENT_MARKET = "US";

function statusTone(status) {
  if (status === "STRENGTHENING") return "positive";
  if (status === "WEAKENING") return "warning";
  if (status === "INVALIDATED") return "neutral";
  return "info";
}

function statusPlainLabel(status) {
  if (status === "STRENGTHENING") return "Getting more likely";
  if (status === "WEAKENING") return "Getting less likely";
  if (status === "INVALIDATED") return "No longer holds up";
  return status;
}

function recommendedAttentionLevel(score) {
  if (!Number.isFinite(score)) return "Low";
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

/**
 * Tier 1 — the hero Brief item. The single unmistakable visual starting
 * point on the screen (masterplan §3.1): largest scale, the one place
 * the Emphasis surface material + the one-time entrance pulse are used.
 */
function HeroBriefItem({ item }) {
  return (
    <HeroCard eyebrow="Top Priority">
      <Stack direction="horizontal" gap={6} align="center" wrap>
        <MetricArc score={item.attentionScore} metric="attention" size="lg" />
        <Stack gap={2} style={{ flex: 1, minInlineSize: 240 }}>
          <h2 className="nova-heading-h1">{item.headline}</h2>
          <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
            {item.whyItMatters}
          </p>
          <Stack direction="horizontal" gap={2} wrap>
            <AttentionLevelBadge level={item.recommendedAttentionLevel} />
            {item.affectedAssets?.length ? <Badge tone="neutral">{item.affectedAssets.join(", ")}</Badge> : null}
          </Stack>
        </Stack>
      </Stack>
    </HeroCard>
  );
}

/**
 * Tier 1 — a single Today's Brief row (below the hero). Headline-only
 * when collapsed; the one-sentence explanation appears on expand.
 */
function BriefRow({ item, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      className="mc-brief-item mc-stagger-item"
      data-level={item.recommendedAttentionLevel}
      style={{
        animationDelay: `${index * STAGGER_STEP_MS}ms`,
        display: "flex",
        alignItems: "center",
        gap: "var(--nova-space-4)",
        padding: "var(--nova-space-4)",
        background: "none",
        border: "none",
        borderInlineStart: "var(--nova-border-width-strong) solid transparent",
        textAlign: "start",
        cursor: "pointer",
        width: "100%",
      }}
      aria-expanded={expanded}
      onClick={() => setExpanded((value) => !value)}
    >
      <MetricArc score={item.attentionScore} metric="attention" size="sm" />
      <Stack gap={1} style={{ flex: 1 }}>
        <strong className="nova-text-sm">{item.headline}</strong>
        {expanded ? (
          <p className="nova-text-xs" style={{ color: "var(--nova-color-text-secondary)" }}>
            {item.whyItMatters}
          </p>
        ) : null}
      </Stack>
      <AttentionLevelBadge level={item.recommendedAttentionLevel} />
    </button>
  );
}

const SECTION_LABELS = {
  brief: "Today's Brief",
  portfolio: "Portfolio Intelligence",
  riskOpportunity: "Biggest Risk / Best Opportunity",
  claimsChanging: "Claims Changing",
  marketPulse: "Market Pulse",
  feed: "Live Intelligence",
};

export default function MissionControlHomeScreen({ onNavigate }) {
  const { dir } = useI18n();
  const { selectClaim } = usePlatformContext();
  const [isLoading, setIsLoading] = useState(true);
  const [briefExpanded, setBriefExpanded] = useState(false);

  const [brief, setBrief] = useState(fallbackBrief);
  const [portfolio, setPortfolio] = useState(fallbackPortfolio);
  const [biggestRisk, setBiggestRisk] = useState(fallbackRisk);
  const [bestOpportunity, setBestOpportunity] = useState(fallbackOpportunity);
  const [claimsChanging, setClaimsChanging] = useState(fallbackClaimsChanging);
  const [marketPulse, setMarketPulse] = useState(fallbackMarketPulse);
  const [feedCount, setFeedCount] = useState(fallbackFeedCount);
  // Phase LIVE-DATA-001 — per-section liveness. Starts `true` for every
  // section; a fetch failure flips only the section(s) it belongs to.
  // This is what the Demo Mode indicator (below) actually reads — never
  // a single global flag, since a real, partial outage should say so
  // honestly rather than either hiding it entirely or crying wolf about
  // sections that loaded real data just fine.
  const [liveSections, setLiveSections] = useState({
    brief: true,
    portfolio: true,
    riskOpportunity: true,
    claimsChanging: true,
    marketPulse: true,
    feed: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [briefResult, activeClaimsResult, deltaResult, portfolioClaimsResult, overnightResult, sentimentResult, feedResult] = await Promise.allSettled([
        morningBriefApi.getToday(),
        claimsApi.listActive({ limit: 100 }),
        portfolioEngineApi.getPerformanceDelta(),
        claimsApi.listPortfolioRelevant(),
        withRequestCache(OVERNIGHT_CHANGES_CACHE_KEY, () => claimsApi.listOvernightChanges({ limit: 10 })),
        marketSentimentApi.getOverview(MARKET_SENTIMENT_MARKET),
        intelligenceApi.liveFeed(),
      ]);

      if (cancelled) return;

      const nextLive = {};
      const connected = [];
      const unavailable = [];

      // Morning Brief — real Brief items (already ranked server-side by
      // the Attention Engine). An honestly-empty real brief (no items
      // yet today) is NOT a fallback condition — it renders its own
      // empty state further down, same as every other honest-empty case
      // in this app.
      if (briefResult.status === "fulfilled") {
        setBrief(briefResult.value?.items || []);
        nextLive.brief = true;
        connected.push("Morning Brief");
      } else {
        logError("mission control morning brief load failed", briefResult.reason);
        setBrief(fallbackBrief);
        nextLive.brief = false;
        unavailable.push("Morning Brief");
      }

      // Claims + Attention Engine (shared fetch) — backs both the
      // secondary Brief usage above is independent, and Risk/Opportunity
      // Assessment below. Attention Engine's real attentionScore is
      // already attached to every claim by the backend controller; nothing
      // is recomputed here.
      let activeClaims = null;
      if (activeClaimsResult.status === "fulfilled") {
        activeClaims = activeClaimsResult.value?.claims || [];
        nextLive.riskOpportunity = true;
        connected.push("Claims", "Attention Engine");
      } else {
        logError("mission control active claims load failed", activeClaimsResult.reason);
        nextLive.riskOpportunity = false;
        unavailable.push("Claims", "Attention Engine");
      }

      if (activeClaims) {
        const byConfidenceDesc = (a, b) => (b.confidence ?? -1) - (a.confidence ?? -1);
        const topRisk = [...activeClaims].filter((claim) => claim.expectedDirection === "BEARISH").sort(byConfidenceDesc)[0] || null;
        const topOpportunity = [...activeClaims].filter((claim) => claim.expectedDirection === "BULLISH").sort(byConfidenceDesc)[0] || null;
        // A real, honest "nothing rose to this level today" is different
        // from "the fetch failed" — only fall back to demo content on a
        // real failure (handled in the `else` above), never because the
        // real list simply had no bearish/bullish claim right now.
        setBiggestRisk(topRisk);
        setBestOpportunity(topOpportunity);
      } else {
        setBiggestRisk(fallbackRisk);
        setBestOpportunity(fallbackOpportunity);
      }

      // Portfolio Intelligence — requires both the real performance delta
      // and the real portfolio-relevant claims count to be genuinely
      // live; if either failed, the section falls back as one coherent
      // unit rather than mixing one real half with one simulated half.
      if (deltaResult.status === "fulfilled" && portfolioClaimsResult.status === "fulfilled") {
        const delta = deltaResult.value;
        const portfolioClaims = portfolioClaimsResult.value?.claims || [];
        const topAffectedHoldings = [...new Set(portfolioClaims.flatMap((claim) => claim.symbols || []))].slice(0, 2);
        setPortfolio({
          hasComparison: delta.hasComparison,
          totalValue: delta.totalValue,
          valueChangePct: delta.valueChangePct,
          summary: delta.summary,
          changes: delta.changes || [],
          claimsAffectingPortfolio: portfolioClaims.length,
          topAffectedHoldings,
        });
        nextLive.portfolio = true;
        connected.push("Portfolio Intelligence");
      } else {
        if (deltaResult.status === "rejected") logError("mission control portfolio delta load failed", deltaResult.reason);
        if (portfolioClaimsResult.status === "rejected") logError("mission control portfolio-relevant claims load failed", portfolioClaimsResult.reason);
        setPortfolio(fallbackPortfolio);
        nextLive.portfolio = false;
        unavailable.push("Portfolio Intelligence");
      }

      // Claims Changing — real overnight transitions. `reason` reuses the
      // claim's own real plainLanguageStatement (no dedicated per-
      // transition reason string exists yet on the Claim contract) —
      // honest, real content, never fabricated.
      if (overnightResult.status === "fulfilled") {
        const changed = (overnightResult.value?.claims || []).map((claim) => ({
          claimId: claim.claimId,
          symbols: claim.symbols || [],
          status: claim.status,
          reason: claim.plainLanguageStatement || claim.statement || "No detailed explanation recorded for this Claim yet.",
        }));
        setClaimsChanging(changed);
        nextLive.claimsChanging = true;
        connected.push("Claims (overnight changes)");
      } else {
        logError("mission control overnight claims load failed", overnightResult.reason);
        setClaimsChanging(fallbackClaimsChanging);
        nextLive.claimsChanging = false;
        unavailable.push("Claims (overnight changes)");
      }

      // Market Pulse — real Market Sentiment Engine overview. The
      // one-sentence summary is a plain, presentation-only rendering of
      // the real score/confidence numbers (same pattern already used on
      // StockSidePanel) — never a fabricated qualitative judgment beyond
      // what the real numbers say.
      if (sentimentResult.status === "fulfilled") {
        const overview = sentimentResult.value;
        const summary =
          Number.isFinite(overview.score) && Number.isFinite(overview.confidence)
            ? `Market-wide (${overview.market}) sentiment — score ${overview.score}/100, confidence ${overview.confidence}/100.`
            : "Market sentiment is not currently available.";
        setMarketPulse({ market: overview.market, score: overview.score, confidence: overview.confidence, summary });
        nextLive.marketPulse = true;
        connected.push("Market Sentiment");
      } else {
        logError("mission control market sentiment load failed", sentimentResult.reason);
        setMarketPulse(fallbackMarketPulse);
        nextLive.marketPulse = false;
        unavailable.push("Market Sentiment");
      }

      // Live Intelligence — the real Daily Feed's item count.
      if (feedResult.status === "fulfilled") {
        setFeedCount((feedResult.value?.feed || []).length);
        nextLive.feed = true;
        connected.push("Daily Feed");
      } else {
        logError("mission control live feed count load failed", feedResult.reason);
        setFeedCount(fallbackFeedCount);
        nextLive.feed = false;
        unavailable.push("Daily Feed");
      }

      setLiveSections(nextLive);
      setIsLoading(false);

      // Phase PLATFORM-INTEGRATION-001 — contribute today's hero item to
      // the shared platform selection, so navigating from Mission Control
      // to Portfolio Workspace or News Intelligence carries it forward
      // instead of resetting to nothing.
      const heroItem = (briefResult.status === "fulfilled" ? briefResult.value?.items : fallbackBrief)?.[0];
      if (heroItem) {
        selectClaim({ ...heroItem, symbols: heroItem.affectedAssets });
      }

      // Phase LIVE-DATA-001 — required: log which services are connected
      // and which remain unavailable, every load.
      console.info("[MissionControl] service status", { connected, unavailable: [...new Set(unavailable)] });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const [hero, ...restOfBrief] = brief.length ? brief : [null];
  const visibleBriefRows = briefExpanded ? restOfBrief : restOfBrief.slice(0, BRIEF_COLLAPSED_COUNT - 1);
  const hiddenBriefCount = restOfBrief.length - visibleBriefRows.length;

  const sessionSummary = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    for (const item of brief) {
      const level = item.recommendedAttentionLevel || recommendedAttentionLevel(item.attentionScore);
      counts[level] = (counts[level] || 0) + 1;
    }
    return { highAttentionCount: counts.High, mediumAttentionCount: counts.Medium, lowAttentionCount: counts.Low };
  }, [brief]);

  if (isLoading) {
    return (
      <Page className="screen-page mission-control-screen" dir={dir}>
        <Container>
          <Stack gap={6} aria-busy="true" aria-label="Assembling today's briefing">
            <Skeleton height={180} />
            <Grid className="nova-grid">
              <Skeleton height={100} />
              <Skeleton height={100} />
            </Grid>
          </Stack>
        </Container>
      </Page>
    );
  }

  return (
    <Page className="screen-page mission-control-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-4)" }}>
          <span className="nova-heading-eyebrow">Mission Control</span>
          <h1 className="nova-heading-h1">Today's briefing</h1>
          <p className="nova-heading-subtext">Everything that needs you, in one coherent briefing — not a wall of widgets.</p>
        </Stack>

        {/* Phase MISSION-CONTROL-002 — Demo Mode indicator, quiet and
            persistent. Phase LIVE-DATA-001 — now automatically
            disappears once every section is running on real, live data,
            and gives an accurate, section-specific message when only
            some of the screen fell back. Phase DESIGN-SYSTEM-001 — now
            the shared DemoModeBanner component. */}
        <DemoModeBanner liveSections={liveSections} sectionLabels={SECTION_LABELS} />

        {/* Tier 1 — The Brief */}
        <Section aria-label="Today's Brief" className="mc-tier-1">
          {hero ? (
            <>
              <HeroBriefItem item={hero} />

              {visibleBriefRows.length ? (
                <Card>
                  <Stack gap={1}>
                    {visibleBriefRows.map((item, index) => (
                      <BriefRow key={item.claimId || item.dimension} item={item} index={index} />
                    ))}
                  </Stack>
                  {hiddenBriefCount > 0 ? (
                    <Button variant="ghost" onClick={() => setBriefExpanded(true)}>
                      +{hiddenBriefCount} more
                    </Button>
                  ) : restOfBrief.length > BRIEF_COLLAPSED_COUNT - 1 ? (
                    <Button variant="ghost" onClick={() => setBriefExpanded(false)}>
                      Show less
                    </Button>
                  ) : null}
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              <EmptyState icon="◇" title="No meaningful intelligence to surface yet today." />
            </Card>
          )}
        </Section>

        {/* Tier 2 — Your Signals */}
        <Section aria-label="Your Signals" className="mc-tier-2">
          {/* Phase LIVE-DATA-001 — `expandable` was previously set here
              with no real additional content behind it, and its 60px
              collapsed-height clip badly cut off the EmptyState shown
              on a real, honestly-empty portfolio (confirmed live: only
              a sliver of the icon rendered). Removed — same fix already
              applied to SignalCard for the same underlying reason. */}
          <Card title="Portfolio Intelligence">
            <Stack gap={3}>
              {portfolio.hasComparison ? (
                <>
                  <Stack direction="horizontal" gap={4} wrap align="center">
                    <div>
                      <span className="nova-heading-eyebrow">Total value</span>
                      <div className="nova-text-lg" style={{ fontWeight: "var(--nova-font-weight-semibold)" }}>
                        ${portfolio.totalValue.toLocaleString()}
                      </div>
                    </div>
                    <Badge tone={portfolio.valueChangePct >= 0 ? "positive" : "negative"}>
                      {portfolio.valueChangePct >= 0 ? "+" : ""}
                      {portfolio.valueChangePct}% since yesterday
                    </Badge>
                    <Badge tone="neutral">{portfolio.claimsAffectingPortfolio} claims affecting your portfolio</Badge>
                  </Stack>
                  <ul className="stack-list">
                    {portfolio.changes.map((change) => (
                      <li key={change.dimension} className="nova-text-sm">
                        <strong>{change.label}</strong>: {change.beforeValue.toLocaleString()} → {change.afterValue.toLocaleString()}
                        {change.changePct !== null ? ` (${change.changePct >= 0 ? "+" : ""}${change.changePct}%)` : ""}
                      </li>
                    ))}
                  </ul>
                  {portfolio.topAffectedHoldings.length ? (
                    <p className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
                      Top affected holdings: {portfolio.topAffectedHoldings.join(", ")}
                    </p>
                  ) : null}
                </>
              ) : (
                <EmptyState icon="◇" title={portfolio.summary || "No prior-day snapshot yet — this is the first day being tracked."} />
              )}
            </Stack>
          </Card>

          <div className="mc-signal-pair">
            {biggestRisk ? (
              <IntelligenceCard
                title="Biggest Risk"
                claim={biggestRisk}
                expandable
                expandableContent={
                  biggestRisk.portfolioImpact ? (
                    <p className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
                      Portfolio impact: {biggestRisk.portfolioImpact.magnitude}/100 ({biggestRisk.portfolioImpact.direction})
                    </p>
                  ) : null
                }
              />
            ) : (
              <Card title="Biggest Risk">
                <EmptyState icon="◇" title="No bearish claims right now." />
              </Card>
            )}
            {bestOpportunity ? (
              <IntelligenceCard
                title="Best Opportunity"
                claim={bestOpportunity}
                expandable
                expandableContent={
                  bestOpportunity.portfolioImpact ? (
                    <p className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
                      Portfolio impact: {bestOpportunity.portfolioImpact.magnitude}/100 ({bestOpportunity.portfolioImpact.direction})
                    </p>
                  ) : null
                }
              />
            ) : (
              <Card title="Best Opportunity">
                <EmptyState icon="◇" title="No bullish claims right now." />
              </Card>
            )}
          </div>
        </Section>

        {/* Tier 3 — Context */}
        <Section aria-label="Context" className="mc-tier-3">
          <Card title="Claims Changing">
            {claimsChanging.length ? (
              <ul className="stack-list">
                {claimsChanging.map((claim) => (
                  <li key={claim.claimId}>
                    <Stack direction="horizontal" gap={2} align="center" wrap>
                      <Badge tone={statusTone(claim.status)}>{statusPlainLabel(claim.status)}</Badge>
                      <strong className="nova-text-sm">{(claim.symbols || []).join(", ")}</strong>
                    </Stack>
                    <p className="nova-text-xs" style={{ color: "var(--nova-color-text-secondary)" }}>
                      {claim.reason}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="◇" title="No active Claims yet — the platform hasn't formed a belief with enough evidence to surface here." />
            )}
          </Card>

          <Card title="Market Pulse">
            <Stack direction="horizontal" gap={3} align="center" wrap>
              <Stack gap={1} align="center">
                <MetricArc score={marketPulse.confidence} metric="confidence" size="sm" showValue />
                <span className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
                  Confidence
                </span>
              </Stack>
              <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
                {marketPulse.summary}
              </p>
            </Stack>
          </Card>

          <Stack direction="horizontal" gap={2} align="center" justify="between">
            <span className="nova-text-sm" style={{ color: "var(--nova-color-text-tertiary)" }}>
              {feedCount} more items in today's feed
            </span>
            <Button variant="ghost" onClick={() => onNavigate?.("Daily Feed")}>
              Open Daily Feed
            </Button>
          </Stack>

          <p className="mc-session-summary nova-text-sm">
            That's today's briefing: {sessionSummary.highAttentionCount} item needs your attention, {sessionSummary.mediumAttentionCount} are
            worth knowing, and {sessionSummary.lowAttentionCount} are quiet.
          </p>
        </Section>
      </Container>
    </Page>
  );
}
