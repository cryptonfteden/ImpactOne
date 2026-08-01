import { lazy } from "react";
import { SIDEBAR_NAV_KEYS } from "./Sidebar";
import { BOTTOM_NAV_KEYS } from "./BottomNav";
import { runStartupValidation } from "../startupValidation";
import { logError } from "../utils/errorHandling";
import { API_BASE_URL } from "../config/apiConfig";
import {
  AnalysisFeature,
  NewsFeature,
  WatchlistFeature,
  AlertsFeature,
  PortfolioFeature,
  SettingsFeature,
  RecommendationsFeature,
  MyProfileFeature,
  HomeFeature,
  ThemesFeature,
  IntelligenceConsoleFeature,
  HealthDashboardFeature,
  WatchlistFoldersFeature,
  MarketPositioningFeature,
  DecisionCenterFeature,
  DecisionTimelineFeature,
  ExecutiveDashboardFeature,
  AdminDashboardFeature,
  AiPerformanceDashboardFeature,
  MissionControlHomeFeature,
  IntelligenceWorkspaceFeature,
  PortfolioWorkspaceFeature,
  NewsIntelligenceFeature,
  WatchlistWorkspaceFeature,
  AiAnalysisWorkspaceFeature,
  MarketIntelligenceWorkspaceFeature,
  PersonalIntelligenceWorkspaceFeature,
} from "../features";

// Phase X6 — Part 1/4. Extracted from MainLayout.jsx into its own module
// specifically so HealthDashboardScreen.jsx (which MainLayout renders via
// screenMap) can import STARTUP_VALIDATION_RESULT without creating a
// circular import back into MainLayout.jsx itself.
export const GlobalIntelligenceFeature = lazy(() => import("../features/intelligence/GlobalIntelligenceFeature"));

// Phase IMPACTONE-3D-WORKSPACE-001 — lazy for the same reason as
// GlobalIntelligenceFeature above: real, added bundle weight (three.js +
// @react-three/fiber/drei) that every existing screen's users should
// never have to download unless they actually open this one.
export const Workspace3DFeature = lazy(() => import("../features/workspace3d/Workspace3DFeature"));

// Phase FLAGSHIP-SCREEN-001 — the single flagship screen; lazy for the
// same real reason as the two screens above (three.js/@react-three
// bundle weight no other screen's users should have to download).
export const FlagshipScreenFeature = lazy(() => import("../features/flagshipScreen/FlagshipScreen"));

// Sprint 40 — "Dashboard" removed from screenMap/nav: it duplicated
// Home's morning-brief content almost entirely (see Sidebar.jsx's own
// comment and SPRINT_40_REPORT.md's duplication findings). Home is now
// the sole nav-reachable landing screen and the unreachable-view fallback
// below.
export const screenMap = {
  Home: HomeFeature,
  Flagship: FlagshipScreenFeature,
  "3D Workspace": Workspace3DFeature,
  "Mission Control": MissionControlHomeFeature,
  "Intelligence Workspace": IntelligenceWorkspaceFeature,
  "Portfolio Workspace": PortfolioWorkspaceFeature,
  "News Intelligence": NewsIntelligenceFeature,
  "Watchlist Workspace": WatchlistWorkspaceFeature,
  "AI Analysis Workspace": AiAnalysisWorkspaceFeature,
  "Market Intelligence Workspace": MarketIntelligenceWorkspaceFeature,
  "Personal Intelligence Workspace": PersonalIntelligenceWorkspaceFeature,
  "Daily Feed": NewsFeature,
  "AI Analysis": AnalysisFeature,
  Watchlist: WatchlistFeature,
  "Global Intelligence": GlobalIntelligenceFeature,
  Themes: ThemesFeature,
  Alerts: AlertsFeature,
  Portfolio: PortfolioFeature,
  "Watchlist Folders": WatchlistFoldersFeature,
  "Market Positioning": MarketPositioningFeature,
  "Decision Center": DecisionCenterFeature,
  "Decision Timeline": DecisionTimelineFeature,
  "Market Dashboard": ExecutiveDashboardFeature,
  Recommendations: RecommendationsFeature,
  "My Profile": MyProfileFeature,
  Settings: SettingsFeature,
};

// Sprint 23A / Phase X6 Part 4 — developer-only, same VITE_DEV_CONSOLE
// gate as Sidebar.jsx's navItems; each screen exists in the bundle but is
// unreachable unless the flag is set (no nav entry, and activeView can
// never equal either key).
if (import.meta.env.VITE_DEV_CONSOLE === "true") {
  screenMap["Intelligence Console"] = IntelligenceConsoleFeature;
  screenMap["Health Dashboard"] = HealthDashboardFeature;
  screenMap["Admin Dashboard"] = AdminDashboardFeature;
  // Phase X10 — Part 7, AI Performance Dashboard. Same internal-only gate.
  screenMap["AI Performance Dashboard"] = AiPerformanceDashboardFeature;
}

// Phase X6 — Part 1, Startup Validation Layer. Runs once at module load,
// before any screen renders. Never blocks or throws — a validation
// failure is logged (and surfaced on the Health Dashboard, Part 4) but
// never prevents the app from rendering; AppErrorBoundary is the true
// backstop for anything this can't predict.
export const STARTUP_VALIDATION_RESULT = runStartupValidation({
  screenMap,
  navigableKeys: [...SIDEBAR_NAV_KEYS, ...BOTTOM_NAV_KEYS],
  requiredModules: { HomeFeature, PortfolioFeature, DecisionCenterFeature },
  origins: { apiBaseUrl: API_BASE_URL, isProd: import.meta.env.PROD },
});
if (!STARTUP_VALIDATION_RESULT.ok) {
  for (const issue of STARTUP_VALIDATION_RESULT.issues) {
    logError(`Startup validation: ${issue.area}`, new Error(issue.message));
  }
}
