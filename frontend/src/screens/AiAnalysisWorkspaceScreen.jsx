import { useEffect, useState } from "react";
import { Page, Container, Section, Stack } from "../components/layout";
import { Card, Badge, MetricArc, EmptyState, Skeleton, HeroCard, DemoModeBanner, IntelligenceCard, AttentionLevelBadge } from "../components/nova";
import { useI18n } from "../i18n/I18nProvider";
import { claimsApi } from "../services/api";
import { withRequestCache } from "../services/requestCache";
import { usePlatformContext } from "../context/PlatformContext";
import { statusTone, statusPlainLabel, attentionLevel } from "../utils/claimPresentation";
import { selectTopClaim, buildClaimReasoningSections } from "../services/intelligenceEngine";
import { logError } from "../utils/errorHandling";
import { fallbackClaim, fallbackTransitions, fallbackStrongestEvidence } from "./aiAnalysisWorkspace/aiAnalysisWorkspaceMockData";

// Phase AI-ANALYSIS-001 — the platform's reasoning engine, not a
// chatbot. Given the one Claim currently in shared focus (PlatformContext's
// selectedSymbol, contributed by Mission Control/Portfolio Workspace/
// News Intelligence/Watchlist Workspace), this screen surfaces the full,
// real reasoning behind it:
//   What is happening? · Why does the platform believe it? ·
//   What evidence supports it? · What evidence contradicts it? ·
//   What could invalidate this thesis? · What should the user monitor next?
// Built entirely from the existing Design System (HeroCard,
// IntelligenceCard, MetricArc, AttentionLevelBadge, DemoModeBanner,
// EmptyState) and the shared claimPresentation.js logic — no new
// component, no new business logic reimplemented here.

const SECTION_LABELS = {
  reasoning: "Reasoning",
};

// Phase PLATFORM-INTELLIGENCE-001 — the reasoning breakdown itself now
// lives in the shared intelligenceEngine.js (`buildClaimReasoningSections`,
// the platform's one reasoning pipeline), not reimplemented inline here.
// `evidenceLimit: Infinity` preserves this screen's original behavior of
// showing every recorded piece of evidence — this "explain everything"
// Workspace is a deliberately different consumer than Portfolio
// Workspace's own top-2 evidence preview.
function buildReasoningSections(claim) {
  return buildClaimReasoningSections(claim, { evidenceLimit: Infinity });
}

