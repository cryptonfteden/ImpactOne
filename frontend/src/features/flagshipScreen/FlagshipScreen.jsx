import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlagshipEarthScene from "./FlagshipEarthScene";
import FlagshipPanelContent from "./FlagshipPanelContent";
import useFlagshipData from "./useFlagshipData";
import { FLAGSHIP_PANELS } from "./panelConfig";
import { computeAmbientState } from "./ambientState";
import useWatchlist from "../../hooks/useWatchlist";
import "../workspace3d/workspace3d.css";
import "./flagshipScreen.css";

const CHAIN_KEY = "__mission_chain__";
const SHOCKWAVE_LIFETIME_MS = 2400;

// Phase FLAGSHIP-SCREEN-001 — the single flagship screen: a live Earth
// at the center, the mission's own 10 required intelligence panels
// floating around it (each connected to the Earth by a real, visible
// line), animated Earth-to-holding connections whenever real portfolio
// data names affected holdings, and the Global Event -> ... ->
// Recommended Action chain on demand. Every panel's content is real,
// existing backend data (useFlagshipData.js) — no new business logic,
// no new API. Reuses the 3D Workspace's own Earth/CameraRig/OrbitalNode
// components (Phase IMPACTONE-3D-WORKSPACE-001) rather than
// duplicating them.
export default function FlagshipScreen() {
  const { watchlist } = useWatchlist();
  const panels = useFlagshipData(watchlist);
  const [focusedPanelKey, setFocusedPanelKey] = useState(null);

  const handleSelectPanel = useCallback((key) => {
    setFocusedPanelKey((current) => (current === key ? null : key));
  }, []);

  const handleClose = useCallback(() => setFocusedPanelKey(null), []);

  const affectedHoldingsCount = useMemo(() => {
    const portfolio = panels.portfolioHealth?.data;
    return portfolio?.changes?.length || 0;
  }, [panels.portfolioHealth]);

  // Phase IMMERSIVE-INTERACTIONS-001 — the real magnitude behind the
  // holding-connection pulses' speed, and the ambient scene state
  // (tone/intensity/color) driving atmosphere, lighting, and connection
  // line opacity — every one computed from data this screen already has
  // in hand, never a new fetch or new business logic.
  const holdingMagnitude = useMemo(() => {
    const portfolio = panels.portfolioHealth?.data;
    return portfolio?.hasComparison ? Math.min(Math.abs(portfolio.valueChangePct) / 5, 1) : 0;
  }, [panels.portfolioHealth]);

  const ambientState = useMemo(() => computeAmbientState(panels), [panels]);

  const panelStatuses = useMemo(
    () => Object.fromEntries(FLAGSHIP_PANELS.map((panel) => [panel.key, panels[panel.key]?.status || "loading"])),
    [panels]
  );

  const recommendationCount = panels.aiRecommendations?.data?.length || 0;
  const eventCount = panels.globalEvents?.data?.length || 0;

  // Phase CINEMATIC-EXPERIENCE-002 — "breaking-news shockwave animation":
  // a real, one-shot trigger fired exactly when the real Breaking News
  // panel's real item count genuinely grows since the last real fetch —
  // never a periodic or arbitrary animation. Each trigger prunes itself
  // after a fixed lifetime.
  const [shockwaveTriggers, setShockwaveTriggers] = useState([]);
  const previousBreakingNewsCount = useRef(null);

  useEffect(() => {
    if (panels.breakingNews?.status !== "live") return;
    const count = panels.breakingNews.data?.length || 0;
    const previous = previousBreakingNewsCount.current;
    previousBreakingNewsCount.current = count;
    if (previous === null || count <= previous) return;

    const id = `${Date.now()}-${count}`;
    const startedAt = Date.now();
    setShockwaveTriggers((current) => [...current, { id, startedAt }]);
    const timeoutId = setTimeout(() => {
      setShockwaveTriggers((current) => current.filter((trigger) => trigger.id !== id));
    }, SHOCKWAVE_LIFETIME_MS);
    return () => clearTimeout(timeoutId);
  }, [panels.breakingNews]);

  const focusedPanel = FLAGSHIP_PANELS.find((panel) => panel.key === focusedPanelKey);

  return (
    <div className="workspace3d-root flagship-root">
      <FlagshipEarthScene
        focusedPanelKey={focusedPanelKey === CHAIN_KEY ? null : focusedPanelKey}
        onSelectPanel={handleSelectPanel}
        showMissionChain={focusedPanelKey === CHAIN_KEY}
        affectedHoldingsCount={affectedHoldingsCount}
        holdingMagnitude={holdingMagnitude}
        recommendationCount={recommendationCount}
        eventCount={eventCount}
        panelStatuses={panelStatuses}
        ambientState={ambientState}
        shockwaveTriggers={shockwaveTriggers}
        recommendations={panels.aiRecommendations?.data || []}
        committee={panels.agentConsensus?.data?.committee || null}
        cioConfidence={panels.agentConsensus?.data?.cio?.confidence}
        claims={panels.globalEvents?.data || []}
        breakingNewsItems={panels.breakingNews?.data || []}
      />
      <div className="workspace3d-toolbar">
        <button
          type="button"
          className={`workspace3d-toolbar__button ${focusedPanelKey === CHAIN_KEY ? "is-active" : ""}`}
          onClick={() => handleSelectPanel(CHAIN_KEY)}
        >
          Mission Chain
        </button>
      </div>
      {focusedPanel ? (
        <div className="workspace3d-glass-panel" role="region" aria-label={focusedPanel.label}>
          <div className="workspace3d-glass-panel__header">
            <span className="workspace3d-glass-panel__title">{focusedPanel.label}</span>
            <button type="button" className="workspace3d-glass-panel__close" onClick={handleClose} aria-label={`Close ${focusedPanel.label}`}>
              ×
            </button>
          </div>
          <div className="workspace3d-glass-panel__body">
            <FlagshipPanelContent panelKey={focusedPanel.key} panelState={panels[focusedPanel.key]} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
