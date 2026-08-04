// Phase IMPACTONE-3D-WORKSPACE-001 — maps each orbital module key to its
// real, already-existing screen component. Imported directly from each
// feature's own file (not the features/index.js barrel) specifically to
// avoid a circular import, since features/index.js itself exports
// Workspace3DFeature.
import MarketIntelligenceWorkspaceFeature from "../marketIntelligenceWorkspace/MarketIntelligenceWorkspaceFeature";
import NewsIntelligenceFeature from "../newsIntelligence/NewsIntelligenceFeature";
import AiAnalysisWorkspaceFeature from "../aiAnalysisWorkspace/AiAnalysisWorkspaceFeature";
import PortfolioWorkspaceFeature from "../portfolioWorkspace/PortfolioWorkspaceFeature";
import WatchlistWorkspaceFeature from "../watchlistWorkspace/WatchlistWorkspaceFeature";
import PersonalIntelligenceWorkspaceFeature from "../personalIntelligenceWorkspace/PersonalIntelligenceWorkspaceFeature";
import AlertsFeature from "../alerts/AlertsFeature";
import MissionControlHomeFeature from "../missionControlHome/MissionControlHomeFeature";

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
