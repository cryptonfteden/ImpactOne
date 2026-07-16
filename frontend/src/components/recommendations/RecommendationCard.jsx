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

// Sprint 29 Priority 2 — User Feedback Capture. Exactly the six reactions
// named in the sprint mission, no more. Pure capture: submitting never
// changes anything else on this card or refetches the recommendation —
// feedback is evidence for future calibration, not an input to today's
// display.
const FEEDBACK_OPTIONS = [
  { value: "USEFUL", label: "Useful" },
  { value: "NOT_USEFUL", label: "Not useful" },
  { value: "TOO_EARLY", label: "Too early" },
  { value: "TOO_LATE", label: "Too late" },
  { value: "ALREADY_KNEW", label: "Already knew" },
  { value: "DONT_UNDERSTAND", label: "Don't understand" },
];

// Sprint 32 Priority 4 — Educational Layer. "Whenever uncertainty is
// high, teach. Whenever confidence is low, explain. Whenever a thesis
// changes, educate." Thresholds match this card's own existing bands
// (qualityPillClass below already treats <50 as the "risk" tier) rather
// than inventing new ones. Every note here explains a real, already-
// displayed number — it never appears without the condition it explains
// actually being true, and it never claims a note applies when its input
// data isn't available (e.g. no uncertainty note without a real
// decisionTrace uncertainty value).
const HIGH_UNCERTAINTY_THRESHOLD = 60;
const LOW_CONFIDENCE_THRESHOLD = 50;

