import { useCallback, useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, EmptyState, ErrorState, LoadingSpinner } from "../components/ui";
import { decisionCenterApi } from "../services/api";
import { openSymbolPanel } from "../utils/symbolPanel";
import { logError } from "../utils/errorHandling";
import OrbitVisual from "../components/OrbitVisual";
import { useI18n } from "../i18n/I18nProvider";

const SOURCE_LABELS = {
  priceAlert: "Price Alert",
  aiRecommendationChanged: "AI Recommendation",
};

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"];

const SORT_LABELS = {
  urgency: "Urgency",
  confidence: "Confidence",
  portfolioImpact: "Portfolio impact",
  time: "Time",
};

function DecisionItem({ item, onPin, onDismiss, onComplete }) {
  const isPinned = item.status === "PINNED";
  const isCompleted = item.status === "COMPLETED";

  return (
    <div className={`decision-item decision-item--${item.priority}${isCompleted ? " decision-item--completed" : ""}`}>
      <div className="decision-item__top">
        <button type="button" className="ghost-button" onClick={() => openSymbolPanel(item.symbol)}>
          <strong>{item.symbol}</strong>
        </button>
        <span className={item.priority === "HIGH" ? "pill risk" : item.priority === "MEDIUM" ? "pill monitor" : "pill"}>
          {item.priority}
        </span>
        {isPinned ? <span className="pill">Pinned</span> : null}
        {isCompleted ? <span className="pill">Completed</span> : null}
      </div>
      <p className="company-description"><strong>Decision:</strong> {item.reason}</p>
      <p className="company-description subtle"><strong>Evidence:</strong> {item.evidence}</p>
      <p className="company-description subtle"><strong>Suggested next action:</strong> {item.suggestedAction}</p>
      <div className="decision-item__meta">
        <span className="company-description subtle">Confidence: {item.confidence != null ? `${Math.round(item.confidence)}%` : "n/a"}</span>
        <span className="company-description subtle">Portfolio impact: {item.portfolioImpact ? "Held position" : "Not held"}</span>
        <span className="company-description subtle">Workspace: {item.workspace || "Untracked"}</span>
        <span className="company-description subtle">
          Alerts: {item.alertState ? `${item.alertState.activeCount} active, ${item.alertState.triggeredCount} triggered` : "None"}
        </span>
      </div>
      <p className="company-description subtle">{new Date(item.timestamp).toLocaleString()}</p>
      <div className="decision-item__actions">
        <Button type="button" className="ghost-button" onClick={() => onPin(item.id, isPinned)}>
          {isPinned ? "Unpin" : "Pin"}
        </Button>
        <Button type="button" className="ghost-button" onClick={() => onComplete(item.id, isCompleted)}>
          {isCompleted ? "Mark not completed" : "Mark completed"}
        </Button>
        <Button type="button" className="ghost-button" onClick={() => onDismiss(item.id)}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/**
 * Phase X3/X4 — Decision Center, now the default action workspace. Every
 * item is real (triggered price alerts, real AI recommendation lifecycle
 * changes for tracked symbols) — the two mission-named sources with no
 * real historical data source (workspace activity, Opportunity Score
 * movement) are honestly disclosed, never fabricated, per
 * DECISION_CENTER_V1.md. X4 adds pin/dismiss/mark-completed (persisted
 * server-side via DecisionState) and sorting by urgency/confidence/
 * portfolio impact/time.
 */
export default function DecisionCenterScreen() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("urgency");

  const load = useCallback(() => {
    setIsLoading(true);
    return decisionCenterApi
      .getDecisions({ source: sourceFilter || undefined, priority: priorityFilter || undefined, sortBy })
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((loadError) => {
        logError("decision center load failed", loadError);
        // Phase X5 — Part 7, Private Beta Polish. Never render a raw
        // caught-error message (e.g. "Failed to fetch") to an investor —
        // the real message is already captured above via logError.
        setError("Couldn't load the Decision Center right now. Try again in a moment.");
      })
      .finally(() => setIsLoading(false));
  }, [sourceFilter, priorityFilter, sortBy]);

  useEffect(() => {
    let cancelled = false;
    load().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handlePin(id, isPinned) {
    try {
      await (isPinned ? decisionCenterApi.clearStatus(id) : decisionCenterApi.pin(id));
      load();
    } catch (actionError) {
      logError("decision pin failed", actionError);
    }
  }

  async function handleComplete(id, isCompleted) {
    try {
      await (isCompleted ? decisionCenterApi.clearStatus(id) : decisionCenterApi.complete(id));
      load();
    } catch (actionError) {
      logError("decision complete failed", actionError);
    }
  }

  async function handleDismiss(id) {
    try {
      await decisionCenterApi.dismiss(id);
      load();
    } catch (actionError) {
      logError("decision dismiss failed", actionError);
    }
  }

  if (isLoading && !data) {
    return (
      <div className="screen-page">
        <SectionCard title="Decision Center" className="screen-card">
          <LoadingSpinner label="Gathering today's decisions" />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="screen-page">
      <section className="screen-hero screen-hero--orbital decision-hero">
        <div>
          <p className="eyebrow">{t("core.decisionCenter")}</p>
          <h1>{t("core.decisionTitle")}</h1>
          <p className="subtext">{t("core.decisionSubtitle")}</p>
        </div>
        <OrbitVisual variant="decision" label="Decision signals orbit" />
      </section>

      {error ? <ErrorState message={error} reason="This is usually temporary — a slow connection or a brief server hiccup." onRetry={load} /> : null}

      <div className="decision-filters">
        <Button type="button" className={`ghost-button${!sourceFilter ? " active" : ""}`} onClick={() => setSourceFilter("")}>All sources</Button>
        {Object.entries(SOURCE_LABELS).map(([key, label]) => (
          <Button key={key} type="button" className={`ghost-button${sourceFilter === key ? " active" : ""}`} onClick={() => setSourceFilter(key)}>
            {label}
          </Button>
        ))}
        <Button type="button" className={`ghost-button${!priorityFilter ? " active" : ""}`} onClick={() => setPriorityFilter("")}>All priorities</Button>
        {PRIORITIES.map((priority) => (
          <Button key={priority} type="button" className={`ghost-button${priorityFilter === priority ? " active" : ""}`} onClick={() => setPriorityFilter(priority)}>
            {priority}
          </Button>
        ))}
      </div>

      <div className="decision-filters" role="group" aria-label="Sort decisions">
        <span className="company-description subtle">Sort by:</span>
        {(data?.availableSorts || Object.keys(SORT_LABELS)).map((key) => (
          <Button key={key} type="button" className={`ghost-button${sortBy === key ? " active" : ""}`} onClick={() => setSortBy(key)}>
            {SORT_LABELS[key] || key}
          </Button>
        ))}
      </div>

      {data?.unavailableSources?.length ? (
        <p className="company-description subtle negative">
          Not yet trackable: {data.unavailableSources.map((entry) => entry.source).join(", ")} — see each for why.
        </p>
      ) : null}

      {data?.items?.length ? (
        Object.entries(data.grouped).map(([source, items]) => (
          <SectionCard key={source} title={SOURCE_LABELS[source] || source} subtitle={`${items.length} item(s)`} className="screen-card">
            <div className="folder-card__symbols">
              {items.map((item) => (
                <DecisionItem key={item.id} item={item} onPin={handlePin} onDismiss={handleDismiss} onComplete={handleComplete} />
              ))}
            </div>
          </SectionCard>
        ))
      ) : (
        <EmptyState message="No decisions need your attention right now." />
      )}
    </div>
  );
}
