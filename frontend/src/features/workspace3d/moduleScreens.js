// Phase IMPACTONE-3D-WORKSPACE-001 — maps each orbital module key to its
// real, already-existing screen component. Imported directly from each
// feature's own file (not the features/index.js barrel) specifically to
// avoid a circular import, since features/index.js itself exports
// Workspace3DFeature.
import { lazy } from "react";

const MarketIntelligenceWorkspaceFeature = lazy(() => import("../marketIntelligenceWorkspace/MarketIntelligenceWorkspaceFeature"));
const NewsIntelligenceFeature = lazy(() => import("../newsIntelligence/NewsIntelligenceFeature"));
const AiAnalysisWorkspaceFeature = lazy(() => import("../aiAnalysisWorkspace/AiAnalysisWorkspaceFeature"));
const PortfolioWorkspaceFeature = lazy(() => import("../portfolioWorkspace/PortfolioWorkspaceFeature"));
const WatchlistWorkspaceFeature = lazy(() => import("../watchlistWorkspace/WatchlistWorkspaceFeature"));
const PersonalIntelligenceWorkspaceFeature = lazy(() => import("../personalIntelligenceWorkspace/PersonalIntelligenceWorkspaceFeature"));
const AlertsFeature = lazy(() => import("../alerts/AlertsFeature"));
const MissionControlHomeFeature = lazy(() => import("../missionControlHome/MissionControlHomeFeature"));

export const MODULE_SCREENS = {
  "Market Intelligence Workspace": MarketIntelligenceWorkspaceFeature,
  "News Intelligence": NewsIntelligenceFeature,
  "AI Analysis Workspace": AiAnalysisWorkspaceFeature,
  "Portfolio Workspace": PortfolioWorkspaceFeature,
  "Watchlist Workspace": WatchlistWorkspaceFeature,
  "Personal Intelligence Workspace": PersonalIntelligenceWorkspaceFeature,
  Alerts: AlertsFeature,
};

export const MISSION_CONTROL_SCREEN = MissionControlHomeFeature;
