import { useEffect, useState } from "react";
import { Button } from "../ui";
import ScenarioComparison from "./ScenarioComparison";
import QualityScoreBreakdown from "./QualityScoreBreakdown";
import { recommendationsApi } from "../../services/api";
import { logError } from "../../utils/errorHandling";

const ACTION_PILL_CLASS = {
  BUY: "pill opportunity",
  REDUCE: "pill monitor",
  EXIT: "pill risk",
};

const ACTION_LABEL = {
  BUY: "Buy",
  REDUCE: "Reduce",
  EXIT: "Exit",
};

const SYMBOL_SOURCE_LABEL = {
  portfolio: "From your portfolio",
  watchlist: "On your watchlist",
  "market-scan": "Market scan",
};

function qualityPillClass(score) {
  if (!Number.isFinite(score)) return "pill";
  if (score >= 75) return "pill opportunity";
  if (score >= 50) return "pill";
  return "pill risk";
}

function formatTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

// Sprint 25 — "what changed" derived from real, already-fetched history
// entries (never invented): compares each entry to the one before it and
// states only the concrete difference, or nothing when there isn't one.
//
// Sprint 27 Priority 2 — widened from action/status-only to a genuine
// timeline: what changed, why (the new evidence/reasoning behind it), and
// which belief moved (confidence delta). Every fact below comes from
// fields the list endpoint already returns on each Recommendation row
// (action, status, confidenceScore, evidence, reasoning) — no fabricated
// "thesis changed" label unless the reasoning text itself actually differs.
function describeChange(current, previous) {
  if (!previous) return null;
  const changes = [];

  if (current.action !== previous.action) {
    changes.push(`action changed from ${ACTION_LABEL[previous.action] || previous.action} to ${ACTION_LABEL[current.action] || current.action}`);
  }
  if (current.status !== previous.status) {
    changes.push(`status changed from ${previous.status} to ${current.status}`);
  }

  const currentConfidence = Number(current.confidenceScore);
  const previousConfidence = Number(previous.confidenceScore);
  if (Number.isFinite(currentConfidence) && Number.isFinite(previousConfidence) && currentConfidence !== previousConfidence) {
    const delta = currentConfidence - previousConfidence;
    changes.push(`confidence ${delta > 0 ? "rose" : "fell"} from ${previousConfidence} to ${currentConfidence}`);
  }

  if (!changes.length) return null;

  const newHeadlines = new Set((current.evidence?.matchedEvents || []).map((event) => event.headline).filter(Boolean));
  const previousHeadlines = new Set((previous.evidence?.matchedEvents || []).map((event) => event.headline).filter(Boolean));
  const newEvidence = [...newHeadlines].filter((headline) => !previousHeadlines.has(headline));

  const thesisChanged = Boolean(current.reasoning && previous.reasoning && current.reasoning !== previous.reasoning);

  let sentence = changes.join("; ") + ".";
  if (newEvidence.length) {
    sentence += ` New evidence: ${newEvidence.slice(0, 2).join("; ")}.`;
  }
  if (thesisChanged) {
    sentence += ` Thesis: ${current.reasoning}`;
  }
  return sentence;
}

/**
 * Sprint 16 Phase D — a recommendation the user can understand
 * immediately (symbol, action, provenance, quality, thesis), then
 * challenge: full supporting/opposing evidence, key risks, what would
 * invalidate it, exact portfolio exposure, a bull/base/bear comparison,
 * and timestamped, sourced citations. Advisory only — no place-order
 * control anywhere on this card.
 */
