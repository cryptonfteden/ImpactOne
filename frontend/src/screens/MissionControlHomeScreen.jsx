import { useEffect, useState } from "react";
import { Page, Container, Section, Grid, Stack } from "../components/layout";
import { Card, Badge, MetricArc, EmptyState, Skeleton, Button, InlineMessage } from "../components/nova";
import { useI18n } from "../i18n/I18nProvider";
import {
  todaysBrief,
  portfolioIntelligence,
  biggestRisk,
  bestOpportunity,
  claimsChanging,
  marketPulse,
  liveIntelligenceCount,
  sessionSummary,
  isDemoData,
} from "./missionControl/missionControlMockData";

// Phase MISSION-CONTROL-001 — the first production-quality implementation
// of IMPACTONE_DESIGN_BIBLE.md and MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md.
// This screen deliberately uses deterministic mock data (see
// missionControlMockData.js) rather than live API calls — per this
// phase's explicit mission, the goal is validating the experience itself,
// not re-wiring backend integration (already real and tested in prior
// phases; this file is the visual/UX foundation the next phase reconnects
// to that real data). No backend was touched, and no new business logic
// exists here: every derived value below is a plain, presentation-only
// read of the mock fixtures.
//
// Structure follows the masterplan's three tiers exactly:
//   Tier 1 — The Brief (hero + Today's Brief)
//   Tier 2 — Your Signals (Portfolio Intelligence, Biggest Risk, Best Opportunity)
//   Tier 3 — Context (Claims Changing, Market Pulse, Live Intelligence, Session Summary)
// Only three distinct visual/motion treatments exist across the whole
// screen — see components.css's `.mc-tier-1/2/3` rules — never a fourth,
// per-section-specific rule.
//
// Phase MISSION-CONTROL-002 — release-readiness pass. Two fixes of note:
// (1) Confidence, Probability, and Attention are three independent
// metrics (see MetricArc.jsx) — every MetricArc instance below now
// states its `metric` explicitly (Today's Brief/hero use "attention";
// Biggest Risk/Best Opportunity/Market Pulse use "confidence"), and the
// visible "Attention: {level}" badge wording is now consistent between
// the hero and every other Brief row, never a bare, unlabeled level.
// (2) This screen still runs entirely on deterministic demo data
// (`isDemoData`, from missionControlMockData.js) — a persistent, quiet
// Demo Mode indicator now discloses this at the top of the screen so no
// user can mistake simulated values for a live read of their real
// portfolio.

const INITIAL_LOAD_DELAY_MS = 300;
const BRIEF_COLLAPSED_COUNT = 3;
const STAGGER_STEP_MS = 60;

function attentionLevelTone(level) {
  if (level === "High") return "warning";
  if (level === "Medium") return "info";
  return "neutral";
}

function directionTone(direction) {
  if (direction === "BULLISH") return "positive";
  if (direction === "BEARISH") return "negative";
  return "neutral";
}

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

/**
 * Tier 1 — the hero Brief item. The single unmistakable visual starting
 * point on the screen (masterplan §3.1): largest scale, the one place
 * the Emphasis surface material + the one-time entrance pulse are used.
 */
function HeroBriefItem({ item }) {
  const [pulsing, setPulsing] = useState(true);

  return (
    <Card
      className={`mc-hero${pulsing ? " mc-hero--enter" : ""}`}
      onAnimationEnd={() => setPulsing(false)}
      eyebrow="Top Priority"
    >
      <Stack direction="horizontal" gap={6} align="center" wrap>
        <MetricArc score={item.attentionScore} metric="attention" size="lg" />
        <Stack gap={2} style={{ flex: 1, minInlineSize: 240 }}>
          <h2 className="nova-heading-h1">{item.headline}</h2>
          <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
            {item.whyItMatters}
          </p>
          <Stack direction="horizontal" gap={2} wrap>
            <Badge tone={attentionLevelTone(item.recommendedAttentionLevel)}>Attention: {item.recommendedAttentionLevel}</Badge>
            {item.affectedAssets?.length ? <Badge tone="neutral">{item.affectedAssets.join(", ")}</Badge> : null}
          </Stack>
        </Stack>
      </Stack>
    </Card>
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
      <Badge tone={attentionLevelTone(item.recommendedAttentionLevel)}>Attention: {item.recommendedAttentionLevel}</Badge>
    </button>
  );
}

/**
 * Tier 2 — one half of the paired Biggest Risk / Best Opportunity
 * signals. Deliberately identical structure for both halves (the
 * masterplan's one documented exception to "nothing is equal").
 *
 * Phase MISSION-CONTROL-002 — an independent implementation review
 * (MISSION_CONTROL_UI_GAPS.md, H1) found "Show more" was functionally
 * inert here: Card's generic `expandable` prop only toggles a height
 * clip around identical children, so on content short enough to already
 * fit collapsed, expanding changed nothing visible — confirmed live.
 * Fixed by managing expand state locally (same pattern as BriefRow
 * below) and only rendering `claim.portfolioImpact` — real data the mock
 * fixtures already carry, previously rendered nowhere at all — once
 * expanded, so the affordance always has real, additional content to
 * reveal, matching the masterplan's "expanded state adds real portfolio
 * impact magnitude" spec.
 */