export default function AiAnalysisWorkspaceScreen() {
  const { dir } = useI18n();
  const { selectedSymbol, selectClaim } = usePlatformContext();
  const [isLoading, setIsLoading] = useState(true);
  const [claim, setClaim] = useState(null);
  const [transitions, setTransitions] = useState([]);
  const [strongestEvidence, setStrongestEvidence] = useState(fallbackStrongestEvidence);
  const [liveSections, setLiveSections] = useState({ reasoning: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const connected = [];
      const unavailable = [];

      // Stage 1 — find the real Claim to analyze: the Claim most recently
      // in shared focus (by its real symbol) if one exists, otherwise the
      // single most active real Claim on the platform. Never a fabricated
      // subject.
      let subjectClaimId = null;
      let subjectAttentionScore = null;
      try {
        const subjectResult = selectedSymbol
          ? await withRequestCache(`claims:by-symbol:${selectedSymbol}`, () => claimsApi.listBySymbol(selectedSymbol, { limit: 5 }))
          : await withRequestCache("claims:active:top", () => claimsApi.listActive({ limit: 5 }));
        const candidates = subjectResult?.claims || [];
        const top = selectTopClaim(candidates);
        if (top) {
          subjectClaimId = top.claimId;
          subjectAttentionScore = top.attentionScore ?? null;
        }
        connected.push("Claims");
      } catch (error) {
        logError("ai analysis workspace subject claim load failed", error);
        unavailable.push("Claims");
      }

      if (cancelled) return;

      if (!subjectClaimId) {
        // An honest "nothing to analyze yet" — never the demo fallback,
        // since this is a real, empty result, not a fetch failure.
        setClaim(null);
        setTransitions([]);
        setLiveSections({ reasoning: unavailable.length === 0 });
        setIsLoading(false);
        console.info("[AiAnalysisWorkspace] service status", { connected, unavailable });
        return;
      }

      // Stage 2 — the full reasoning trace for that real Claim.
      const [historyResult, evidenceResult] = await Promise.allSettled([
        withRequestCache(`claims:history:${subjectClaimId}`, () => claimsApi.getHistory(subjectClaimId)),
        withRequestCache(`claims:strongest-evidence:${subjectClaimId}`, () => claimsApi.getStrongestEvidence(subjectClaimId)),
      ]);

      if (cancelled) return;

      if (historyResult.status === "fulfilled" && historyResult.value?.claim) {
        setClaim({ ...historyResult.value.claim, attentionScore: subjectAttentionScore });
        setTransitions(historyResult.value.transitions || []);
        connected.push("Claim History");
      } else {
        if (historyResult.status === "rejected") logError("ai analysis workspace claim history load failed", historyResult.reason);
        setClaim(fallbackClaim);
        setTransitions(fallbackTransitions);
        unavailable.push("Claim History");
      }

      if (evidenceResult.status === "fulfilled" && evidenceResult.value) {
        setStrongestEvidence(evidenceResult.value);
        connected.push("Strongest Evidence");
      } else {
        if (evidenceResult.status === "rejected") logError("ai analysis workspace strongest evidence load failed", evidenceResult.reason);
        setStrongestEvidence(fallbackStrongestEvidence);
        unavailable.push("Strongest Evidence");
      }

      const isLive = historyResult.status === "fulfilled" && !!historyResult.value?.claim && evidenceResult.status === "fulfilled" && unavailable.length === 0;
      setLiveSections({ reasoning: isLive });
      setIsLoading(false);
      console.info("[AiAnalysisWorkspace] service status", { connected, unavailable: [...new Set(unavailable)] });
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  useEffect(() => {
    if (!isLoading && claim) {
      selectClaim(claim);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, claim?.claimId]);

  if (isLoading) {
    return (
      <Page className="screen-page ai-analysis-workspace-screen" dir={dir}>
        <Container>
          <Stack gap={6} aria-busy="true" aria-label="Assembling the reasoning trace">
            <Skeleton height={180} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </Stack>
        </Container>
      </Page>
    );
  }

  return (
    <Page className="screen-page ai-analysis-workspace-screen" dir={dir}>
      <Container>
        <Stack gap={2} style={{ paddingBlockEnd: "var(--nova-space-4)" }}>
          <span className="nova-heading-eyebrow">AI Analysis Workspace</span>
          <h1 className="nova-heading-h1">The platform's reasoning, made explicit</h1>
          <p className="nova-heading-subtext">What the platform believes, why, what evidence supports and contradicts it, and what would prove it wrong.</p>
        </Stack>

        {claim ? <DemoModeBanner liveSections={liveSections} sectionLabels={SECTION_LABELS} /> : null}

        {!claim ? (
          <Section aria-label="Reasoning" className="mc-tier-1">
            <Card>
              <EmptyState
                icon="◇"
                title={
                  selectedSymbol
                    ? `No active Claim found for ${selectedSymbol} to analyze yet.`
                    : "No active Claim to analyze yet — select a symbol on another screen, or check back once the platform has formed a belief."
                }
              />
            </Card>
          </Section>
        ) : (
          <>
            {/* Tier 1 — the subject of this analysis */}
            <Section aria-label="Subject" className="mc-tier-1">
              <HeroCard eyebrow="Analyzing">
                <Stack direction="horizontal" gap={6} align="center" wrap>
                  <MetricArc score={claim.confidence} metric="confidence" size="lg" showValue />
                  <Stack gap={2} style={{ flex: 1, minInlineSize: 240 }}>
                    <h2 className="nova-heading-h1">{(claim.symbols || []).join(", ")}</h2>
                    <p className="nova-text-sm" style={{ color: "var(--nova-color-text-secondary)" }}>
                      {claim.plainLanguageStatement || claim.statement}
                    </p>
                    <Stack direction="horizontal" gap={2} wrap>
                      <Badge tone={claim.expectedDirection === "BULLISH" ? "positive" : claim.expectedDirection === "BEARISH" ? "negative" : "neutral"}>
                        {claim.expectedDirection}
                      </Badge>
                      <Badge tone={statusTone(claim.status)}>{statusPlainLabel(claim.status)}</Badge>
                      {Number.isFinite(claim.attentionScore) ? <AttentionLevelBadge level={attentionLevel(claim.attentionScore)} /> : null}
                    </Stack>
                  </Stack>
                </Stack>
              </HeroCard>
            </Section>

            {/* Tier 2 — the full reasoning trace */}
            <Section aria-label="Reasoning" className="mc-tier-2">
              <IntelligenceCard
                eyebrow={(claim.symbols || []).join(", ")}
                claim={claim}
                showProbability
                sections={buildReasoningSections(claim)}
              />
            </Section>

            {/* Tier 3 — the strongest individual evidence + real status history */}
            <Section aria-label="Context" className="mc-tier-3">
              <Card title="Strongest Supporting Evidence">
                {strongestEvidence.strongestSupporting?.length ? (
                  <ul className="stack-list">
                    {strongestEvidence.strongestSupporting.map((entry) => (
                      <li key={entry.id} className="nova-text-sm">
                        {entry.observedFact}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="◇" title="No supporting evidence recorded yet." />
                )}
              </Card>

              <Card title="Strongest Contradicting Evidence">
                {strongestEvidence.strongestContradicting?.length ? (
                  <ul className="stack-list">
                    {strongestEvidence.strongestContradicting.map((entry) => (
                      <li key={entry.id} className="nova-text-sm">
                        {entry.observedFact}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="◇" title="No contradicting evidence recorded — this thesis is currently uncontested." />
                )}
              </Card>

              <Card title="Status History">
                {transitions.length ? (
                  <ul className="stack-list">
                    {transitions.map((transition) => (
                      <li key={transition.id}>
                        <Stack direction="horizontal" gap={2} align="center" wrap>
                          <Badge tone={statusTone(transition.toStatus)}>{statusPlainLabel(transition.toStatus)}</Badge>
                        </Stack>
                        <p className="nova-text-xs" style={{ color: "var(--nova-color-text-secondary)" }}>
                          {transition.reason || "No detailed reason recorded for this transition."}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="◇" title="No status transitions recorded for this Claim yet." />
                )}
              </Card>
            </Section>
          </>
        )}
      </Container>
    </Page>
  );
}
