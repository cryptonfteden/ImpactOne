import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminDashboardScreen from "./AdminDashboardScreen";
import { adminDashboardApi, betaMetricsApi, performanceMetricsApi } from "../services/api";

vi.mock("../services/api", () => ({
  adminDashboardApi: { get: vi.fn() },
  betaMetricsApi: { get: vi.fn() },
  performanceMetricsApi: { get: vi.fn() },
}));

const DASHBOARD_FIXTURE = {
  dailyActiveUsers: { distinctBetaUsers: 2, distinctSessions: 3 },
  weeklySessions: { distinctBetaUsers: 2, distinctSessions: 10 },
  averageSessionLength: { avgDurationMs: 65000, sampleSize: 5 },
  mostUsedScreens: [{ screen: "Home", count: 12 }],
  mostUsedFeatures: [{ eventName: "decision_center_viewed", count: 4 }],
  errors: [{ source: "frontend", count: 2 }],
  crashes: 2,
  feedbackByType: [{ type: "BUG", count: 1 }],
  feedbackCount: 1,
  topRecommendationsViewed: [{ symbol: "NVDA", count: 3 }],
  decisionCenterUsage: 4,
};

const METRICS_FIXTURE = {
  activationRate: { rate: 50, activatedSessions: 1, openedSessions: 2 },
  retention: { rate: 30, returningSessions: 3, totalSessions: 10 },
  feedbackPerUser: { totalFeedback: 1, distinctUsersWhoGaveFeedback: 1, feedbackPerUser: 1 },
  crashFreeSessions: { rate: 80, crashFreeSessions: 8, totalSessions: 10 },
};

const PERFORMANCE_FIXTURE = {
  apiLatency: [{ route: "GET /api/v2/home-summary", count: 10, avgMs: 50, p95Ms: 90 }],
  memoryUsage: { rssMb: 120, heapUsedMb: 60, heapTotalMb: 90 },
  frontendBundleSize: { available: true, totalKb: 700, fileCount: 2 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminDashboardScreen", () => {
  it("renders real active-usage, screens, errors, and feedback data", async () => {
    adminDashboardApi.get.mockResolvedValue(DASHBOARD_FIXTURE);
    betaMetricsApi.get.mockResolvedValue(METRICS_FIXTURE);
    performanceMetricsApi.get.mockResolvedValue(PERFORMANCE_FIXTURE);
    render(<AdminDashboardScreen />);
    await waitFor(() => expect(screen.getByText("Home")).toBeInTheDocument());
    expect(screen.getByText("NVDA")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows a friendly error state with a real retry on failure", async () => {
    adminDashboardApi.get.mockRejectedValueOnce(new Error("Failed to fetch"));
    betaMetricsApi.get.mockResolvedValue(METRICS_FIXTURE);
    performanceMetricsApi.get.mockResolvedValue(PERFORMANCE_FIXTURE);
    render(<AdminDashboardScreen />);
    await waitFor(() => expect(screen.getByText("Couldn't load the Operations Dashboard right now.")).toBeInTheDocument());

    adminDashboardApi.get.mockResolvedValueOnce(DASHBOARD_FIXTURE);
    fireEvent.click(screen.getByText("Try again"));
    await waitFor(() => expect(screen.getByText("Home")).toBeInTheDocument());
  });
});
