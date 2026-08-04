// Phase FLAGSHIP-SCREEN-001 — plain, real-data presentation for each of
// the 10 required panels. Every field rendered here comes directly from
// the real API response shape already established by this codebase's
// other screens (MissionControlHomeScreen.jsx, AiAnalysisScreen.jsx,
// PortfolioWorkspaceScreen.jsx, AlertsScreen.jsx) — no new business
// logic, no fabricated fields, an honest empty state whenever a real
// list is genuinely empty.
function Empty({ label }) {
  return (
    <div className="flagship-panel__state flagship-panel__state--empty">
      <span className="flagship-panel__state-icon" aria-hidden="true">◇</span>
      <p>{label}</p>
    </div>
  );
}

// Phase FLAGSHIP-POLISH-001 — a real, visually distinct error state.
// Previously a real fetch failure and a real, honestly-empty result
// rendered identically (both just "no data" text) — that's a real
// regression in information hierarchy: "this failed to load" and
// "there is genuinely nothing here right now" are different facts a
// user should be able to tell apart at a glance.
function ErrorState({ label }) {
  return (
    <div className="flagship-panel__state flagship-panel__state--error">
      <span className="flagship-panel__state-icon" aria-hidden="true">!</span>
      <p>{label}</p>
    </div>
  );
}

// Phase FLAGSHIP-POLISH-001 — a real animated shimmer skeleton in place
// of the previous plain "Loading..." text, for better perceived
// performance (the panel's eventual real shape is already implied while
// data is in flight, rather than a blank moment of plain text).
function PanelSkeleton() {
  return (
    <div className="flagship-panel__skeleton" aria-busy="true" aria-label="Loading">
      <div className="flagship-skeleton-bar flagship-skeleton-bar--wide" />
      <div className="flagship-skeleton-bar" />
      <div className="flagship-skeleton-bar flagship-skeleton-bar--short" />
    </div>
  );
}

function AiMarketSummaryPanel({ data }) {
  if (!data) return <Empty label="No meaningful intelligence to surface yet today." />;
  return (
    <div className="flagship-panel__content">
      <h3>{data.headline}</h3>
      <p>{data.whyItMatters}</p>
      {data.affectedAssets?.length ? <p className="flagship-panel__meta">Affects: {data.affectedAssets.join(", ")}</p> : null}
    </div>
  );
}

function GlobalEventsPanel({ data }) {
  if (!data?.length) return <Empty label="No active global events tracked right now." />;
  return (
    <ul className="flagship-panel__list">
      {data.slice(0, 6).map((claim) => (
        <li key={claim.claimId}>
          <strong>{(claim.symbols || []).join(", ") || "Market-wide"}</strong>
          <span>{claim.plainLanguageStatement || claim.statement}</span>
        </li>
      ))}
    </ul>
  );
}

function PortfolioHealthPanel({ data }) {
  if (!data?.hasComparison) return <Empty label={data?.summary || "No prior-day snapshot yet."} />;
  return (
    <div className="flagship-panel__content">
      <div className="flagship-panel__stat">
        <span>${data.totalValue.toLocaleString()}</span>
        <em className={data.valueChangePct >= 0 ? "is-positive" : "is-negative"}>
          {data.valueChangePct >= 0 ? "+" : ""}
          {data.valueChangePct}%
        </em>
      </div>
      <p className="flagship-panel__meta">{data.summary}</p>
    </div>
  );
}

function AiRecommendationsPanel({ data }) {
  if (!data?.length) return <Empty label="No active recommendations right now." />;
  return (
    <ul className="flagship-panel__list">
      {data.slice(0, 6).map((rec) => (
        <li key={rec.id}>
          <strong>{rec.symbol}</strong>
          <span>{rec.action} — {rec.reasoning?.slice(0, 90) || "See full recommendation for detail."}</span>
        </li>
      ))}
    </ul>
  );
}

function WatchlistPanel({ data }) {
  if (!data?.length) return <Empty label="Your watchlist is empty." />;
  return (
    <ul className="flagship-panel__chips">
      {data.map((symbol) => (
        <li key={symbol}>{symbol}</li>
      ))}
    </ul>
  );
}

function FearGreedPanel({ data }) {
  if (!data) return <Empty label="Fear & Greed reading is not currently available." />;
  return (
    <div className="flagship-panel__content">
      <div className="flagship-panel__gauge">{data.value}</div>
      <p className="flagship-panel__meta">{data.classification}</p>
    </div>
  );
}

function AgentConsensusPanel({ data }) {
  if (!data) return <Empty label="Agent consensus is not currently available." />;
  return (
    <div className="flagship-panel__content">
      <h3>{data.symbol}</h3>
      <p>{data.cio?.overallThesis || "Committee has not yet reached a stated consensus."}</p>
      {data.cio?.confidence ? <p className="flagship-panel__meta">Confidence: {data.cio.confidence.replace(/_/g, " ")}</p> : null}
    </div>
  );
}

function MacroCalendarPanel({ data }) {
  if (!data?.length) return <Empty label="No upcoming macro events tracked right now." />;
  return (
    <ul className="flagship-panel__list">
      {data.slice(0, 6).map((event, index) => (
        <li key={event.id || index}>
          <strong>{event.name || event.title || "Macro event"}</strong>
          <span>{event.date || event.time || ""}</span>
        </li>
      ))}
    </ul>
  );
}

function BreakingNewsPanel({ data }) {
  if (!data?.length) return <Empty label="No overnight changes right now." />;
  return (
    <ul className="flagship-panel__list">
      {data.slice(0, 6).map((claim) => (
        <li key={claim.claimId}>
          <strong>{claim.status}</strong>
          <span>{claim.plainLanguageStatement || claim.statement}</span>
        </li>
      ))}
    </ul>
  );
}

function AlertsPanel({ data }) {
  if (!data?.length) return <Empty label="No active price alerts." />;
  return (
    <ul className="flagship-panel__list">
      {data.slice(0, 6).map((alert) => (
        <li key={alert.id}>
          <strong>{alert.symbol}</strong>
          <span>{alert.direction} {alert.targetPrice}</span>
        </li>
      ))}
    </ul>
  );
}

const PANEL_RENDERERS = {
  aiMarketSummary: AiMarketSummaryPanel,
  globalEvents: GlobalEventsPanel,
  portfolioHealth: PortfolioHealthPanel,
  aiRecommendations: AiRecommendationsPanel,
  watchlist: WatchlistPanel,
  fearGreed: FearGreedPanel,
  agentConsensus: AgentConsensusPanel,
  macroCalendar: MacroCalendarPanel,
  breakingNews: BreakingNewsPanel,
  alerts: AlertsPanel,
};

export default function FlagshipPanelContent({ panelKey, panelState }) {
  const Renderer = PANEL_RENDERERS[panelKey];
  if (!Renderer) return null;
  if (panelState.status === "loading") return <PanelSkeleton />;
  if (panelState.status === "error") {
    return <ErrorState label="This panel couldn't load real data just now — try again shortly." />;
  }
  return <Renderer data={panelState.data} />;
}
