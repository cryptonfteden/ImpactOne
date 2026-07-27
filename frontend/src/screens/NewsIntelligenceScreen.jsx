import { useEffect, useState } from "react";
import { Page, Container, Section, Stack } from "../components/layout";
import { Card, Badge, MetricArc, EmptyState, Skeleton, HeroCard, DemoModeBanner, IntelligenceCard, AttentionLevelBadge } from "../components/nova";
import { useI18n } from "../i18n/I18nProvider";
import { intelligenceApi, claimsApi } from "../services/api";
import { withRequestCache } from "../services/requestCache";
import { usePlatformContext } from "../context/PlatformContext";
import { statusTone, statusPlainLabel, attentionLevel, computeChangedClaimsText } from "../utils/claimPresentation";
import { rankByScore } from "../services/intelligenceEngine";
import useWatchlist from "../hooks/useWatchlist";
import { logError } from "../utils/errorHandling";
import { fallbackFeed, fallbackOvernightChanges } from "./newsIntelligence/newsIntelligenceMockData";

// Phase PLATFORM-INTEGRATION-001 — same cache key Mission Control uses
// for the identical real call (claimsApi.listOvernightChanges({limit:10})).
const OVERNIGHT_CHANGES_CACHE_KEY = "claims:overnight-changes:10";

// Phase NEWS-INTELLIGENCE-001 — an intelligence layer over the same real
// events the Daily Feed (MarketNewsScreen.jsx) already lists, not a
// second news feed. Where Daily Feed's job is "surface every important
// item," this screen's job is to answer five specific questions for a
// small, ranked set of the most attention-worthy items:
//   What happened? · Why does it matter? · Why should I care? ·
//   Which holdings are affected? · What changed compared to yesterday?
// Built entirely from the Design System (HeroCard, IntelligenceCard,
// MetricArc, DemoModeBanner, EmptyState) — no new visual components.

const MAX_COVERAGE_ITEMS = 5;

function directionForImpactType(impactType) {
  if (impactType === "opportunity") return "BULLISH";
  if (impactType === "risk") return "BEARISH";
  return "NEUTRAL";
}

function newsItemSections(item, overnightChanges) {
  return [
    { label: "What happened", content: item.headline },
    { label: "Why it matters", content: item.whyItMatters || "No further explanation recorded for this item yet." },
    {
      label: "Why you should care",
      content: item.isHeld
        ? `You hold ${item.affectedAssets.join(", ")} — this directly affects a position in your portfolio.`
        : item.affectedAssets?.length
          ? `${item.affectedAssets.join(", ")} — not currently in your portfolio, but relevant to your watchlist.`
          : "Not currently tied to a specific holding or watchlist symbol.",
    },
    {
      label: "Holdings affected",
      content: item.isHeld ? item.affectedAssets.join(", ") : item.affectedAssets?.length ? `${item.affectedAssets.join(", ")} (not held)` : "None identified.",
    },
    { label: "Changed since yesterday", content: computeChangedClaimsText(item, overnightChanges) },
  ];
}

function newsItemToClaim(item) {
  return {
    claimId: item.id || item.headline,
    symbols: item.affectedAssets || [],
    expectedDirection: directionForImpactType(item.impactType),
    confidence: item.confidence,
  };
}

const SECTION_LABELS = {
  feed: "News Coverage",
  overnightChanges: "What Changed Since Yesterday",
};