export default function RecommendationCard({ recommendation, isExpanded, onToggleExpand }) {
  const matchedEvents = recommendation.evidence?.matchedEvents || [];
  const symbolSource = recommendation.evidence?.symbolSource;
  const explanation = recommendation.explanation || {};
  const qualityScore = Number.isFinite(Number(recommendation.qualityScore)) ? Number(recommendation.qualityScore) : null;
  const affectedPositions = explanation.affectedPositions || [];

  const [decisionTrace, setDecisionTrace] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!isExpanded) return;
    let cancelled = false;

    Promise.resolve()
      .then(() => recommendationsApi.getDecisionTrace(recommendation.id))
      .then((trace) => {
        if (!cancelled && trace) setDecisionTrace(trace);
      })
      .catch((error) => logError("decision trace load failed", error));

    Promise.resolve()
      .then(() => recommendationsApi.list({ symbol: recommendation.symbol }))
      .then((data) => {
        if (!cancelled) setHistory(((data && data.recommendations) || []).filter((item) => item.id !== recommendation.id));
      })
      .catch((error) => logError("recommendation history load failed", error));

    return () => {
      cancelled = true;
    };
  }, [isExpanded, recommendation.id, recommendation.symbol]);

  const uncertainty = decisionTrace?.confidenceCalculation?.uncertainty;

  // Sprint 27 Priority 2 — the engine re-runs on a fixed cadence even when
  // nothing about a recommendation actually changed, so raw history is
  // mostly identical re-runs. A timeline should show evolution, not every
  // tick: keep only the oldest entry (as a "first tracked version" baseline)
  // and entries where describeChange found a real difference from the one
  // before it, then show the most recent ones so the freshest changes are
  // visible without scrolling an unbounded list.
  const sortedHistory = history.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const timelineEntries = sortedHistory
    .map((item, index) => ({ item, change: describeChange(item, sortedHistory[index - 1]), isBaseline: index === 0 }))
    .filter(({ change, isBaseline }) => change || isBaseline)
    .slice(-8);

  return (
    <article className="opportunity-item">
      <div className="opportunity-item__top">
        <strong>{recommendation.symbol}</strong>
        <span className={ACTION_PILL_CLASS[recommendation.action] || "pill"}>
          {ACTION_LABEL[recommendation.action] || recommendation.action}
        </span>
      </div>

      <div className="opportunity-item__actions">
        {symbolSource ? <span className="pill">{SYMBOL_SOURCE_LABEL[symbolSource] || symbolSource}</span> : null}
        {qualityScore !== null ? <span className={qualityPillClass(qualityScore)}>Quality {qualityScore}/100</span> : null}
      </div>

      <p className="company-description subtle">
        Confidence {Number(recommendation.confidenceScore)}/100
        {Number.isFinite(uncertainty) ? ` · Uncertainty ${uncertainty}/100` : ""} · Risk {recommendation.riskLabel}
      </p>
      <p className="company-description subtle">
        Upside {recommendation.expectedUpside} · Downside {recommendation.expectedDownside}
      </p>
      <p className="company-description subtle">Suggested size: {recommendation.positionSizeSuggestion} · Horizon: {recommendation.timeHorizon || "—"}</p>

      {explanation.thesis ? <p className="company-description">{explanation.thesis}</p> : null}

      {isExpanded ? (
        <>
          <p className="company-description subtle">{recommendation.reasoning}</p>

          <div className="explanation-section">
            <p className="explanation-section__title">Why now</p>
            <p className="company-description subtle">
              Generated {formatTimestamp(recommendation.createdAt) || "recently"}, timed to the stated {recommendation.timeHorizon || explanation.timeHorizon || "horizon"} —
              not a standing view, a specific call at this moment based on the evidence above.
            </p>
          </div>

          {affectedPositions.length ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Portfolio exposure</p>
              {affectedPositions.map((position) => (
                <p key={position.symbol} className="company-description subtle">
                  {position.quantity} shares · ${Number(position.marketValue).toLocaleString()} · {position.weightPct}% of portfolio ({position.sector})
                </p>
              ))}
            </div>
          ) : null}

          {explanation.supportingEvidence?.length ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Supporting evidence</p>
              {explanation.supportingEvidence.map((item, index) => (
                <p key={`support-${index}`} className="company-description subtle">{item.headline} — {item.whyItMatters}</p>
              ))}
            </div>
          ) : null}

          {explanation.opposingEvidence?.length ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Opposing evidence</p>
              {explanation.opposingEvidence.map((item, index) => (
                <div key={`oppose-${index}`} className="evidence-line">
                  <p className="company-description subtle">{item.headline} — {item.whyItMatters}</p>
                  {item.counterarguments?.length ? (
                    <p className="company-description subtle">Counterargument: {item.counterarguments.join("; ")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {explanation.keyRisks?.length ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Key risks</p>
              <p className="company-description subtle">{explanation.keyRisks.join("; ")}</p>
            </div>
          ) : null}

          {explanation.invalidationConditions?.length ? (
            <div className="explanation-section">
              <p className="explanation-section__title">This would prove it wrong</p>
              <p className="company-description subtle">{explanation.invalidationConditions.join("; ")}</p>
            </div>
          ) : null}

          {(explanation.confidenceDrivers?.length || explanation.confidenceReducers?.length) ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Confidence drivers / reducers</p>
              {explanation.confidenceDrivers?.map((item, index) => (
                <p key={`driver-${index}`} className="company-description subtle positive">+ {item}</p>
              ))}
              {explanation.confidenceReducers?.map((item, index) => (
                <p key={`reducer-${index}`} className="company-description subtle negative">- {item}</p>
              ))}
            </div>
          ) : null}

          {recommendation.scenarios?.length ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Bull / base / bear</p>
              <ScenarioComparison scenarios={recommendation.scenarios} />
            </div>
          ) : null}

          {recommendation.qualityComponents ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Quality score breakdown</p>
              <QualityScoreBreakdown qualityComponents={recommendation.qualityComponents} />
            </div>
          ) : null}

          {explanation.committeeDebate ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Committee debate</p>
              <p className="company-description subtle">
                Consensus {explanation.committeeDebate.consensusLevel ?? 0}% · Disagreement {explanation.committeeDebate.disagreementLevel ?? 0}%
              </p>
              {(explanation.committeeDebate.expertVotes || []).map((vote) => (
                <p key={vote.agent} className="company-description subtle">
                  {vote.agent}: {vote.vote} ({vote.confidence}/100)
                </p>
              ))}
            </div>
          ) : null}

          {timelineEntries.length ? (
            <div className="explanation-section">
              <p className="explanation-section__title">What changed</p>
              {timelineEntries.map(({ item, change, isBaseline }) => (
                <p key={item.id} className="company-description subtle">
                  {formatTimestamp(item.createdAt)} — {ACTION_LABEL[item.action] || item.action} ({item.status})
                  {isBaseline ? " — first tracked version." : ""}
                  {change ? ` — ${change}` : ""}
                </p>
              ))}
            </div>
          ) : null}

          {matchedEvents.length ? (
            <div className="matched-events">
              {matchedEvents.map((event, index) => (
                <div key={`event-${index}`} className="matched-event">
                  <p className="company-description subtle">{event.personalRelevance}</p>
                  <p className="company-description subtle">
                    {event.headline}
                    {Number.isFinite(event.confidence) ? ` · Confidence ${event.confidence}/100` : ""}
                    {formatTimestamp(event.publishedAt) ? ` · ${formatTimestamp(event.publishedAt)}` : ""}
                  </p>
                  {event.sourceUrl ? (
                    <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="matched-event__source">
                      {event.sourceName || "Source"}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="opportunity-item__actions">
        <Button type="button" className="ghost-button" onClick={onToggleExpand}>
          {isExpanded ? "Hide details" : "Show full evidence"}
        </Button>
      </div>
    </article>
  );
}