function buildEducationalNotes({ uncertainty, confidenceScore, thesisChanged }) {
  const notes = [];

  if (Number.isFinite(uncertainty) && uncertainty >= HIGH_UNCERTAINTY_THRESHOLD) {
    notes.push({
      key: "uncertainty",
      text: `Uncertainty is high (${uncertainty}/100): the evidence behind this recommendation is limited or disagrees with itself. Treat the suggested position size and timing as provisional — this is a real signal to size down or wait for more evidence, not a reason to ignore the recommendation.`,
    });
  }

  if (Number.isFinite(confidenceScore) && confidenceScore < LOW_CONFIDENCE_THRESHOLD) {
    notes.push({
      key: "confidence",
      text: `Confidence is low (${confidenceScore}/100): the signals behind this recommendation don't strongly agree in one direction. A low-confidence recommendation is still real, but it means the case is weaker — worth weighing more caution or a smaller position than a high-confidence one.`,
    });
  }

  if (thesisChanged) {
    notes.push({
      key: "thesis",
      text: "The thesis behind this recommendation just changed: new evidence shifted our reasoning since the last version. A changed thesis isn't automatically better or worse — it means the picture genuinely moved, which is exactly what the timeline below shows.",
    });
  }

  return notes;
}

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
// which belief moved (confidence delta).
//
// Sprint 28 Priority 4 — returns a structured object instead of one
// run-on sentence, so the UI can label each dimension explicitly ("Why it
// changed" / "What evidence changed" / "What thesis changed" / "What
// confidence changed") rather than making the user parse a paragraph.
// Every field still comes only from data the list endpoint already
// returns on each Recommendation row — no fabricated field is ever
// populated when the underlying data didn't actually change.
function describeChange(current, previous) {
  if (!previous) return null;

  const actionChanged = current.action !== previous.action;
  const statusChanged = current.status !== previous.status;

  const currentConfidence = Number(current.confidenceScore);
  const previousConfidence = Number(previous.confidenceScore);
  const confidenceChanged = Number.isFinite(currentConfidence) && Number.isFinite(previousConfidence) && currentConfidence !== previousConfidence;

  if (!actionChanged && !statusChanged && !confidenceChanged) return null;

  const newHeadlines = new Set((current.evidence?.matchedEvents || []).map((event) => event.headline).filter(Boolean));
  const previousHeadlines = new Set((previous.evidence?.matchedEvents || []).map((event) => event.headline).filter(Boolean));
  const newEvidence = [...newHeadlines].filter((headline) => !previousHeadlines.has(headline));
  const thesisChanged = Boolean(current.reasoning && previous.reasoning && current.reasoning !== previous.reasoning);

  const whatChanged = [];
  if (actionChanged) whatChanged.push(`Action: ${ACTION_LABEL[previous.action] || previous.action} → ${ACTION_LABEL[current.action] || current.action}`);
  if (statusChanged) whatChanged.push(`Status: ${previous.status} → ${current.status}`);

  return {
    whatChanged: whatChanged.join("; "),
    confidenceChange: confidenceChanged
      ? { direction: currentConfidence > previousConfidence ? "rose" : "fell", from: previousConfidence, to: currentConfidence }
      : null,
    newEvidence: newEvidence.slice(0, 2),
    thesisChanged,
    newThesis: thesisChanged ? current.reasoning : null,
  };
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
  const [latestFeedback, setLatestFeedback] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [decisionReview, setDecisionReview] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    let cancelled = false;

    // Sprint 30 Priority 1 — User Memory. Fire-and-forget: a real reading-
    // behavior signal (the user actually opened this recommendation's
    // detail), never blocking or altering anything else on this card.
    recommendationsApi.recordView(recommendation.id).catch((error) => logError("recommendation view record failed", error));

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

    Promise.resolve()
      .then(() => recommendationsApi.getFeedback(recommendation.id))
      .then((data) => {
        if (!cancelled) setLatestFeedback((data?.feedback || [])[0] || null);
      })
      .catch((error) => logError("recommendation feedback load failed", error));

    return () => {
      cancelled = true;
    };
  }, [isExpanded, recommendation.id, recommendation.symbol]);

  async function handleFeedback(feedbackType) {
    setIsSubmittingFeedback(true);
    try {
      const feedback = await recommendationsApi.submitFeedback(recommendation.id, feedbackType);
      setLatestFeedback(feedback);
    } catch (error) {
      logError("recommendation feedback submit failed", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  // Sprint 32 Priority 3 — Decision Review. Lazily fetched only when the
  // user actually asks for it (a heavier aggregate call than anything
  // else on this card), never pre-fetched on every expand.
  async function handleToggleReview() {
    if (isReviewOpen) {
      setIsReviewOpen(false);
      return;
    }
    setIsReviewOpen(true);
    if (decisionReview) return;
    setIsReviewLoading(true);
    try {
      const review = await recommendationsApi.getDecisionReview(recommendation.id);
      setDecisionReview(review);
    } catch (error) {
      logError("decision review load failed", error);
    } finally {
      setIsReviewLoading(false);
    }
  }

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

  // Sprint 32 Priority 4 — "whenever a thesis changes, educate" means the
  // most recent real change, not any change ever in this symbol's whole
  // history — an old thesis shift from months ago isn't news right now.
  const mostRecentThesisChanged = Boolean(timelineEntries[timelineEntries.length - 1]?.change?.thesisChanged);
  const educationalNotes = buildEducationalNotes({
    uncertainty,
    confidenceScore: Number(recommendation.confidenceScore),
    thesisChanged: mostRecentThesisChanged,
  });

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

          {educationalNotes.length ? (
            <div className="explanation-section">
              <p className="explanation-section__title">Understanding this recommendation</p>
              {educationalNotes.map((note) => (
                <p key={note.key} className="company-description subtle">{note.text}</p>
              ))}
            </div>
          ) : null}

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
                <div key={item.id} className="evidence-line">
                  <p className="company-description subtle">
                    {formatTimestamp(item.createdAt)} — {ACTION_LABEL[item.action] || item.action} ({item.status})
                    {isBaseline ? " — first tracked version." : ""}
                  </p>
                  {change ? (
                    <>
                      {change.whatChanged ? <p className="company-description subtle">Why it changed: {change.whatChanged}</p> : null}
                      {change.confidenceChange ? (
                        <p className="company-description subtle">
                          What confidence changed: {change.confidenceChange.from} → {change.confidenceChange.to} ({change.confidenceChange.direction})
                        </p>
                      ) : null}
                      {change.newEvidence.length ? (
                        <p className="company-description subtle">What evidence changed: {change.newEvidence.join("; ")}</p>
                      ) : null}
                      {change.thesisChanged ? (
                        <p className="company-description subtle">What thesis changed: {change.newThesis}</p>
                      ) : null}
                    </>
                  ) : null}
                </div>
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

          <div className="explanation-section">
            <p className="explanation-section__title">Was this useful?</p>
            <div className="opportunity-item__actions">
              {FEEDBACK_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  className={latestFeedback?.feedbackType === option.value ? "pill opportunity" : "ghost-button"}
                  disabled={isSubmittingFeedback}
                  onClick={() => handleFeedback(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {latestFeedback ? (
              <p className="company-description subtle">
                Feedback recorded: {FEEDBACK_OPTIONS.find((option) => option.value === latestFeedback.feedbackType)?.label || latestFeedback.feedbackType}
              </p>
            ) : null}
          </div>

          <div className="explanation-section">
            <Button type="button" className="ghost-button" onClick={handleToggleReview}>
              {isReviewOpen ? "Hide full decision review" : "Show full decision review"}
            </Button>
            {isReviewOpen ? (
              isReviewLoading ? (
                <p className="company-description subtle">Loading decision review…</p>
              ) : decisionReview ? (
                <div className="explanation-section">
                  {/* Sprint 32 Priority 5 — audit found the decision review's
                      own timeline list duplicated the "What changed" section
                      already rendered above on this same card (both read
                      from the same real history). Rather than showing the
                      same entries twice, this section only adds what "What
                      changed" doesn't already cover: outcome, lesson, and
                      calibration. */}
                  <p className="explanation-section__title">Outcome</p>
                  {decisionReview.outcome ? (
                    <p className="company-description subtle">
                      {decisionReview.outcome.gradeLabel === "UNGRADEABLE"
                        ? `Could not be graded — ${decisionReview.outcome.ungradeableReason || "no live quote was available."}`
                        : `${decisionReview.outcome.windowReturnPct >= 0 ? "+" : ""}${decisionReview.outcome.windowReturnPct}% over ${decisionReview.outcome.timeWindow} — direction ${decisionReview.outcome.directionCorrect ? "correct" : "incorrect"}.`}
                    </p>
                  ) : (
                    <p className="company-description subtle">Not graded yet — outcomes are graded after the recommendation's time window elapses.</p>
                  )}

                  <p className="explanation-section__title">Lesson</p>
                  <p className="company-description subtle">{decisionReview.lesson ? decisionReview.lesson.lessonText : "No lesson yet — lessons are generated once an outcome is graded."}</p>

                  <p className="explanation-section__title">Calibration for this action</p>
                  {decisionReview.calibration?.isStatisticallyMeaningful ? (
                    <p className="company-description subtle">
                      Expected {decisionReview.calibration.expectedConfidence}/100 · Actual {decisionReview.calibration.actualOutcomeHitRate}% · Trend: {decisionReview.calibration.calibrationTrend} · n={decisionReview.calibration.sampleSize}
                    </p>
                  ) : (
                    <p className="company-description subtle">{decisionReview.calibration?.insufficientDataMessage || "No calibration data yet for this action."}</p>
                  )}
                </div>
              ) : null
            ) : null}
          </div>
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