function SignalCard({ title, claim }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card title={title}>
      <Stack gap={3}>
        <Stack direction="horizontal" gap={2} wrap align="center">
          <Stack gap={1} align="center">
            <MetricArc score={claim.confidence} metric="confidence" size="sm" showValue />
            <span className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
              Confidence
            </span>
          </Stack>
          <Badge tone={directionTone(claim.expectedDirection)}>{claim.expectedDirection}</Badge>
          <Badge tone="neutral">{(claim.symbols || []).join(", ")}</Badge>
        </Stack>
        <p className="nova-text-sm">{claim.plainLanguageStatement}</p>
        {claim.evidence?.length ? (
          <p className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
            {claim.evidence[0].observedFact}
          </p>
        ) : null}
        {expanded && claim.portfolioImpact ? (
          <p className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
            Portfolio impact: {claim.portfolioImpact.magnitude}/100 ({claim.portfolioImpact.direction})
          </p>
        ) : null}
        <Button variant="ghost" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Show less" : "Show more"}
        </Button>
      </Stack>
    </Card>
  );
}

export default function MissionControlHomeScreen({ onNavigate }) {
  const { dir } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [briefExpanded, setBriefExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), INITIAL_LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const [hero, ...restOfBrief] = todaysBrief;
  const visibleBriefRows = briefExpanded ? restOfBrief : restOfBrief.slice(0, BRIEF_COLLAPSED_COUNT - 1);
  const hiddenBriefCount = restOfBrief.length - visibleBriefRows.length;

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

        {/* Phase MISSION-CONTROL-002 — Demo Mode indicator. Quiet and
            persistent (not a dismissible toast) for as long as
            isDemoData is true, so a user can never mistake this
            screen's simulated values for a live read of their real
            portfolio. Informative, not alarming: an InlineMessage, the
            smallest/quietest real notification treatment this library
            has, placed once at the top rather than repeated per card. */}
        {isDemoData ? (
          <div style={{ marginBlockEnd: "var(--nova-space-6)" }} role="status" aria-label="Demo mode: showing simulated intelligence, not live data.">
            <InlineMessage tone="info">
              <strong>Demo</strong> — every value on this screen is simulated for demonstration. It does not reflect your real portfolio or live
              market data.
            </InlineMessage>
          </div>
        ) : null}

        {/* Tier 1 — The Brief */}
        <Section aria-label="Today's Brief" className="mc-tier-1">
          <HeroBriefItem item={hero} />

          {visibleBriefRows.length ? (
            <Card>
              <Stack gap={1}>
                {visibleBriefRows.map((item, index) => (
                  <BriefRow key={item.claimId} item={item} index={index} />
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
        </Section>

        {/* Tier 2 — Your Signals */}
        <Section aria-label="Your Signals" className="mc-tier-2">
          <Card title="Portfolio Intelligence" expandable>
            <Stack gap={3}>
              {portfolioIntelligence.hasComparison ? (
                <>
                  <Stack direction="horizontal" gap={4} wrap align="center">
                    <div>
                      <span className="nova-heading-eyebrow">Total value</span>
                      <div className="nova-text-lg" style={{ fontWeight: "var(--nova-font-weight-semibold)" }}>
                        ${portfolioIntelligence.totalValue.toLocaleString()}
                      </div>
                    </div>
                    <Badge tone={portfolioIntelligence.valueChangePct >= 0 ? "positive" : "negative"}>
                      {portfolioIntelligence.valueChangePct >= 0 ? "+" : ""}
                      {portfolioIntelligence.valueChangePct}% since yesterday
                    </Badge>
                    <Badge tone="neutral">{portfolioIntelligence.claimsAffectingPortfolio} claims affecting your portfolio</Badge>
                  </Stack>
                  <ul className="stack-list">
                    {portfolioIntelligence.changes.map((change) => (
                      <li key={change.dimension} className="nova-text-sm">
                        <strong>{change.label}</strong>: {change.beforeValue.toLocaleString()} → {change.afterValue.toLocaleString()}
                        {change.changePct !== null ? ` (${change.changePct >= 0 ? "+" : ""}${change.changePct}%)` : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
                    Top affected holdings: {portfolioIntelligence.topAffectedHoldings.join(", ")}
                  </p>
                </>
              ) : (
                <EmptyState icon="◇" title="No prior-day snapshot yet — this is the first day being tracked." />
              )}
            </Stack>
          </Card>

          <div className="mc-signal-pair">
            <SignalCard title="Biggest Risk" claim={biggestRisk} />
            <SignalCard title="Best Opportunity" claim={bestOpportunity} />
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
              {liveIntelligenceCount} more items in today's feed
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
