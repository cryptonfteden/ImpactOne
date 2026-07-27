import { useEffect, useState } from "react";
import { Page, Container, Section, Stack } from "../components/layout";
import { Card, Badge, MetricArc, EmptyState, Skeleton, HeroCard, DemoModeBanner } from "../components/nova";
import { useI18n } from "../i18n/I18nProvider";
import { marketSentimentApi, intelligenceApi, claimsApi } from "../services/api";
import { withRequestCache } from "../services/requestCache";
import { usePlatformContext } from "../context/PlatformContext";
import { statusTone, statusPlainLabel } from "../utils/claimPresentation";
import { rankByScore } from "../services/intelligenceEngine";
import { logError } from "../utils/errorHandling";
import { fallbackSentiment, fallbackFeed, fallbackGlobalMap, fallbackOvernightChanges } from "./marketIntelligence/marketIntelligenceMockData";

// Phase MARKET-INTELLIGENCE-001 — this Workspace explains the market
// itself, never the user's own portfolio (that is Portfolio Workspace's
// job). Answers:
//   What is happening across the market? · Which sectors are leading? ·
//   Which sectors are weakening? · What macro events drive this? ·
//   Where is attention flowing? · What should investors monitor next?
// Built entirely from the existing Design System (HeroCard, Card, Badge,
// MetricArc, DemoModeBanner, EmptyState), the shared intelligenceEngine.js
// ranking primitive, and the shared claimPresentation.js status logic —
// no new component, no duplicated business logic.

const MARKET = "US";
const OVERNIGHT_CHANGES_CACHE_KEY = "claims:overnight-changes:10";
const LIVE_FEED_CACHE_KEY = "intelligence:live-feed:market-wide";
const GLOBAL_MAP_CACHE_KEY = "intelligence:global-map:market-wide";

// "Which sectors are leading / weakening?" — a presentation-only
// aggregation over each real feed item's own already-real
// affectedSectors/impactType/importanceScore fields (never a new score):
// a sector's net standing is the sum of its opportunity items' real
// importanceScore minus its risk items' real importanceScore.
// The real macroRegime is a structured object ({riskMode,
// inflationPressure, recessionRisk, liquidityTrend}), not a string —
// formatted here into one honest sentence rather than rendered raw.
function describeMacroRegime(macroRegime) {
  if (!macroRegime) return "No macro regime classification available yet.";
  if (typeof macroRegime === "string") return macroRegime;
  const parts = [];
  if (macroRegime.riskMode) parts.push(`Risk mode: ${macroRegime.riskMode}`);
  if (macroRegime.inflationPressure) parts.push(`inflation pressure: ${macroRegime.inflationPressure}`);
  if (macroRegime.recessionRisk) parts.push(`recession risk: ${macroRegime.recessionRisk}`);
  if (macroRegime.liquidityTrend) parts.push(`liquidity trend: ${macroRegime.liquidityTrend}`);
  return parts.length ? parts.join(", ") : "No macro regime classification available yet.";
}

function aggregateSectorNetScores(feed) {
  const bySector = new Map();
  for (const item of feed || []) {
    const delta = item.impactType === "opportunity" ? item.importanceScore || 0 : item.impactType === "risk" ? -(item.importanceScore || 0) : 0;
    if (!delta) continue;
    for (const sector of item.affectedSectors || []) {
      bySector.set(sector, (bySector.get(sector) || 0) + delta);
    }
  }
  return Array.from(bySector.entries()).map(([sector, netScore]) => ({ sector, netScore }));
}

const SECTION_LABELS = {
  sentiment: "Market Sentiment",
  sectors: "Sector Standing",
  macro: "Global Map",
  monitor: "What to Monitor Next",
};

