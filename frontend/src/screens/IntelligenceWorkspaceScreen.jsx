import { useEffect, useMemo, useState } from "react";
import { Page, Container, Grid, Stack } from "../components/layout";
import { Card, Badge, ConfidenceBadge, EvidenceBadge, AiConfidence, Table, Tabs, EmptyState, Skeleton, Alert } from "../components/nova";
import { intelligenceApi, watchlistFoldersApi, priceAlertsApi } from "../services/api";
import useWatchlist from "../hooks/useWatchlist";
import { logError } from "../utils/errorHandling";
import { useI18n } from "../i18n/I18nProvider";
import { trackEvent } from "../utils/analytics";
import { startVisibilityAwarePolling } from "../utils/pollWhileVisible";

/**
 * Phase X12C.2 — Intelligence Workspace. An AI intelligence desk for global
 * markets, built entirely from certified NOVA components over data the app
 * already computes and already exposes via intelligenceApi.overview() (the
 * same feed GlobalIntelligenceScreen.jsx reads — that screen is untouched,
 * this one surfaces different fields from the same real payload: severity,
 * time horizon, evidence, counterarguments, invalidation signals) plus
 * watchlistFoldersApi/priceAlertsApi for Saved/Tracked Items. No new
 * backend endpoint. No fabricated score is invented anywhere below — every
 * number rendered is a field that already exists on the API response.
 */

const DEFAULT_SCENARIOS = ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"];

// impactType is the only real directional field on a feed item (no
// bullish/bearish field exists anywhere in the backend — see X12C.2
// research). Mapped to Badge tone, never relabeled as something stronger
// than what the data actually says.
const IMPACT_TONE = { opportunity: "positive", risk: "negative", neutral: "neutral" };

function buildSectorImpactMap(feed) {
  const bySector = new Map();
  for (const item of feed) {
    for (const sector of item.affectedSectors || []) {
      const current = bySector.get(sector);
      if (!current || (item.importanceScore || 0) > (current.importanceScore || 0)) {
        bySector.set(sector, item);
      }
    }
  }
  return Array.from(bySector.entries()).map(([sector, item]) => ({ sector, item }));
}