export default function NewsIntelligenceScreen() {
  const { dir } = useI18n();
  const { watchlist } = useWatchlist();
  const { selectedSymbol, selectClaim } = usePlatformContext();
  const [isLoading, setIsLoading] = useState(true);
  const [feed, setFeed] = useState(fallbackFeed);
  const [overnightChanges, setOvernightChanges] = useState(fallbackOvernightChanges);
  const [liveSections, setLiveSections] = useState({ feed: true, overnightChanges: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [feedResult, overnightResult] = await Promise.allSettled([
        intelligenceApi.liveFeed({ watchlist }),
        withRequestCache(OVERNIGHT_CHANGES_CACHE_KEY, () => claimsApi.listOvernightChanges({ limit: 10 })),
      ]);

      if (cancelled) return;

      const nextLive = {};
      const connected = [];
      const unavailable = [];

      if (feedResult.status === "fulfilled") {
        setFeed(feedResult.value?.feed || []);
        nextLive.feed = true;
        connected.push("Daily Feed");
      } else {
        logError("news intelligence feed load failed", feedResult.reason);
        setFeed(fallbackFeed);
        nextLive.feed = false;
        unavailable.push("Daily Feed");
      }

      if (overnightResult.status === "fulfilled") {
        setOvernightChanges(overnightResult.value?.claims || []);
        nextLive.overnightChanges = true;
        connected.push("Claims (overnight changes)");
      } else {
        logError("news intelligence overnight claims load failed", overnightResult.reason);
        setOvernightChanges(fallbackOvernightChanges);
        nextLive.overnightChanges = false;
        unavailable.push("Claims (overnight changes)");
      }

      setLiveSections(nextLive);
      setIsLoading(false);
      console.info("[NewsIntelligence] service status", { connected, unavailable: [...new Set(unavailable)] });
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join(",")]);

  const ranked = rankByScore(feed, "attentionScore");
  // Phase PLATFORM-INTEGRATION-001 — if another integrated screen (Mission
  // Control or Portfolio Workspace) already put a symbol in shared focus,
  // prefer the highest-attention real item that actually touches it as
  // the hero, so the two screens feel continuous rather than resetting to
  // an unrelated top story. Falls back to pure attention ranking when
  // nothing in today's feed touches that symbol.
  const symbolMatch = selectedSymbol ? ranked.find((item) => item.affectedAssets?.includes(selectedSymbol)) : null;
  const hero = symbolMatch || ranked[0] || null;
  const rest = ranked.filter((item) => item !== hero);
  const coverage = rest.slice(0, MAX_COVERAGE_ITEMS);

  // Phase PLATFORM-INTEGRATION-001 — contribute this screen's own hero
  // item to the shared platform selection, once real data has actually
  // loaded (never the transient initial fallback state, which would
  // otherwise overwrite a symbol another integrated screen just set
  // before this screen's own real fetch even resolves).
  useEffect(() => {
    if (!isLoading && hero) {
      selectClaim(newsItemToClaim(hero));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hero?.id]);

  if (isLoading) {
    return (
      <Page className="screen-page news-intelligence-screen" dir={dir}>
        <Container>
          <Stack gap={6} aria-busy="true" aria-label="Assembling news intelligence">
            <Skeleton height={180} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </Stack>
        </Container>
      </Page>
    );
  }

  return (
    <Page className="screen-page news-intelligence-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-4)" }}>
          <span className="nova-heading-eyebrow">News Intelligence</span>
          <h1 className="nova-heading-h1">What's happening, and why it's your problem</h1>
          <p className="nova-heading-subtext">
            The most attention-worthy real events today, with why they matter, why you should care, and what's changed since yesterday.
          </p>
        </Stack>

        <DemoModeBanner liveSections={liveSections} sectionLabels={SECTION_LABELS} />

        {/* Tier 1 — The single most attention-worthy event today */}
        <Section aria-label="Top Story" className="mc-tier-1">
          {hero ? (
            <HeroCard eyebrow="Top Story">
              <Stack direction="horizontal" gap={6} align="center" wrap>
                <MetricArc score={hero.attentionScore} metric="attention" size="lg" />
                <Stack gap={2} style={{ flex: 1, minInlineSize: 240 }}>
                  <h2 className="nova-heading-h1">{hero.headline}</h2>
                  <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
                    {hero.whyItMatters}
                  </p>
                  <Stack direction="horizontal" gap={2} wrap>
                    <AttentionLevelBadge level={attentionLevel(hero.attentionScore)} />
                    {hero.affectedAssets?.length ? <Badge tone="neutral">{hero.affectedAssets.join(", ")}</Badge> : null}
                    {hero.isHeld ? <Badge tone="positive">Held in your portfolio</Badge> : null}
                  </Stack>
                </Stack>
              </Stack>
            </HeroCard>
          ) : (
            <Card>
              <EmptyState icon="◇" title="No news items rose to meaningful attention today." />
            </Card>
          )}
        </Section>

        {/* Tier 2 — Today's coverage, each answering all five questions */}
        <Section aria-label="Today's Coverage" className="mc-tier-2">
          {coverage.length ? (
            <Stack gap={4}>
              {coverage.map((item) => (
                <IntelligenceCard
                  key={item.id || item.headline}
                  title={item.headline}
                  claim={newsItemToClaim(item)}
                  sections={newsItemSections(item, overnightChanges)}
                />
              ))}
            </Stack>
          ) : (
            <Card title="Today's Coverage">
              <EmptyState icon="◇" title="No further items to cover beyond the top story right now." />
            </Card>
          )}
        </Section>

        {/* Tier 3 — Context: the full overnight Claim picture */}
        <Section aria-label="Context" className="mc-tier-3">
          <Card title="What Changed Since Yesterday">
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
              <EmptyState icon="◇" title="No Claims changed overnight." />
            )}
          </Card>
        </Section>
      </Container>
    </Page>
  );
}
