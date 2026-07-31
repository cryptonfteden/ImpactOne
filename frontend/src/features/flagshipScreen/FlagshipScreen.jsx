import { useCallback, useMemo, useState } from "react";
import FlagshipEarthScene from "./FlagshipEarthScene";
import FlagshipPanelContent from "./FlagshipPanelContent";
import useFlagshipData from "./useFlagshipData";
import { FLAGSHIP_PANELS } from "./panelConfig";
import useWatchlist from "../../hooks/useWatchlist";
import "../workspace3d/workspace3d.css";
import "./flagshipScreen.css";

const CHAIN_KEY = "__mission_chain__";

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

  const focusedPanel = FLAGSHIP_PANELS.find((panel) => panel.key === focusedPanelKey);

  return (
    <div className="workspace3d-root flagship-root">
      <FlagshipEarthScene
        focusedPanelKey={focusedPanelKey === CHAIN_KEY ? null : focusedPanelKey}
        onSelectPanel={handleSelectPanel}
        showMissionChain={focusedPanelKey === CHAIN_KEY}
        affectedHoldingsCount={affectedHoldingsCount}
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