export default function MarketIntelligenceWorkspaceScreen() {
  const { dir } = useI18n();
  const { selectSymbol } = usePlatformContext();
  const [isLoading, setIsLoading] = useState(true);
  const [sentiment, setSentiment] = useState(fallbackSentiment);
  const [feed, setFeed] = useState(fallbackFeed);
  const [globalMap, setGlobalMap] = useState(fallbackGlobalMap);
  const [overnightChanges, setOvernightChanges] = useState(fallbackOvernightChanges);
  const [liveSections, setLiveSections] = useState({ sentiment: true, sectors: true, macro: true, monitor: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const [sentimentResult, feedResult, globalMapResult, overnightResult] = await Promise.allSettled([
        marketSentimentApi.getOverview(MARKET),
        withRequestCache(LIVE_FEED_CACHE_KEY, () => intelligenceApi.liveFeed()),
        withRequestCache(GLOBAL_MAP_CACHE_KEY, () => intelligenceApi.globalMap()),
        withRequestCache(OVERNIGHT_CHANGES_CACHE_KEY, () => claimsApi.listOvernightChanges({ limit: 10 })),
      ]);

      if (cancelled) return;

      const nextLive = {};
      const connected = [];
      const unavailable = [];

      if (sentimentResult.status === "fulfilled") {
        setSentiment(sentimentResult.value);
        nextLive.sentiment = true;
        connected.push("Market Sentiment");
      } else {
        logError("market intelligence sentiment load failed", sentimentResult.reason);
        setSentiment(fallbackSentiment);
        nextLive.sentiment = false;
        unavailable.push("Market Sentiment");
      }

      if (feedResult.status === "fulfilled") {
        setFeed(feedResult.value?.feed || []);
        nextLive.sectors = true;
        connected.push("Daily Feed");
      } else {
        logError("market intelligence feed load failed", feedResult.reason);
        setFeed(fallbackFeed);
        nextLive.sectors = false;
        unavailable.push("Daily Feed");
      }

      if (globalMapResult.status === "fulfilled") {
        setGlobalMap(globalMapResult.value?.globalMap || null);
        nextLive.macro = true;
        connected.push("Global Map");
      } else {
        logError("market intelligence global map load failed", globalMapResult.reason);
        setGlobalMap(fallbackGlobalMap);
        nextLive.macro = false;
        unavailable.push("Global Map");
      }

      if (overnightResult.status === "fulfilled") {
        setOvernightChanges(overnightResult.value?.claims || []);
        nextLive.monitor = true;
        connected.push("Claims (overnight changes)");
      } else {
        logError("market intelligence overnight claims load failed", overnightResult.reason);
        setOvernightChanges(fallbackOvernightChanges);
        nextLive.monitor = false;
        unavailable.push("Claims (overnight changes)");
      }

      setLiveSections(nextLive);
      setIsLoading(false);
      console.info("[MarketIntelligence] service status", { connected, unavailable: [...new Set(unavailable)] });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sectorScores = aggregateSectorNetScores(feed);
  const leadingSectors = rankByScore(sectorScores, "netScore").filter((s) => s.netScore > 0);
  const weakeningSectors = [...rankByScore(sectorScores, "netScore")].reverse().filter((s) => s.netScore < 0);
  const macroEvents = rankByScore(globalMap?.majorGlobalEvents, "score");

  useEffect(() => {
    if (!isLoading) {
      const topAsset = globalMap?.sectorPropagation?.[0]?.assets?.[0];
      if (topAsset) selectSymbol(topAsset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, globalMap]);

  if (isLoading) {
    return (
      <Page className="screen-page market-intelligence-workspace-screen" dir={dir}>
        <Container>
          <Stack gap={6} aria-busy="true" aria-label="Assembling market intelligence">
            <Skeleton height={180} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </Stack>
        </Container>
      </Page>
    );
  }

  return (
    <Page className="screen-page market-intelligence-workspace-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-4)" }}>
          <span className="nova-heading-eyebrow">Market Intelligence Workspace</span>
          <h1 className="nova-heading-h1">What's happening across the market</h1>
          <p className="nova-heading-subtext">The market itself — not your portfolio: sentiment, sector leadership, macro drivers, and where attention is flowing.</p>
        </Stack>

        <DemoModeBanner liveSections={liveSections} sectionLabels={SECTION_LABELS} />

        {/* Tier 1 — the market-wide picture */}
        <Section aria-label="Market Sentiment" className="mc-tier-1">
          <HeroCard eyebrow="Market Sentiment">
            <Stack direction="horizontal" gap={6} align="center" wrap>
              <MetricArc score={sentiment.confidence} metric="confidence" size="lg" showValue />
              <Stack gap={2} style={{ flex: 1, minInlineSize: 240 }}>
                <h2 className="nova-heading-h1">{sentiment.market} market — score {sentiment.score}/100</h2>
                <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
                  {describeMacroRegime(globalMap?.macroRegime)}
                </p>
              </Stack>
            </Stack>
          </HeroCard>
        </Section>

        {/* Tier 2 — sector leadership, macro drivers, and capital flow */}
        <Section aria-label="Sector Standing" className="mc-tier-2">
          <Card title="Sectors Leading">
            {leadingSectors.length ? (
              <ul className="stack-list">
                {leadingSectors.map((entry) => (
                  <li key={entry.sector}>
                    <Stack direction="horizontal" gap={2} align="center" wrap>
                      <Badge tone="positive">{entry.sector}</Badge>
                      <span className="nova-text-xs">Net score {entry.netScore}</span>
                    </Stack>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="◇" title="No sector is clearly leading right now." />
            )}
          </Card>

          <Card title="Sectors Weakening">
            {weakeningSectors.length ? (
              <ul className="stack-list">
                {weakeningSectors.map((entry) => (
                  <li key={entry.sector}>
                    <Stack direction="horizontal" gap={2} align="center" wrap>
                      <Badge tone="negative">{entry.sector}</Badge>
                      <span className="nova-text-xs">Net score {entry.netScore}</span>
                    </Stack>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="◇" title="No sector is clearly weakening right now." />
            )}
          </Card>
        </Section>

        {/* Tier 3 — macro drivers, capital flow, and what to monitor next */}
        <Section aria-label="Global Map" className="mc-tier-3">
          <Card title="What Macro Events Drive This">
            {macroEvents.length ? (
              <ul className="stack-list">
                {macroEvents.map((event, index) => (
                  <li key={`${event.headline}-${index}`}>
                    <Stack direction="horizontal" gap={2} align="center" wrap>
                      <strong className="nova-text-sm">{event.headline}</strong>
                      <Badge tone="neutral">{event.score}/100</Badge>
                    </Stack>
                    {event.sectors?.length ? <p className="nova-text-xs">Sectors: {event.sectors.join(", ")}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="◇" title="No major macro events recorded right now." />
            )}
          </Card>

          <Card title="Where Attention Is Flowing">
            {globalMap?.capitalFlows?.length ? (
              <ul className="stack-list">
                {globalMap.capitalFlows.map((flow, index) => (
                  <li key={`${flow.from}-${flow.to}-${index}`}>
                    <strong className="nova-text-sm">{flow.from} → {flow.to}</strong>
                    <p className="nova-text-xs" style={{ color: "var(--nova-color-text-secondary)" }}>
                      {flow.rationale}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="◇" title="No capital flow signal recorded right now." />
            )}
          </Card>

          <Card title="What Should Investors Monitor Next">
            {overnightChanges.length ? (
              <ul className="stack-list">
                {overnightChanges.map((claim) => (
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
              <EmptyState icon="◇" title="No Claims changed overnight — nothing new to monitor right now." />
            )}
          </Card>
        </Section>
      </Container>
    </Page>
  );
}
