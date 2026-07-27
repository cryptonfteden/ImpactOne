import { useEffect, useState } from "react";
import { Page, Container, Section, Stack } from "../components/layout";
import { Card, Badge, MetricArc, EmptyState, Skeleton, HeroCard, DemoModeBanner, AttentionLevelBadge } from "../components/nova";
import { useI18n } from "../i18n/I18nProvider";
import { intelligenceApi, claimsApi } from "../services/api";
import { withRequestCache } from "../services/requestCache";
import { usePlatformContext } from "../context/PlatformContext";
import { statusTone, statusPlainLabel, attentionLevel, computeChangedClaimsText } from "../utils/claimPresentation";
import useWatchlist from "../hooks/useWatchlist";
import { logError } from "../utils/errorHandling";
import { fallbackRankings, fallbackOvernightChanges } from "./watchlistWorkspace/watchlistWorkspaceMockData";

// Phase WATCHLIST-001 — an intelligence workspace over the user's real
// watchlist, not a simple ticker list. Answers:
//   Which symbols deserve attention today? · Why? · What changed? ·
//   What is my next action? · Which symbols became more important?
// Built entirely from the existing Design System (HeroCard, Card, Badge,
// MetricArc, AttentionLevelBadge, DemoModeBanner, EmptyState) and the
// shared claimPresentation.js logic (statusTone/statusPlainLabel/
// attentionLevel/computeChangedClaimsText) already used by Mission
// Control and News Intelligence — no new component, no new business
// logic reimplemented here.

// Phase PLATFORM-INTEGRATION-001's shared cache key — the identical real
// call Mission Control and News Intelligence already make.
const OVERNIGHT_CHANGES_CACHE_KEY = "claims:overnight-changes:10";

function directionForScores(opportunityScore, riskScore) {
  if (opportunityScore >= riskScore) return "BULLISH";
  return "BEARISH";
}

// "What is my next action?" — a presentation-only rule over this
// symbol's own already-real, already-computed opportunity/risk scores
// (see autonomousMarketService.js's buildWatchlistRanks) — never a new
// score, never a fabricated recommendation.
function nextActionFor(ranking) {
  if (ranking.riskScore >= 70) return "Review risk exposure — this symbol's risk score is elevated.";
  if (ranking.opportunityScore >= 70) return "Consider building or adding to this position.";
  return "No action needed — keep monitoring.";
}

const SECTION_LABELS = {
  rankings: "Watchlist Priority",
  overnightChanges: "What Changed Since Yesterday",
};