export default function IntelligenceWorkspaceScreen() {
  const { t, dir } = useI18n();
  const { watchlist } = useWatchlist();
  const [overview, setOverview] = useState(null);
  const [folders, setFolders] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState(t("intelligenceWorkspace.filters.all"));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await intelligenceApi.overview({
          watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA"],
          scenarios: DEFAULT_SCENARIOS,
          sessionType: "morning",
        });
        if (!cancelled) {
          setOverview(payload);
          setError("");
          trackEvent("intelligence_workspace_viewed");
        }
      } catch (loadError) {
        logError("intelligence workspace overview failed", loadError);
        if (!cancelled) setError(t("intelligenceWorkspace.refreshFailed"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    const stopPolling = startVisibilityAwarePolling(load, 60000);
    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join(",")]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([watchlistFoldersApi.list(), priceAlertsApi.list()])
      .then(([foldersResult, alertsResult]) => {
        if (!cancelled) {
          setFolders(foldersResult.folders || []);
          setAlerts(alertsResult.alerts || []);
        }
      })
      .catch(() => {
        // Saved/Tracked Items is additive — never a blocking error here.
        if (!cancelled) {
          setFolders([]);
          setAlerts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const feed = overview?.feed || [];
  const sortedFeed = useMemo(() => [...feed].sort((itemA, itemB) => (itemB.importanceScore || 0) - (itemA.importanceScore || 0)), [feed]);
  const topEvent = sortedFeed[0] || null;
  const priorityEvents = sortedFeed.slice(0, 6);
  const sectorImpacts = useMemo(() => buildSectorImpactMap(sortedFeed.slice(0, 8)), [sortedFeed]);

  const filterOptions = [
    t("intelligenceWorkspace.filters.all"),
    t("intelligenceWorkspace.filters.opportunity"),
    t("intelligenceWorkspace.filters.risk"),
    t("intelligenceWorkspace.filters.neutral"),
  ];
  const filteredFeed = useMemo(() => {
    if (activeFilter === t("intelligenceWorkspace.filters.all")) return sortedFeed;
    const impactType = activeFilter === t("intelligenceWorkspace.filters.opportunity") ? "opportunity" : activeFilter === t("intelligenceWorkspace.filters.risk") ? "risk" : "neutral";
    return sortedFeed.filter((item) => item.impactType === impactType);
  }, [sortedFeed, activeFilter, t]);

  const sourceItems = sortedFeed.slice(0, 6);

  if (isLoading && !overview) {
    return (
      <Page className="screen-page intelligence-workspace-screen" dir={dir}>
        <Container>
          <Stack gap={4} aria-busy="true" aria-label={t("intelligenceWorkspace.loading")}>
            <Skeleton height={32} width="40%" />
            <Grid className="intelligence-workspace__grid">
              <Skeleton height={140} />
              <Skeleton height={140} />
            </Grid>
          </Stack>
        </Container>
      </Page>
    );
  }

  if (error && !overview) {
    return (
      <Page className="screen-page intelligence-workspace-screen" dir={dir}>
        <Container>
          <Alert tone="error">{error}</Alert>
          <p className="nova-heading-subtext">{t("intelligenceWorkspace.noCachedFallback")}</p>
        </Container>
      </Page>
    );
  }

  if (!overview) {
    return (
      <Page className="screen-page intelligence-workspace-screen" dir={dir}>
        <Container>
          <p className="nova-heading-subtext">{t("intelligenceWorkspace.nothingToShow")}</p>
        </Container>
      </Page>
    );
  }

  return (
    <Page className="screen-page intelligence-workspace-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-6)" }}>
          <span className="nova-heading-eyebrow">{t("intelligenceWorkspace.eyebrow")}</span>
          <h1 className="nova-heading-h1">{t("intelligenceWorkspace.title")}</h1>
          <p className="nova-heading-subtext">{t("intelligenceWorkspace.subtitle")}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
        </Stack>

        {/* 1. Intelligence Brief */}
        <section aria-label={t("intelligenceWorkspace.sections.brief")}>
          <Card title={t("intelligenceWorkspace.sections.brief")}>
            {topEvent ? (
              <Stack gap={3}>
                <p className="nova-heading-subtext">{topEvent.whyItMatters}</p>
                <Stack direction="horizontal" gap={2} wrap>
                  <ConfidenceBadge score={topEvent.confidence} />
                  <Badge tone="neutral">{t("intelligenceWorkspace.brief.lastUpdated", { time: topEvent.publishedAt ? new Date(topEvent.publishedAt).toLocaleString() : t("intelligenceWorkspace.unknown") })}</Badge>
                </Stack>
                <p className="nova-text-sm">
                  <strong>{t("intelligenceWorkspace.brief.implication")}:</strong> {topEvent.marketImpactPrediction || t("intelligenceWorkspace.notAvailable")}
                </p>
              </Stack>
            ) : (
              <EmptyState icon="◇" title={t("intelligenceWorkspace.empty.brief")} />
            )}
          </Card>
        </section>

        {/* 2. Priority Events */}
        <section aria-label={t("intelligenceWorkspace.sections.priorityEvents")}>
          <Card title={t("intelligenceWorkspace.sections.priorityEvents")}>
            {priorityEvents.length ? (
              <Table
                columns={[
                  { key: "headline", label: t("intelligenceWorkspace.events.headline") },
                  { key: "severity", label: t("intelligenceWorkspace.events.severity") },
                  { key: "sectors", label: t("intelligenceWorkspace.events.sectors") },
                  { key: "direction", label: t("intelligenceWorkspace.events.direction") },
                  { key: "horizon", label: t("intelligenceWorkspace.events.horizon") },
                ]}
                rows={priorityEvents.map((item) => ({
                  id: item.id,
                  headline: item.headline,
                  severity: <Badge tone={item.riskLevel === "high" ? "negative" : item.riskLevel === "medium" ? "warning" : "neutral"}>{item.riskLevel || t("intelligenceWorkspace.unknown")}</Badge>,
                  sectors: (item.affectedSectors || []).slice(0, 3).join(", ") || "—",
                  direction: <Badge tone={IMPACT_TONE[item.impactType] || "neutral"}>{item.impactType || t("intelligenceWorkspace.unknown")}</Badge>,
                  horizon: item.timeHorizon || "—",
                }))}
              />
            ) : (
              <EmptyState icon="◇" title={t("intelligenceWorkspace.empty.priorityEvents")} />
            )}
          </Card>
        </section>

        {/* 3. Market Impact Map */}
        <section aria-label={t("intelligenceWorkspace.sections.impactMap")}>
          <Card title={t("intelligenceWorkspace.sections.impactMap")}>
            {sectorImpacts.length ? (
              <Grid className="intelligence-workspace__grid">
                {sectorImpacts.map(({ sector, item }) => (
                  <div key={sector} style={{ gridColumn: "span 4" }}>
                    <Card eyebrow={sector}>
                      <Stack gap={2}>
                        <Badge tone={IMPACT_TONE[item.impactType] || "neutral"}>{item.impactType || t("intelligenceWorkspace.unknown")}</Badge>
                        <AiConfidence score={item.confidence} />
                        <EvidenceBadge count={(item.explainability?.evidence || []).length} />
                      </Stack>
                    </Card>
                  </div>
                ))}
              </Grid>
            ) : (
              <EmptyState icon="◇" title={t("intelligenceWorkspace.empty.impactMap")} />
            )}
          </Card>
        </section>

        {/* 4. Source Evidence */}
        <section aria-label={t("intelligenceWorkspace.sections.sourceEvidence")}>
          <Card title={t("intelligenceWorkspace.sections.sourceEvidence")}>
            {sourceItems.length ? (
              <ul className="stack-list">
                {sourceItems.map((item) => (
                  <li key={item.id} className="nova-heading-subtext">
                    <Stack direction="horizontal" gap={2} wrap align="center">
                      <strong>{item.sourceName || t("intelligenceWorkspace.unknown")}</strong>
                      <span className="nova-text-xs">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : t("intelligenceWorkspace.unknown")}</span>
                      <Badge tone="neutral">{t("intelligenceWorkspace.sourceEvidence.reliability", { level: item.reliability || t("intelligenceWorkspace.unknown") })}</Badge>
                      <EvidenceBadge count={(item.explainability?.evidence || []).length} />
                    </Stack>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="◇" title={t("intelligenceWorkspace.empty.sourceEvidence")} />
            )}
          </Card>
        </section>

        {/* 5. AI Analysis */}
        <section aria-label={t("intelligenceWorkspace.sections.aiAnalysis")}>
          <Card title={t("intelligenceWorkspace.sections.aiAnalysis")}>
            {topEvent?.explainability ? (
              <Stack gap={3}>
                <p className="nova-heading-subtext">{topEvent.explainability.reasoning || topEvent.whyItMatters}</p>
                <p className="nova-text-sm">
                  <strong>{t("intelligenceWorkspace.aiAnalysis.uncertainty")}:</strong>{" "}
                  {typeof topEvent.confidence === "number" ? t("intelligenceWorkspace.aiAnalysis.uncertaintyValue", { value: 100 - topEvent.confidence }) : t("intelligenceWorkspace.notAvailable")}
                </p>
                <div>
                  <p className="nova-text-sm"><strong>{t("intelligenceWorkspace.aiAnalysis.counterScenario")}:</strong></p>
                  {(topEvent.explainability.counterarguments || []).length ? (
                    <ul className="stack-list">
                      {topEvent.explainability.counterarguments.map((line, index) => (
                        <li key={index} className="nova-heading-subtext">{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="nova-heading-subtext">{t("intelligenceWorkspace.notAvailable")}</p>
                  )}
                </div>
                <div>
                  <p className="nova-text-sm"><strong>{t("intelligenceWorkspace.aiAnalysis.invalidation")}:</strong></p>
                  {(topEvent.explainability.invalidationSignals || []).length ? (
                    <ul className="stack-list">
                      {topEvent.explainability.invalidationSignals.map((line, index) => (
                        <li key={index} className="nova-heading-subtext">{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="nova-heading-subtext">{t("intelligenceWorkspace.notAvailable")}</p>
                  )}
                </div>
              </Stack>
            ) : (
              <EmptyState icon="◇" title={t("intelligenceWorkspace.empty.aiAnalysis")} />
            )}
          </Card>
        </section>

        {/* 6. Recent Intelligence */}
        <section aria-label={t("intelligenceWorkspace.sections.recent")}>
          <Card title={t("intelligenceWorkspace.sections.recent")}>
            <Stack gap={3}>
              <Tabs tabs={filterOptions} activeTab={activeFilter} onChange={setActiveFilter} />
              {filteredFeed.length ? (
                <ul className="stack-list">
                  {filteredFeed.map((item) => (
                    <li key={item.id} className="nova-heading-subtext">
                      <strong>{item.headline}</strong> — <Badge tone={IMPACT_TONE[item.impactType] || "neutral"}>{item.impactType}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="◇" title={t("intelligenceWorkspace.empty.recent")} />
              )}
            </Stack>
          </Card>
        </section>

        {/* 7. Saved / Tracked Items */}
        <section aria-label={t("intelligenceWorkspace.sections.saved")}>
          <Card title={t("intelligenceWorkspace.sections.saved")}>
            {folders === null || alerts === null ? (
              <Skeleton height={60} />
            ) : folders.length === 0 && alerts.length === 0 ? (
              <EmptyState icon="◇" title={t("intelligenceWorkspace.empty.saved")} />
            ) : (
              <Stack gap={3}>
                {folders.length ? (
                  <ul className="stack-list">
                    {folders.map((folder) => (
                      <li key={folder.id} className="nova-heading-subtext">
                        <strong>{folder.name}</strong> — {t("intelligenceWorkspace.saved.symbolCount", { count: (folder.items || []).length })}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {alerts.length ? (
                  <ul className="stack-list">
                    {alerts.map((alert) => (
                      <li key={alert.id} className="nova-heading-subtext">
                        <strong>{alert.symbol}</strong> {alert.direction === "ABOVE" ? t("intelligenceWorkspace.saved.above") : t("intelligenceWorkspace.saved.below")} ${Number(alert.targetPrice).toFixed(2)}{" "}
                        <Badge tone={alert.status === "TRIGGERED" ? "warning" : "info"}>{alert.status}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Stack>
            )}
          </Card>
        </section>
      </Container>
    </Page>
  );
}
