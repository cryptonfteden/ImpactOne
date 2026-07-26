import { useEffect, useMemo, useState } from "react";
import { Page, Container, Grid, Stack } from "../components/layout";
import { Card, Badge, ConfidenceBadge, Table, EmptyState, Skeleton, Alert } from "../components/nova";
import { portfolioEngineApi, claimsApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { useI18n } from "../i18n/I18nProvider";
import { trackEvent } from "../utils/analytics";

/**
 * Phase X12C.3 — Portfolio Intelligence Workspace. An AI operating center
 * for holdings, not a table. Built entirely from certified NOVA components
 * over the real, already-computed portfolio-engine data
 * (`portfolioEngineApi.getSummary()` / `getPerformanceDelta()` — the same
 * data PortfolioEngineScreen.jsx already reads, untouched by this phase)
 * plus, as of Phase UI-INTEGRATION-001, real Claims affecting this
 * portfolio (`claimsApi.listPortfolioRelevant()` — the Claim
 * Intelligence Layer's own portfolio-relevance filter, reused as-is,
 * never recomputed here). This replaced the screen's original
 * `recommendationsApi.list()`-based "AI Portfolio Recommendations"
 * section — Claims are the canonical reasoning object now.
 *
 * Concentration, diversification, and per-sector risk have NO dedicated
 * backend field (confirmed by X12C.3 research — portfolioIntelligenceService's
 * sectorConcentration/riskConcentration operate on synthetic what-if
 * holdings, not the real DB-backed portfolio). Rather than borrow that
 * synthetic service or invent a new score, this screen computes concentration/
 * diversification with standard, transparent arithmetic (weight = real
 * marketValue / real totalValue; HHI = sum of squared real weights) directly
 * over the real positions/allocation this same API call already returned —
 * see PORTFOLIO_WORKSPACE.md for the exact formulas. Rebalance Suggestions
 * has no backing concept anywhere in the backend (grep-confirmed) and is
 * shown as an honest "not available" state, never a fabricated suggestion.
 */

function computeConcentration(positions, totalValue) {
  if (!positions.length || !totalValue) return null;
  const weights = positions
    .map((position) => ({ symbol: position.symbol, weight: (position.marketValue || 0) / totalValue }))
    .sort((weightA, weightB) => weightB.weight - weightA.weight);
  const top1 = weights.slice(0, 1).reduce((sum, item) => sum + item.weight, 0);
  const top3 = weights.slice(0, 3).reduce((sum, item) => sum + item.weight, 0);
  const top5 = weights.slice(0, 5).reduce((sum, item) => sum + item.weight, 0);
  const hhi = weights.reduce((sum, item) => sum + item.weight * item.weight, 0) * 10000;
  return { largestHolding: weights[0], top1, top3, top5, hhi };
}

function computeSectorRisk(positions, bySector) {
  return (bySector || []).map((sector) => {
    const sectorPositions = positions.filter((position) => position.sector === sector.name);
    const netUnrealizedPnl = sectorPositions.reduce((sum, position) => sum + (position.unrealizedPnl || 0), 0);
    return { ...sector, netUnrealizedPnl, tone: netUnrealizedPnl > 0 ? "positive" : netUnrealizedPnl < 0 ? "negative" : "neutral" };
  });
}

export default function PortfolioWorkspaceScreen() {
  const { t, dir } = useI18n();
  const [summary, setSummary] = useState(null);
  const [delta, setDelta] = useState(null);
  const [portfolioClaims, setPortfolioClaims] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [summaryResult, deltaResult] = await Promise.all([portfolioEngineApi.getSummary(), portfolioEngineApi.getPerformanceDelta()]);
        if (!cancelled) {
          setSummary(summaryResult);
          setDelta(deltaResult);
          setError("");
          trackEvent("portfolio_workspace_viewed");
        }
      } catch (loadError) {
        logError("portfolio workspace summary load failed", loadError);
        if (!cancelled) setError(t("portfolioWorkspace.refreshFailed"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    claimsApi
      .listPortfolioRelevant()
      .then((result) => {
        if (!cancelled) setPortfolioClaims(result.claims || []);
      })
      .catch(() => {
        // Claims affecting the portfolio is additive — never a blocking error here.
        if (!cancelled) setPortfolioClaims([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase UI-INTEGRATION-001 — sort by portfolio impact, then confidence,
  // then urgency (real days-to-expiry; a claim with no real expiresAt is
  // honestly the least urgent, never guessed) — mission's required sort
  // order, applied over the one real fetch above, never recomputed.
  const daysUntilExpiry = (claim) => (claim.expiresAt ? (new Date(claim.expiresAt).getTime() - Date.now()) / 86400000 : Infinity);
  const sortedPortfolioClaims = useMemo(
    () =>
      [...(portfolioClaims || [])].sort((claimA, claimB) => {
        const impactA = claimA.portfolioImpact?.magnitude ?? 0;
        const impactB = claimB.portfolioImpact?.magnitude ?? 0;
        if (impactB !== impactA) return impactB - impactA;
        const confidenceA = claimA.confidence ?? -1;
        const confidenceB = claimB.confidence ?? -1;
        if (confidenceB !== confidenceA) return confidenceB - confidenceA;
        return daysUntilExpiry(claimA) - daysUntilExpiry(claimB);
      }),
    [portfolioClaims]
  );

  const positions = summary?.positions || [];
  const totalValue = summary?.totalValue || 0;
  const bySector = summary?.allocation?.bySector || [];

  const winners = useMemo(() => [...positions].filter((position) => (position.unrealizedPnl || 0) > 0).sort((positionA, positionB) => (positionB.unrealizedPnlPct || 0) - (positionA.unrealizedPnlPct || 0)).slice(0, 5), [positions]);
  const losers = useMemo(() => [...positions].filter((position) => (position.unrealizedPnl || 0) < 0).sort((positionA, positionB) => (positionA.unrealizedPnlPct || 0) - (positionB.unrealizedPnlPct || 0)).slice(0, 5), [positions]);
  const concentration = useMemo(() => computeConcentration(positions, totalValue), [positions, totalValue]);
  const sectorRisk = useMemo(() => computeSectorRisk(positions, bySector), [positions, bySector]);
  const distinctSectors = bySector.length;
  const cashWeightPct = totalValue > 0 ? ((summary?.cashBalance || 0) / totalValue) * 100 : null;

  if (isLoading && !summary) {
    return (
      <Page className="screen-page portfolio-workspace-screen" dir={dir}>
        <Container>
          <Stack gap={4} aria-busy="true" aria-label={t("portfolioWorkspace.loading")}>
            <Skeleton height={32} width="40%" />
            <Grid className="portfolio-workspace__grid">
              <Skeleton height={140} />
              <Skeleton height={140} />
            </Grid>
          </Stack>
        </Container>
      </Page>
    );
  }

  if (error && !summary) {
    return (
      <Page className="screen-page portfolio-workspace-screen" dir={dir}>
        <Container>
          <Alert tone="error">{error}</Alert>
          <p className="nova-heading-subtext">{t("portfolioWorkspace.noCachedFallback")}</p>
        </Container>
      </Page>
    );
  }

  if (!summary) {
    return (
      <Page className="screen-page portfolio-workspace-screen" dir={dir}>
        <Container>
          <p className="nova-heading-subtext">{t("portfolioWorkspace.nothingToShow")}</p>
        </Container>
      </Page>
    );
  }

  return (
    <Page className="screen-page portfolio-workspace-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-6)" }}>
          <span className="nova-heading-eyebrow">{t("portfolioWorkspace.eyebrow")}</span>
          <h1 className="nova-heading-h1">{t("portfolioWorkspace.title")}</h1>
          <p className="nova-heading-subtext">{t("portfolioWorkspace.subtitle")}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
        </Stack>

        {/* Phase PRODUCT-001 — Portfolio answers exactly one question:
            "How does this affect me?" Mission requires: what changed
            since yesterday, then why, then evidence, then potential
            scenarios — never recommendations first. These two sections
            come before everything else on the screen. */}
        <section aria-label={t("portfolioWorkspace.sections.whatChanged")}>
          <Card title={t("portfolioWorkspace.sections.whatChanged")}>
            {delta?.hasComparison && delta.changes?.length ? (
              <ul className="stack-list">
                {delta.changes.map((change) => (
                  <li key={change.dimension} className="nova-heading-subtext">
                    <strong>{change.label}</strong>: {change.beforeValue} → {change.afterValue}
                    {change.changePct !== null && change.changePct !== undefined ? ` (${change.changePct >= 0 ? "+" : ""}${change.changePct}%)` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="◇" title={delta?.summary || t("portfolioWorkspace.empty.whatChanged")} />
            )}
          </Card>
        </section>

        <section aria-label={t("portfolioWorkspace.sections.whyThisAffectsYou")}>
          <Card title={t("portfolioWorkspace.sections.whyThisAffectsYou")}>
            {portfolioClaims === null ? (
              <Skeleton height={60} />
            ) : sortedPortfolioClaims.length ? (
              <Stack gap={4}>
                {sortedPortfolioClaims.map((claim) => (
                  <Card key={claim.claimId} eyebrow={(claim.symbols || []).join(", ") || t("portfolioWorkspace.empty.whyThisAffectsYou")}>
                    <Stack gap={2}>
                      <Stack direction="horizontal" gap={2} wrap>
                        <Badge tone={claim.expectedDirection === "BULLISH" ? "positive" : claim.expectedDirection === "BEARISH" ? "negative" : "neutral"}>{claim.expectedDirection}</Badge>
                        {Number.isFinite(claim.confidence) ? <ConfidenceBadge score={claim.confidence} /> : null}
                        <Badge tone="neutral">{claim.status}</Badge>
                      </Stack>
                      <p className="nova-text-xs"><strong>{t("portfolioWorkspace.claims.why")}:</strong> {claim.plainLanguageStatement || claim.statement}</p>
                      <p className="nova-text-xs">
                        <strong>{t("portfolioWorkspace.claims.evidence")}:</strong>{" "}
                        {claim.evidence?.length ? claim.evidence.slice(0, 2).map((entry) => entry.observedFact).join(" ") : t("portfolioWorkspace.empty.whyThisAffectsYou")}
                      </p>
                      {claim.counterEvidence?.length ? (
                        <p className="nova-text-xs"><strong>{t("portfolioWorkspace.claims.counterEvidenceLabel")}:</strong> {claim.counterEvidence.slice(0, 2).map((entry) => entry.observedFact).join(" ")}</p>
                      ) : null}
                      <p className="nova-text-xs"><strong>{t("portfolioWorkspace.claims.potentialScenarios")}:</strong> {t("portfolioWorkspace.claims.scenarioPreview")}</p>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.whyThisAffectsYou")} />
            )}
          </Card>
        </section>

        {/* 1. Portfolio Health */}
        <section aria-label={t("portfolioWorkspace.sections.health")}>
          <Card title={t("portfolioWorkspace.sections.health")}>
            {positions.length || totalValue ? (
              <Grid className="portfolio-workspace__grid">
                <div style={{ gridColumn: "span 3" }}>
                  <Card eyebrow={t("portfolioWorkspace.health.totalValue")}><strong className="nova-text-lg">${totalValue.toLocaleString()}</strong></Card>
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <Card eyebrow={t("portfolioWorkspace.health.totalReturn")}>
                    <Badge tone={summary.totalReturnPct >= 0 ? "positive" : "negative"}><strong className="nova-text-lg">{summary.totalReturnPct?.toFixed(2)}%</strong></Badge>
                  </Card>
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <Card eyebrow={t("portfolioWorkspace.health.dailyPnl")}>
                    <Badge tone={summary.dailyPnl >= 0 ? "positive" : "negative"}><strong className="nova-text-lg">${summary.dailyPnl?.toLocaleString()}</strong></Badge>
                  </Card>
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <Card eyebrow={t("portfolioWorkspace.health.cash")}><strong className="nova-text-lg">${(summary.cashBalance || 0).toLocaleString()}</strong></Card>
                </div>
              </Grid>
            ) : (
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.health")} />
            )}
            {delta?.hasComparison ? (
              <p className="nova-heading-subtext">{delta.summary}</p>
            ) : delta ? (
              <p className="nova-heading-subtext">{t("portfolioWorkspace.health.noComparison")}</p>
            ) : null}
          </Card>
        </section>

        {/* 2. Portfolio Risk Map */}
        <section aria-label={t("portfolioWorkspace.sections.riskMap")}>
          <Card title={t("portfolioWorkspace.sections.riskMap")}>
            {sectorRisk.length ? (
              <Grid className="portfolio-workspace__grid">
                {sectorRisk.map((sector) => (
                  <div key={sector.name} style={{ gridColumn: "span 4" }}>
                    <Card eyebrow={sector.name}>
                      <Stack gap={2}>
                        <Badge tone={sector.tone}>{t("portfolioWorkspace.riskMap.weight", { pct: sector.pct?.toFixed(1) })}</Badge>
                        <span className="nova-text-xs">{t("portfolioWorkspace.riskMap.netUnrealized", { value: sector.netUnrealizedPnl.toLocaleString() })}</span>
                      </Stack>
                    </Card>
                  </div>
                ))}
              </Grid>
            ) : (
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.riskMap")} />
            )}
          </Card>
        </section>

        {/* 3. Concentration Analysis */}
        <section aria-label={t("portfolioWorkspace.sections.concentration")}>
          <Card title={t("portfolioWorkspace.sections.concentration")}>
            {concentration ? (
              <Stack gap={2}>
                <p className="nova-text-sm">{t("portfolioWorkspace.concentration.largest", { symbol: concentration.largestHolding.symbol, pct: (concentration.largestHolding.weight * 100).toFixed(1) })}</p>
                <Stack direction="horizontal" gap={2} wrap>
                  <Badge tone="neutral">{t("portfolioWorkspace.concentration.top1", { pct: (concentration.top1 * 100).toFixed(1) })}</Badge>
                  <Badge tone="neutral">{t("portfolioWorkspace.concentration.top3", { pct: (concentration.top3 * 100).toFixed(1) })}</Badge>
                  <Badge tone="neutral">{t("portfolioWorkspace.concentration.top5", { pct: (concentration.top5 * 100).toFixed(1) })}</Badge>
                  <Badge tone="neutral">{t("portfolioWorkspace.concentration.hhi", { value: concentration.hhi.toFixed(0) })}</Badge>
                </Stack>
                <p className="nova-text-xs">{t("portfolioWorkspace.concentration.methodology")}</p>
              </Stack>
            ) : (
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.concentration")} />
            )}
          </Card>
        </section>

        {/* 4. Diversification Score */}
        <section aria-label={t("portfolioWorkspace.sections.diversification")}>
          <Card title={t("portfolioWorkspace.sections.diversification")}>
            {positions.length ? (
              <Stack direction="horizontal" gap={2} wrap>
                <Badge tone="neutral">{t("portfolioWorkspace.diversification.holdings", { count: positions.length })}</Badge>
                <Badge tone="neutral">{t("portfolioWorkspace.diversification.sectors", { count: distinctSectors })}</Badge>
                {concentration ? <Badge tone={concentration.top1 > 0.4 ? "warning" : "neutral"}>{t("portfolioWorkspace.diversification.largestWeight", { pct: (concentration.top1 * 100).toFixed(1) })}</Badge> : null}
                <p className="nova-text-xs">{t("portfolioWorkspace.diversification.methodology")}</p>
              </Stack>
            ) : (
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.diversification")} />
            )}
          </Card>
        </section>

        {/* 5. Sector Allocation */}
        <section aria-label={t("portfolioWorkspace.sections.sectorAllocation")}>
          <Card title={t("portfolioWorkspace.sections.sectorAllocation")}>
            {bySector.length ? (
              <Table
                columns={[
                  { key: "name", label: t("portfolioWorkspace.sectorAllocation.sector") },
                  { key: "value", label: t("portfolioWorkspace.sectorAllocation.value"), align: "end" },
                  { key: "pct", label: t("portfolioWorkspace.sectorAllocation.weight"), align: "end" },
                ]}
                rows={bySector.map((sector) => ({ id: sector.name, name: sector.name, value: `$${(sector.value || 0).toLocaleString()}`, pct: `${(sector.pct || 0).toFixed(1)}%` }))}
              />
            ) : (
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.sectorAllocation")} />
            )}
          </Card>
        </section>

        <Grid className="portfolio-workspace__grid">
          {/* 6. Biggest Winners */}
          <div style={{ gridColumn: "span 6" }}>
            <section aria-label={t("portfolioWorkspace.sections.winners")}>
              <Card title={t("portfolioWorkspace.sections.winners")}>
                {winners.length ? (
                  <ul className="stack-list">
                    {winners.map((position) => (
                      <li key={position.id} className="nova-heading-subtext">
                        <strong>{position.symbol}</strong> <Badge tone="positive">+{position.unrealizedPnlPct?.toFixed(2)}%</Badge> (${position.unrealizedPnl?.toLocaleString()})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="◇" title={t("portfolioWorkspace.empty.winners")} />
                )}
              </Card>
            </section>
          </div>

          {/* 7. Biggest Losers */}
          <div style={{ gridColumn: "span 6" }}>
            <section aria-label={t("portfolioWorkspace.sections.losers")}>
              <Card title={t("portfolioWorkspace.sections.losers")}>
                {losers.length ? (
                  <ul className="stack-list">
                    {losers.map((position) => (
                      <li key={position.id} className="nova-heading-subtext">
                        <strong>{position.symbol}</strong> <Badge tone="negative">{position.unrealizedPnlPct?.toFixed(2)}%</Badge> (${position.unrealizedPnl?.toLocaleString()})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="◇" title={t("portfolioWorkspace.empty.losers")} />
                )}
              </Card>
            </section>
          </div>
        </Grid>

        {/* 9. Rebalance Suggestions */}
        <section aria-label={t("portfolioWorkspace.sections.rebalance")}>
          <Card title={t("portfolioWorkspace.sections.rebalance")}>
            {/* No rebalance-suggestion concept exists anywhere in the backend
                (grep-confirmed, X12C.3 research) — showing an honest
                not-available state here, never a fabricated suggestion. */}
            <EmptyState icon="◇" title={t("portfolioWorkspace.empty.rebalanceNotAvailable")} />
          </Card>
        </section>

        {/* 10. Cash Allocation */}
        <section aria-label={t("portfolioWorkspace.sections.cash")}>
          <Card title={t("portfolioWorkspace.sections.cash")}>
            {cashWeightPct !== null ? (
              <Stack direction="horizontal" gap={2} wrap>
                <Badge tone="neutral">{t("portfolioWorkspace.cash.balance", { value: (summary.cashBalance || 0).toLocaleString() })}</Badge>
                <Badge tone={cashWeightPct > 25 ? "warning" : "neutral"}>{t("portfolioWorkspace.cash.weight", { pct: cashWeightPct.toFixed(1) })}</Badge>
              </Stack>
            ) : (
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.cash")} />
            )}
          </Card>
        </section>
      </Container>
    </Page>
  );
}