export default function WatchlistWorkspaceScreen() {
  const { dir } = useI18n();
  const { watchlist } = useWatchlist();
  const { selectClaim } = usePlatformContext();
  const [isLoading, setIsLoading] = useState(true);
  const [rankings, setRankings] = useState(fallbackRankings);
  const [overnightChanges, setOvernightChanges] = useState(fallbackOvernightChanges);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [liveSections, setLiveSections] = useState({ rankings: true, overnightChanges: true });

  const hasWatchlist = watchlist.length > 0;

  useEffect(() => {
    let cancelled = false;

    // An honestly-empty real watchlist must never be sent to
    // intelligenceApi.watchlistPriority() — the backend falls back to a
    // hardcoded default symbol set (AAPL/NVDA/TSLA) when no watchlist
    // query param is present, which would otherwise be shown as if it
    // were the user's own watchlist. No watchlist means no fetch, and an
    // honest empty state below.
    if (!hasWatchlist) {
      setIsLoading(false);
      setRankings([]);
      setOvernightChanges([]);
      return undefined;
    }

    async function load() {
      setIsLoading(true);
      const [priorityResult, overnightResult] = await Promise.allSettled([
        intelligenceApi.watchlistPriority({ watchlist }),
        withRequestCache(OVERNIGHT_CHANGES_CACHE_KEY, () => claimsApi.listOvernightChanges({ limit: 10 })),
      ]);

      if (cancelled) return;

      const nextLive = {};
      const connected = [];
      const unavailable = [];

      if (priorityResult.status === "fulfilled") {
        setRankings(priorityResult.value?.watchlistRankings || []);
        setGeneratedAt(priorityResult.value?.generatedAt || null);
        nextLive.rankings = true;
        connected.push("Watchlist Priority");
      } else {
        logError("watchlist workspace priority load failed", priorityResult.reason);
        setRankings(fallbackRankings);
        setGeneratedAt(null);
        nextLive.rankings = false;
        unavailable.push("Watchlist Priority");
      }

      if (overnightResult.status === "fulfilled") {
        setOvernightChanges(overnightResult.value?.claims || []);
        nextLive.overnightChanges = true;
        connected.push("Claims (overnight changes)");
      } else {
        logError("watchlist workspace overnight claims load failed", overnightResult.reason);
        setOvernightChanges(fallbackOvernightChanges);
        nextLive.overnightChanges = false;
        unavailable.push("Claims (overnight changes)");
      }

      setLiveSections(nextLive);
      setIsLoading(false);
      console.info("[WatchlistWorkspace] service status", { connected, unavailable: [...new Set(unavailable)] });
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join(","), hasWatchlist]);

  const rankedList = [...rankings].sort((a, b) => (b.overallAiScore ?? -1) - (a.overallAiScore ?? -1));
  const [hero, ...rest] = rankedList.length ? rankedList : [null];

  // "Which symbols became more important?" — real overnight Claim
  // transitions to STRENGTHENING among this watchlist's own symbols,
  // never a fabricated day-over-day ranking delta (no such snapshot
  // exists to compare against honestly).
  const becameMoreImportant = overnightChanges.filter(
    (claim) => claim.status === "STRENGTHENING" && claim.symbols?.some((symbol) => watchlist.includes(symbol))
  );

  useEffect(() => {
    if (!isLoading && hero) {
      selectClaim({ claimId: `watchlist-${hero.symbol}`, symbols: [hero.symbol] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hero?.symbol]);

  if (isLoading) {
    return (
      <Page className="screen-page watchlist-workspace-screen" dir={dir}>
        <Container>
          <Stack gap={6} aria-busy="true" aria-label="Assembling watchlist intelligence">
            <Skeleton height={180} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </Stack>
        </Container>
      </Page>
    );
  }

  return (
    <Page className="screen-page watchlist-workspace-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-4)" }}>
          <span className="nova-heading-eyebrow">Watchlist Workspace</span>
          <h1 className="nova-heading-h1">What deserves your attention today</h1>
          <p className="nova-heading-subtext">Your watchlist, ranked by real priority — why it matters, what changed, and what to do next.</p>
        </Stack>

        {hasWatchlist ? <DemoModeBanner liveSections={liveSections} sectionLabels={SECTION_LABELS} /> : null}

        {!hasWatchlist ? (
          <Section aria-label="Top Priority" className="mc-tier-1">
            <Card>
              <EmptyState icon="◇" title="Add a ticker to your watchlist to see intelligence here." />
            </Card>
          </Section>
        ) : (
          <>
            {/* Tier 1 — the single most attention-worthy watchlist symbol today */}
            <Section aria-label="Top Priority" className="mc-tier-1">
              {hero ? (
                <HeroCard eyebrow="Top Priority">
                  <Stack direction="horizontal" gap={6} align="center" wrap>
                    <MetricArc score={hero.overallAiScore} metric="attention" size="lg" />
                    <Stack gap={2} style={{ flex: 1, minInlineSize: 240 }}>
                      <h2 className="nova-heading-h1">{hero.symbol}</h2>
                      <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
                        {hero.explanation}
                      </p>
                      <Stack direction="horizontal" gap={2} wrap>
                        <AttentionLevelBadge level={attentionLevel(hero.overallAiScore)} />
                        <Badge tone={directionForScores(hero.opportunityScore, hero.riskScore) === "BULLISH" ? "positive" : "negative"}>
                          {directionForScores(hero.opportunityScore, hero.riskScore)}
                        </Badge>
                      </Stack>
                    </Stack>
                  </Stack>
                </HeroCard>
              ) : (
                <Card>
                  <EmptyState icon="◇" title="No watchlist intelligence to surface yet today." />
                </Card>
              )}
            </Section>

            {/* Tier 2 — which symbols became more important + the ranked list */}
            <Section aria-label="Your Watchlist" className="mc-tier-2">
              <Card title="Which Symbols Became More Important">
                {becameMoreImportant.length ? (
                  <ul className="stack-list">
                    {becameMoreImportant.map((claim) => (
                      <li key={claim.claimId}>
                        <Stack direction="horizontal" gap={2} align="center" wrap>
                          <Badge tone={statusTone(claim.status)}>{statusPlainLabel(claim.status)}</Badge>
                          <strong className="nova-text-sm">{(claim.symbols || []).join(", ")}</strong>
                        </Stack>
                        <p className="nova-text-xs" style={{ color: "var(--nova-color-text-secondary)" }}>
                          {claim.plainLanguageStatement || claim.statement}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="◇" title="No watchlist symbol became more important overnight." />
                )}
              </Card>

              <Card title="Watchlist Priority">
                {rest.length ? (
                  <Stack gap={4}>
                    {rest.map((ranking) => {
                      const changedText = computeChangedClaimsText({ affectedAssets: [ranking.symbol], publishedAt: generatedAt }, overnightChanges);
                      return (
                        <Card key={ranking.symbol} eyebrow={ranking.symbol}>
                          <Stack gap={2}>
                            <Stack direction="horizontal" gap={3} align="center" wrap>
                              <MetricArc score={ranking.overallAiScore} metric="attention" size="sm" showValue />
                              <AttentionLevelBadge level={attentionLevel(ranking.overallAiScore)} />
                              <Badge tone={directionForScores(ranking.opportunityScore, ranking.riskScore) === "BULLISH" ? "positive" : "negative"}>
                                {directionForScores(ranking.opportunityScore, ranking.riskScore)}
                              </Badge>
                            </Stack>
                            <p className="nova-text-xs"><strong>Why:</strong> {ranking.explanation}</p>
                            <p className="nova-text-xs"><strong>What changed:</strong> {changedText}</p>
                            <p className="nova-text-xs"><strong>Next action:</strong> {nextActionFor(ranking)}</p>
                          </Stack>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <EmptyState icon="◇" title="No other watchlist symbols to rank right now." />
                )}
              </Card>
            </Section>
          </>
        )}
      </Container>
    </Page>
  );
}
