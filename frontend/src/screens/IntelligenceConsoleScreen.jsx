import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, LoadingSpinner } from "../components/ui";
import { providerApi, qualityDashboardApi, marketIntelligenceApi, committeeIntelligenceApi, explainabilityApi } from "../services/api";
import { logError } from "../utils/errorHandling";

// Sprint 37 Priority 12 — Internal Source Intelligence Console. Status
// pills distinguish LIVE / DEGRADED / FIXTURE / DISABLED / UNCONFIGURED at
// a glance — the mission's explicit requirement that these never blur
// together into one ambiguous "active" label.
const INVENTORY_STATUS_CLASS = {
  LIVE: "pill opportunity",
  NO_DATA: "pill monitor",
  DEGRADED: "pill monitor",
  FIXTURE: "pill",
  DISABLED: "pill risk",
  UNCONFIGURED: "pill risk",
};

function MarketIntelligencePanel() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [symbol, setSymbol] = useState("AAPL");
  const [matrix, setMatrix] = useState(null);
  const [matrixError, setMatrixError] = useState("");
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    marketIntelligenceApi
      .getProviderInventory()
      .then((data) => {
        if (!cancelled) {
          setInventory(data.providers || []);
          setError("");
        }
      })
      .catch((loadError) => {
        logError("market intelligence inventory load failed", loadError);
        if (!cancelled) setError("Couldn't load the provider inventory right now.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMatrix() {
    if (!symbol.trim()) return;
    setIsMatrixLoading(true);
    setMatrixError("");
    try {
      const data = await marketIntelligenceApi.getEvidenceMatrix(symbol.trim().toUpperCase());
      setMatrix(data);
    } catch (loadError) {
      logError("evidence matrix load failed", loadError);
      setMatrixError("Couldn't load the evidence matrix right now.");
    } finally {
      setIsMatrixLoading(false);
    }
  }

  return (
    <>
      <SectionCard title="Provider inventory" subtitle="Generated from the live registry — never hand-duplicated" className="screen-card" icon="◫">
        {isLoading ? (
          <LoadingSpinner label="Loading provider inventory" />
        ) : error ? (
          <p className="company-description negative">{error}</p>
        ) : (
          <div className="table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Last success</th>
                  <th>Auth requirement</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row) => (
                  <tr key={row.providerId}>
                    <td>{row.label}</td>
                    <td>{row.category}</td>
                    <td><span className={INVENTORY_STATUS_CLASS[row.status] || "pill"}>{row.status}</span></td>
                    <td>{row.lastSuccessfulRetrieval ? new Date(row.lastSuccessfulRetrieval).toLocaleString() : "Never"}</td>
                    <td>{row.authenticationRequirement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Cross-source evidence matrix" subtitle="Independent per category — never one blended score" className="screen-card" icon="◑">
        <div className="opportunity-item__actions">
          <input
            className="onboarding-numeric-input"
            style={{ maxWidth: 160 }}
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="Symbol (e.g. AAPL)"
          />
          <Button type="button" className="ghost-button" onClick={loadMatrix} disabled={isMatrixLoading}>
            {isMatrixLoading ? "Loading…" : "Load evidence matrix"}
          </Button>
        </div>
        {matrixError ? <p className="company-description negative">{matrixError}</p> : null}
        {matrix ? (
          <div className="table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Stance</th>
                  <th>Confidence</th>
                  <th>Uncertainty</th>
                  <th>Sources</th>
                  <th>Strongest counter-evidence</th>
                </tr>
              </thead>
              <tbody>
                {matrix.categories.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}{row.isFixture ? " (fixture)" : ""}</td>
                    <td className={row.stance === "CONTRADICTORY" ? "negative" : row.stance === "SUPPORTIVE" ? "positive" : ""}>
                      {row.stance}{row.disagreement ? " — DISAGREEMENT" : ""}
                    </td>
                    <td>{row.confidence}</td>
                    <td>{row.uncertainty}</td>
                    <td>{row.sourceCount}</td>
                    <td>{row.strongestCounterEvidence || row.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>
    </>
  );
}

// Sprint 38 — Investment Intelligence Committee. Shows each specialist's
// confidence, counter-evidence, missing evidence, and freshness side by
// side, plus the CIO's summary of where the committee agrees/disagrees —
// the mission's explicit requirement that users see WHY specialists
// disagree, never just a single blended verdict. Read-only.
function CommitteeIntelligencePanel() {
  const [symbol, setSymbol] = useState("AAPL");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadCommittee() {
    if (!symbol.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await committeeIntelligenceApi.convene(symbol.trim().toUpperCase());
      setResult(data);
    } catch (loadError) {
      logError("committee intelligence load failed", loadError);
      setError("Couldn't convene the committee right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionCard title="Investment Intelligence Committee" subtitle="Independent specialists debate the same evidence — the committee never votes or averages scores" className="screen-card" icon="◐">
      <div className="opportunity-item__actions">
        <input
          className="onboarding-numeric-input"
          style={{ maxWidth: 160 }}
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
          placeholder="Symbol (e.g. AAPL)"
        />
        <Button type="button" className="ghost-button" onClick={loadCommittee} disabled={isLoading}>
          {isLoading ? "Convening…" : "Convene committee"}
        </Button>
      </div>
      {error ? <p className="company-description negative">{error}</p> : null}
      {result ? (
        <>
          <div className="explanation-section">
            <p className="explanation-section__title">CIO summary</p>
            <p className="company-description">{result.cio.overallThesis}</p>
            <p className="company-description subtle">Confidence: {result.cio.confidence}</p>
            {result.cio.largestDisagreement ? (
              <p className="company-description negative">Largest disagreement: {result.cio.largestDisagreement}</p>
            ) : null}
            <p className="company-description subtle">Highest risk: {result.cio.highestRisk}</p>
            {result.cio.missingInformation.length ? (
              <p className="company-description subtle">Missing: {result.cio.missingInformation.join("; ")}</p>
            ) : null}
            {result.cio.whyRecommendationMayBeWrong.length ? (
              <p className="company-description negative">Why this may be wrong: {result.cio.whyRecommendationMayBeWrong.join(" ")}</p>
            ) : null}
          </div>

          <div className="table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Specialist</th>
                  <th>Headline</th>
                  <th>Confidence</th>
                  <th>Uncertainty</th>
                  <th>Freshness</th>
                  <th>Counter-evidence</th>
                  <th>Missing evidence</th>
                </tr>
              </thead>
              <tbody>
                {result.committee.members.map((member) => (
                  <tr key={member.memberId}>
                    <td>{member.memberName}</td>
                    <td>{member.headline}</td>
                    <td>{member.confidence}</td>
                    <td>{member.uncertainty}</td>
                    <td className={member.freshness === "STALE" ? "negative" : ""}>{member.freshness}</td>
                    <td>{member.counterEvidence.map((item) => item.reason).join("; ") || "—"}</td>
                    <td>{member.missingEvidence.join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </SectionCard>
  );
}

const EVIDENCE_CATEGORIES = ["NEWS", "SOCIAL", "INSTITUTIONS", "ANALYSTS", "OPTIONS", "TECHNICAL", "SENTIMENT", "COT", "FUNDAMENTALS", "RESEARCH"];

function ExpandableSection({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="explanation-section">
      <Button type="button" className="ghost-button" onClick={() => setIsOpen((current) => !current)}>
        {isOpen ? "▾ " : "▸ "}{title}
      </Button>
      {isOpen ? <div className="explanation-section">{children}</div> : null}
    </div>
  );
}

// Sprint 39 — Explainability Layer. Every recommendation must be
// traceable from final verdict back to the original evidence: this panel
// looks up a recommendation's real DecisionTrace plus a freshly re-
// convened committee and renders the mission's required expandable
// sections (Decision Trace, Committee Debate, Evidence Tree,
// Recommendation Explanation, What Could Change My Mind, Counter
// Evidence, Missing Evidence), plus an internal What-If tool.
function ExplainabilityPanel() {
  const [recommendationId, setRecommendationId] = useState("");
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [whatIfSymbol, setWhatIfSymbol] = useState("AAPL");
  const [whatIfCategory, setWhatIfCategory] = useState("TECHNICAL");
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfError, setWhatIfError] = useState("");
  const [isWhatIfLoading, setIsWhatIfLoading] = useState(false);

  async function loadExplanation() {
    if (!recommendationId.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await explainabilityApi.explainRecommendation(recommendationId.trim());
      setBundle(data);
    } catch (loadError) {
      logError("explainability load failed", loadError);
      setError("Couldn't load an explanation for that recommendation id.");
      setBundle(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function runWhatIf() {
    if (!whatIfSymbol.trim()) return;
    setIsWhatIfLoading(true);
    setWhatIfError("");
    try {
      const data = await explainabilityApi.whatIf(whatIfSymbol.trim().toUpperCase(), whatIfCategory);
      setWhatIfResult(data);
    } catch (loadError) {
      logError("what-if load failed", loadError);
      setWhatIfError("Couldn't run the what-if analysis right now.");
    } finally {
      setIsWhatIfLoading(false);
    }
  }

  return (
    <>
      <SectionCard title="Recommendation explainability" subtitle="Every displayed conclusion must be reproducible — no fabricated reasoning, no hidden weighting" className="screen-card" icon="◔">
        <div className="opportunity-item__actions">
          <input
            className="onboarding-numeric-input"
            style={{ maxWidth: 320 }}
            value={recommendationId}
            onChange={(event) => setRecommendationId(event.target.value)}
            placeholder="Recommendation id"
          />
          <Button type="button" className="ghost-button" onClick={loadExplanation} disabled={isLoading}>
            {isLoading ? "Loading…" : "Explain"}
          </Button>
        </div>
        {error ? <p className="company-description negative">{error}</p> : null}
        {bundle ? (
          <>
            <p className="company-description subtle">
              {bundle.symbol} · action {bundle.explanation.action} · confidence {bundle.confidence} · uncertainty {bundle.uncertainty ?? "n/a"}
            </p>
            {bundle.consistency.consistent === false ? (
              <p className="company-description negative">Consistency check: {bundle.consistency.mismatchExplanation}</p>
            ) : bundle.consistency.consistent === true ? (
              <p className="company-description positive">Consistency check: recommendation and live committee agree.</p>
            ) : null}
            <p className="company-description subtle">Disagreement level: {bundle.disagreement.level}</p>

            <ExpandableSection title="Decision Trace">
              <p className="company-description subtle">Timestamp: {new Date(bundle.timestamp).toLocaleString()}</p>
              <pre className="company-description subtle" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(bundle.decisionTrace.finalOutput, null, 2)}</pre>
            </ExpandableSection>

            <ExpandableSection title="Committee Debate (historical, immutable)">
              <pre className="company-description subtle" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(bundle.decisionTrace.historicalCommitteeDebate, null, 2)}</pre>
            </ExpandableSection>

            <ExpandableSection title="Evidence Tree (live committee members)">
              <div className="table-wrapper">
                <table className="watchlist-table">
                  <thead>
                    <tr><th>Specialist</th><th>Confidence</th><th>Uncertainty</th><th>Freshness</th><th>Counter-evidence</th></tr>
                  </thead>
                  <tbody>
                    {bundle.liveCommittee.members.map((memberItem) => (
                      <tr key={memberItem.memberId}>
                        <td>{memberItem.memberName}</td>
                        <td>{memberItem.confidence}</td>
                        <td>{memberItem.uncertainty}</td>
                        <td className={memberItem.freshness === "STALE" ? "negative" : ""}>{memberItem.freshness}</td>
                        <td>{memberItem.counterEvidence.map((item) => item.reason).join("; ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Recommendation Explanation">
              <p className="company-description">Why {bundle.explanation.action}: {bundle.explanation.whyAction}</p>
              {Object.entries(bundle.explanation.whyNot).map(([action, text]) => (
                <p key={action} className="company-description subtle">{text}</p>
              ))}
            </ExpandableSection>

            <ExpandableSection title="What Could Change My Mind">
              <p className="company-description">{bundle.explanation.singleFactThatWouldChangeThis}</p>
            </ExpandableSection>

            <ExpandableSection title="Counter Evidence">
              {bundle.explanation.contradictingEvidence ? (
                <p className="company-description negative">{bundle.explanation.contradictingEvidence.memberId}: {bundle.explanation.contradictingEvidence.reason}</p>
              ) : (
                <p className="company-description subtle">No strongest contradictory evidence was identified.</p>
              )}
            </ExpandableSection>

            <ExpandableSection title="Missing Evidence">
              {bundle.liveCommittee.missingEvidence.length ? (
                bundle.liveCommittee.missingEvidence.map((item, index) => (
                  <p key={index} className="company-description subtle">{item.memberId}: {item.item}</p>
                ))
              ) : (
                <p className="company-description subtle">No missing evidence reported.</p>
              )}
            </ExpandableSection>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="What-If Engine (internal)" subtitle="Remove one evidence category and recompute — never exposes a hidden weight" className="screen-card" icon="◔">
        <div className="opportunity-item__actions">
          <input
            className="onboarding-numeric-input"
            style={{ maxWidth: 140 }}
            value={whatIfSymbol}
            onChange={(event) => setWhatIfSymbol(event.target.value)}
            placeholder="Symbol"
          />
          <select className="onboarding-numeric-input" style={{ maxWidth: 200 }} value={whatIfCategory} onChange={(event) => setWhatIfCategory(event.target.value)}>
            {EVIDENCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>Without {category}</option>
            ))}
          </select>
          <Button type="button" className="ghost-button" onClick={runWhatIf} disabled={isWhatIfLoading}>
            {isWhatIfLoading ? "Running…" : "Run what-if"}
          </Button>
        </div>
        {whatIfError ? <p className="company-description negative">{whatIfError}</p> : null}
        {whatIfResult ? (
          <p className="company-description">
            Baseline lean: {whatIfResult.baseline.lean} → Without {whatIfResult.excludedCategory}: {whatIfResult.whatIf.lean}.{" "}
            {whatIfResult.verdictChanged ? <span className="negative">Verdict direction changed.</span> : <span className="positive">Verdict direction unchanged.</span>}
          </p>
        ) : null}
      </SectionCard>
    </>
  );
}

// Sprint 29 Priority 4 — Recommendation Quality Dashboard. Internal only:
// this component is never reachable outside VITE_DEV_CONSOLE (same gating
// as the rest of this screen, see the file-level comment below). Every
// metric here is honestly null when there's no qualifying data yet,
// rather than a misleading 0 or "N/A" that reads as a real measurement.
function QualityDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    qualityDashboardApi
      .get()
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
          setError("");
        }
      })
      .catch((loadError) => {
        logError("quality dashboard load failed", loadError);
        if (!cancelled) setError("Couldn't load the quality dashboard right now.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) return <LoadingSpinner label="Loading quality dashboard" />;
  if (error) return <p className="company-description negative">{error}</p>;
  if (!dashboard) return null;

  const metric = (value, suffix = "") => (Number.isFinite(value) ? `${value}${suffix}` : "Not enough data yet");

  return (
    <div className="opportunity-grid">
      <SectionCard title="Hit rate" className="screen-card" icon="◎">
        <p className="company-description">{metric(dashboard.hitRate, "%")}</p>
        <p className="company-description subtle">{dashboard.sampleSizes.gradedOutcomes} graded outcomes</p>
      </SectionCard>
      <SectionCard title="Confidence calibration" className="screen-card" icon="◎">
        <p className="company-description">{metric(dashboard.confidenceCalibration, "%")}</p>
        <p className="company-description subtle">How well predicted confidence tracked real correctness</p>
      </SectionCard>
      <SectionCard title="Average holding period" className="screen-card" icon="◎">
        <p className="company-description">{metric(dashboard.avgHoldingPeriodHours, "h")}</p>
      </SectionCard>
      <SectionCard title="Average uncertainty" className="screen-card" icon="◎">
        <p className="company-description">{metric(dashboard.avgUncertainty, "/100")}</p>
        <p className="company-description subtle">{dashboard.sampleSizes.decisionTraces} decision traces</p>
      </SectionCard>
      <SectionCard title="Outcome completion" className="screen-card" icon="◎">
        <p className="company-description">{metric(dashboard.outcomeCompletion, "%")}</p>
        <p className="company-description subtle">{dashboard.sampleSizes.totalOutcomes} of {dashboard.sampleSizes.totalPredictions} predictions graded</p>
      </SectionCard>
    </div>
  );
}

// Sprint 30 Priority 3 — Learning Loop. Read-only visibility into what
// the platform has learned from real feedback/outcome/theme data — this
// component never writes anything and is never consulted by the
// recommendation engine or the ranking engine (see
// learningLoopService.js's own file-level comment and its test asserting
// that non-dependency directly).
function LearningLoopPanel() {
  const [signals, setSignals] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    qualityDashboardApi
      .getLearningSignals()
      .then((data) => {
        if (!cancelled) {
          setSignals(data);
          setError("");
        }
      })
      .catch((loadError) => {
        logError("learning signals load failed", loadError);
        if (!cancelled) setError("Couldn't load learning signals right now.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) return <LoadingSpinner label="Loading learning signals" />;
  if (error) return <p className="company-description negative">{error}</p>;
  if (!signals) return null;

  return (
    <div className="opportunity-grid">
      <SectionCard title="Feedback signals" className="screen-card" icon="◑">
        <p className="company-description">{signals.feedbackSignals.totalFeedback} total feedback entries</p>
        {Object.entries(signals.feedbackSignals.byType).length ? (
          <p className="company-description subtle">
            {Object.entries(signals.feedbackSignals.byType).map(([type, count]) => `${type}: ${count}`).join(" · ")}
          </p>
        ) : (
          <p className="company-description subtle">No feedback recorded yet.</p>
        )}
        {signals.feedbackSignals.mostUsefulSymbols.length ? (
          <p className="company-description subtle positive">Most useful: {signals.feedbackSignals.mostUsefulSymbols.join(", ")}</p>
        ) : null}
        {signals.feedbackSignals.leastUsefulSymbols.length ? (
          <p className="company-description subtle negative">Least useful: {signals.feedbackSignals.leastUsefulSymbols.join(", ")}</p>
        ) : null}
      </SectionCard>
      <SectionCard title="Theme signals" className="screen-card" icon="◑">
        <p className="company-description subtle">Strengthened: {signals.themeSignals.strengthenedThemes.join(", ") || "None"}</p>
        <p className="company-description subtle">Weakened: {signals.themeSignals.weakenedThemes.join(", ") || "None"}</p>
        <p className="company-description subtle">Disappeared: {signals.themeSignals.disappearedThemes.join(", ") || "None"}</p>
      </SectionCard>
    </div>
  );
}

/**
 * Sprint 23A — developer-only Intelligence Console. Read-only ops
 * visibility into the provider framework (health/metrics/diagnostics/
 * metadata) plus a manual "Run now" trigger — no destructive controls, no
 * recommendation/portfolio/outcome data anywhere on this screen. Gated
 * entirely at the layout level (see MainLayout.jsx/Sidebar.jsx) behind
 * VITE_DEV_CONSOLE — this component itself has no gating logic, it is
 * simply never registered in a normal build.
 */
function ProviderDetail({ providerId }) {
  const [metrics, setMetrics] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [metricsData, diagnosticsData, metadataData] = await Promise.all([
          providerApi.getMetrics(providerId),
          providerApi.getDiagnostics(providerId),
          providerApi.getMetadata(providerId),
        ]);
        if (!cancelled) {
          setMetrics(metricsData);
          setDiagnostics(diagnosticsData);
          setMetadata(metadataData);
          setError("");
        }
      } catch (loadError) {
        logError("provider detail load failed", loadError);
        if (!cancelled) setError("Couldn't load this provider's detail right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  if (isLoading) return <LoadingSpinner label={`Loading ${providerId}`} />;
  if (error) return <p className="company-description negative">{error}</p>;

  return (
    <div className="explanation-section">
      <div className="explanation-section">
        <p className="explanation-section__title">Metadata</p>
        <p className="company-description subtle">
          Source type: {metadata.sourceType} · Category: {metadata.category} · Rate limit: {metadata.rateLimit.maxPerMinute}/min
        </p>
        <p className="company-description subtle">
          Default themes: {metadata.defaultThemes.length ? metadata.defaultThemes.join(", ") : "None"}
        </p>
      </div>

      <div className="explanation-section">
        <p className="explanation-section__title">Metrics</p>
        <p className="company-description subtle">
          {metrics.totalRuns} total runs · {metrics.totalItemsPersisted} items persisted · {metrics.totalItemsDeduped} deduped
          {metrics.dedupRate !== null ? ` (${metrics.dedupRate}% dedup rate)` : ""}
        </p>
        <p className="company-description subtle">
          Error rate: {metrics.errorRate !== null ? `${metrics.errorRate}%` : "N/A"} · Avg duration:{" "}
          {metrics.avgDurationMs !== null ? `${metrics.avgDurationMs}ms` : "N/A"}
        </p>
      </div>

      <div className="explanation-section">
        <p className="explanation-section__title">Diagnostics</p>
        <p className={`company-description ${diagnostics.contractValid ? "subtle" : "negative"}`}>
          Contract: {diagnostics.contractValid ? "Valid" : `Invalid — missing ${diagnostics.contractIssues.join(", ")}`}
        </p>
        <p className="company-description subtle">
          Rate limiter: {diagnostics.rateLimiter.currentCount}/{diagnostics.rateLimiter.maxPerMinute} used this window
        </p>
        {diagnostics.lastError ? (
          <p className="company-description negative">Last error: {diagnostics.lastError.message}</p>
        ) : (
          <p className="company-description subtle">No errors on record.</p>
        )}
      </div>
    </div>
  );
}

export default function IntelligenceConsoleScreen() {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [runResultById, setRunResultById] = useState({});

  const loadProviders = async () => {
    try {
      const data = await providerApi.list();
      setProviders(data.providers || []);
      setError("");
    } catch (loadError) {
      logError("provider list load failed", loadError);
      setError("We couldn't load providers right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleRun = async (providerId) => {
    setRunningId(providerId);
    try {
      const result = await providerApi.run(providerId);
      setRunResultById((current) => ({ ...current, [providerId]: result }));
      await loadProviders();
    } catch (runError) {
      logError("provider run failed", runError);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Intelligence Console</p>
          <h1>Provider framework ops visibility</h1>
          <p className="subtext">Developer tooling — health, metrics, diagnostics, and manual runs. Read-only aside from "Run now."</p>
        </div>
      </section>

      <section>
        <p className="eyebrow">Market Intelligence Source Layer (Sprint 37, internal)</p>
        <MarketIntelligencePanel />
      </section>

      <section>
        <p className="eyebrow">Investment Intelligence Committee (Sprint 38, internal)</p>
        <CommitteeIntelligencePanel />
      </section>

      <section>
        <p className="eyebrow">Explainability (Sprint 39, internal)</p>
        <ExplainabilityPanel />
      </section>

      <section>
        <p className="eyebrow">Recommendation quality (internal)</p>
        <QualityDashboard />
      </section>

      <section>
        <p className="eyebrow">Learning loop (internal)</p>
        <LearningLoopPanel />
      </section>

      {isLoading ? (
        <LoadingSpinner label="Loading providers" />
      ) : error ? (
        <p className="company-description negative">{error}</p>
      ) : (
        <div className="opportunity-grid">
          {providers.map((provider) => (
            <SectionCard key={provider.providerId} title={provider.label} className="screen-card" icon="⚙">
              <p className="company-description subtle">
                {provider.sourceType} · Last status: {provider.lastStatus || "Never run"}
                {provider.successRate !== null ? ` · ${provider.successRate}% success` : ""}
              </p>
              <div className="opportunity-item__actions">
                <Button
                  type="button"
                  className="ghost-button"
                  onClick={() => setExpandedId(expandedId === provider.providerId ? null : provider.providerId)}
                >
                  {expandedId === provider.providerId ? "Hide details" : "Show details"}
                </Button>
                <Button
                  type="button"
                  className="ghost-button"
                  disabled={runningId === provider.providerId}
                  onClick={() => handleRun(provider.providerId)}
                >
                  {runningId === provider.providerId ? "Running…" : "Run now"}
                </Button>
              </div>
              {runResultById[provider.providerId] ? (
                <p className="company-description subtle">
                  Last manual run: {runResultById[provider.providerId].status} — {runResultById[provider.providerId].itemsFetched} fetched
                </p>
              ) : null}
              {expandedId === provider.providerId ? <ProviderDetail providerId={provider.providerId} /> : null}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
