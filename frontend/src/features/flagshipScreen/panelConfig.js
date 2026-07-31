// Phase FLAGSHIP-SCREEN-001 — pure, dependency-free layout config for
// the flagship screen's 10 required panels. Deliberately imports only
// the generic orbital math from the existing 3D Workspace feature
// (Phase IMPACTONE-3D-WORKSPACE-001) rather than duplicating it — no
// three.js import here either, so this stays unit-testable under plain
// jsdom.
import { orbitalPosition, focusedCameraFor } from "../workspace3d/orbitalConfig";

export const FLAGSHIP_RADIUS = 8;

// The mission's own required panel list, each mapped to a real,
// already-existing backend service — no new API, no new business logic.
export const FLAGSHIP_PANELS = [
  { key: "aiMarketSummary", label: "AI Market Summary", color: "#4f8cff" },
  { key: "globalEvents", label: "Global Events", color: "#ff9f4f" },
  { key: "portfolioHealth", label: "Portfolio Health", color: "#4fffb0" },
  { key: "aiRecommendations", label: "AI Recommendations", color: "#b06bff" },
  { key: "watchlist", label: "Watchlist", color: "#ffe14f" },
  { key: "fearGreed", label: "Fear & Greed", color: "#ff5f5f" },
  { key: "agentConsensus", label: "Agent Consensus", color: "#5fd0ff" },
  { key: "macroCalendar", label: "Macro Calendar", color: "#c0c0ff" },
  { key: "breakingNews", label: "Breaking News", color: "#ff5f8f" },
  { key: "alerts", label: "Alerts", color: "#ffb84f" },
];

export function flagshipPanelPosition(index) {
  return orbitalPosition(index, FLAGSHIP_PANELS.length, FLAGSHIP_RADIUS);
}

export function flagshipFocusedCamera(index) {
  return focusedCameraFor(flagshipPanelPosition(index));
}

export const FLAGSHIP_PORTFOLIO_PANEL_INDEX = FLAGSHIP_PANELS.findIndex((panel) => panel.key === "portfolioHealth");
