import { useEffect, useMemo, useState } from "react";
import { Page, Container, Section, Grid, Stack } from "../components/layout";
import { Card, Badge, MetricArc, Table, EmptyState, Skeleton, HeroCard, DemoModeBanner, IntelligenceCard } from "../components/nova";
import { portfolioEngineApi, claimsApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { useI18n } from "../i18n/I18nProvider";
import { trackEvent } from "../utils/analytics";
import { fallbackSummary, fallbackDelta, fallbackPortfolioClaims } from "./portfolioWorkspace/portfolioWorkspaceMockData";

/**
 * Phase X12C.3 — Portfolio Intelligence Workspace, built on real
 * portfolio-engine + Claim Intelligence Layer data.
 *
 * Phase PORTFOLIO-001 — rebuilt on Mission Control's exact architecture
 * (IMPACTONE_DESIGN_BIBLE.md, MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md):
 * three tiers, the shared MetricArc primitive (with Confidence,
 * Probability, and Attention always kept as three separate, explicitly-
 * labeled metrics — never conflated, per MISSION-CONTROL-002's fix), and
 * per-section Demo Mode fallback with the same fault-isolation and
 * service-status logging pattern as Mission Control (LIVE-DATA-001). No
 * new backend service was built — every section reuses an already-real,
 * already-tested call (portfolioEngineApi.getSummary/getPerformanceDelta,
 * claimsApi.listPortfolioRelevant).
 *
 *   Tier 1 — The Brief: a hero card ("How am I doing?" + the single most
 *     attention-worthy real claim affecting the portfolio, i.e. "why"),
 *     followed by the real "what changed since yesterday" list.
 *   Tier 2 — Your Positions: which real positions need attention
 *     (ranked by the real, already-scored Attention Engine value of the
 *     claims touching each symbol — a presentation-only max(), never a
 *     new score), followed by the full "Why This Affects You" claim
 *     detail (why/evidence/counter-evidence), each claim showing its
 *     real Confidence and, when present, real Probability via MetricArc.
 *   Tier 3 — Context: risk map, concentration, diversification, sector
 *     allocation, winners/losers, rebalance (honest not-available), cash
 *     — supporting detail, unchanged in substance from the prior build.
 *
 * Phase DESIGN-SYSTEM-001 — the hero, Demo Mode banner, and per-claim
 * cards below are now the shared HeroCard/DemoModeBanner/IntelligenceCard
 * components (extracted from this screen and MissionControlHomeScreen.jsx's
 * near-identical duplicates) — see DESIGN_SYSTEM.md. No visual change.
 *
 * Concentration, diversification, and per-sector risk still have no
 * dedicated backend field (X12C.3 research stands) and are computed here
 * with the same standard, transparent arithmetic as before (weight =
 * real marketValue / real totalValue; HHI = sum of squared real
 * weights) — see PORTFOLIO_WORKSPACE.md. Rebalance Suggestions has no
 * backing concept anywhere in the backend and is shown as an honest
 * "not available" state, never fabricated.
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

const SECTION_LABELS = {
  overview: "Portfolio Health & What Changed",
  claims: "Claims Affecting Your Portfolio",
};

export default function PortfolioWorkspaceScreen() {
  const { t, dir } = useI18n();
  const [summary, setSummary] = useState(null);
  const [delta, setDelta] = useState(null);
  const [portfolioClaims, setPortfolioClaims] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Phase PORTFOLIO-001 — per-section liveness, same pattern as Mission
  // Control: Demo Mode is computed per section, never as a single global
  // flag, so a partial outage is disclosed accurately instead of either
  // hidden or overstated.
  const [liveSections, setLiveSections] = useState({ overview: true, claims: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const [summaryResult, deltaResult, claimsResult] = await Promise.allSettled([
        portfolioEngineApi.getSummary(),
        portfolioEngineApi.getPerformanceDelta(),
        claimsApi.listPortfolioRelevant(),
      ]);
      if (cancelled) return;

      const nextLive = {};
      const connected = [];
      const unavailable = [];

      if (summaryResult.status === "fulfilled" && deltaResult.status === "fulfilled") {
        setSummary(summaryResult.value);
        setDelta(deltaResult.value);
        nextLive.overview = true;
        connected.push("Portfolio Intelligence");
      } else {
        if (summaryResult.status === "rejected") logError("portfolio workspace summary load failed", summaryResult.reason);
        if (deltaResult.status === "rejected") logError("portfolio workspace delta load failed", deltaResult.reason);
        setSummary(fallbackSummary);
        setDelta(fallbackDelta);
        nextLive.overview = false;
        unavailable.push("Portfolio Intelligence");
      }

      if (claimsResult.status === "fulfilled") {
        setPortfolioClaims(claimsResult.value?.claims || []);
        nextLive.claims = true;
        connected.push("Claims");
      } else {
        logError("portfolio workspace claims load failed", claimsResult.reason);
        setPortfolioClaims(fallbackPortfolioClaims);
        nextLive.claims = false;
        unavailable.push("Claims");
      }

      setLiveSections(nextLive);
      setIsLoading(false);
      trackEvent("portfolio_workspace_viewed");
      // Phase PORTFOLIO-001 — required: log which services connected and
      // which remain unavailable, every load.
      console.info("[PortfolioWorkspace] service status", { connected, unavailable });
    }

    load();
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

  // Phase PORTFOLIO-001 — "Which positions need attention?" A
  // presentation-only max() of each position's own real Attention
  // Engine scores (already attached server-side to every Claim) among
  // the Claims that actually name its symbol — never a new score. A
  // position with no Claims touching it honestly shows "No claims
  // affecting this position" rather than a fabricated score.
  const positionAttention = useMemo(() => {
    const claims = portfolioClaims || [];
    return [...positions]
      .map((position) => {
        const claimsForSymbol = claims.filter((claim) => claim.symbols?.includes(position.symbol));
        const attentionScore = claimsForSymbol.length ? claimsForSymbol.reduce((max, claim) => Math.max(max, claim.attentionScore ?? 0), 0) : null;
        return { ...position, attentionScore };
      })
      .sort((a, b) => (b.attentionScore ?? -1) - (a.attentionScore ?? -1));
  }, [positions, portfolioClaims]);

  // Phase PORTFOLIO-001 — the Tier 1 hero: "how am I doing" (real total
  // value/return) paired with "why" (the single highest-Attention-Score
  // real claim affecting the portfolio, if one exists). Mirrors Mission
  // Control's hero exactly — largest scale, one-time entrance pulse, the
  // only object using the Emphasis surface material.
  const heroClaim = sortedPortfolioClaims[0] || null;

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

  return (
    <Page className="screen-page portfolio-workspace-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-4)" }}>
          <span className="nova-heading-eyebrow">{t("portfolioWorkspace.eyebrow")}</span>
          <h1 className="nova-heading-h1">{t("portfolioWorkspace.title")}</h1>
          <p className="nova-heading-subtext">{t("portfolioWorkspace.subtitle")}</p>
        </Stack>

        {/* Phase PORTFOLIO-001 — Demo Mode indicator, same pattern as
            Mission Control: absent entirely once every section is live,
            accurate and section-specific when only some fell back.
            Phase DESIGN-SYSTEM-001 — now the shared DemoModeBanner. */}
        <DemoModeBanner liveSections={liveSections} sectionLabels={SECTION_LABELS} />

        {/* Tier 1 — The Brief: "How am I doing?" + "Why?" */}
        <Section aria-label="Portfolio Brief" className="mc-tier-1">
          <HeroCard eyebrow="How am I doing?">
            <Stack direction="horizontal" gap={6} align="center" wrap>
              {heroClaim ? <MetricArc score={heroClaim.attentionScore} metric="attention" size="lg" /> : null}
              <Stack gap={2} style={{ flex: 1, minInlineSize: 240 }}>
                <h2 className="nova-heading-h1">${totalValue.toLocaleString()}</h2>
                <Stack direction="horizontal" gap={2} wrap>
                  {summary?.totalReturnPct !== undefined ? (
                    <Badge tone={summary.totalReturnPct >= 0 ? "positive" : "negative"}>{summary.totalReturnPct?.toFixed(2)}% total return</Badge>
                  ) : null}
                  {delta?.hasComparison ? (
                    <Badge tone={delta.valueChangePct >= 0 ? "positive" : "negative"}>
                      {delta.valueChangePct >= 0 ? "+" : ""}
                      {delta.valueChangePct}% since yesterday
                    </Badge>
                  ) : null}
                </Stack>
                {heroClaim ? (
                  <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
                    {heroClaim.plainLanguageStatement || heroClaim.statement}
                  </p>
                ) : (
                  <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
                    No active Claims currently explain your portfolio's performance.
                  </p>
                )}
              </Stack>
            </Stack>
          </HeroCard>

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
        </Section>

        {/* Tier 2 — Your Positions: "Which positions need attention?" + "Why?" */}
        <Section aria-label="Your Positions" className="mc-tier-2">
          <Card title="Which Positions Need Attention">
            {positionAttention.length ? (
              <ul className="stack-list">
                {positionAttention.map((position) => (
                  <li key={position.id} style={{ display: "flex", alignItems: "center", gap: "var(--nova-space-4)" }}>
                    {position.attentionScore !== null ? (
                      <MetricArc score={position.attentionScore} metric="attention" size="sm" showValue />
                    ) : (
                      <span className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
                        —
                      </span>
                    )}
                    <strong className="nova-text-sm">{position.symbol}</strong>
                    <Badge tone={(position.unrealizedPnl || 0) >= 0 ? "positive" : "negative"}>{(position.unrealizedPnlPct || 0).toFixed(2)}%</Badge>
                    <span className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
                      {position.attentionScore !== null ? "Claims affect this position" : "No claims affecting this position"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="◇" title="No open positions yet — nothing to rank for attention." />
            )}
          </Card>

          <Card title={t("portfolioWorkspace.sections.whyThisAffectsYou")}>
            {portfolioClaims === null ? (
              <Skeleton height={60} />
            ) : sortedPortfolioClaims.length ? (
              <Stack gap={4}>
                {sortedPortfolioClaims.map((claim) => {
                  const sections = [
                    { label: t("portfolioWorkspace.claims.why"), content: claim.plainLanguageStatement || claim.statement },
                    {
                      label: t("portfolioWorkspace.claims.evidence"),
                      content: claim.evidence?.length ? claim.evidence.slice(0, 2).map((entry) => entry.observedFact).join(" ") : t("portfolioWorkspace.empty.whyThisAffectsYou"),
                    },
                  ];
                  if (claim.counterEvidence?.length) {
                    sections.push({ label: t("portfolioWorkspace.claims.counterEvidenceLabel"), content: claim.counterEvidence.slice(0, 2).map((entry) => entry.observedFact).join(" ") });
                  }
                  sections.push({ label: t("portfolioWorkspace.claims.potentialScenarios"), content: t("portfolioWorkspace.claims.scenarioPreview") });

                  return (
                    <IntelligenceCard
                      key={claim.claimId}
                      eyebrow={(claim.symbols || []).join(", ") || t("portfolioWorkspace.empty.whyThisAffectsYou")}
                      claim={claim}
                      showProbability
                      showStatusBadge
                      sections={sections}
                    />
                  );
                })}
              </Stack>
            ) : (
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.whyThisAffectsYou")} />
            )}
          </Card>
        </Section>

        {/* Tier 3 — Context: supporting detail, unchanged in substance */}
        <Section aria-label="Context" className="mc-tier-3">
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

          <section aria-label={t("portfolioWorkspace.sections.rebalance")}>
            <Card title={t("portfolioWorkspace.sections.rebalance")}>
              <EmptyState icon="◇" title={t("portfolioWorkspace.empty.rebalanceNotAvailable")} />
            </Card>
          </section>

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
        </Section>
      </Container>
    </Page>
  );
}
