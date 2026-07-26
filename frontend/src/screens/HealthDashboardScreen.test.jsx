import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import HealthDashboardScreen from "./HealthDashboardScreen";
import { systemHealthApi } from "../services/api";

vi.mock("../services/api", () => ({
  systemHealthApi: { get: vi.fn() },
}));

const HEALTH_FIXTURE = {
  generatedAt: "2026-07-24T10:00:00.000Z",
  overall: "HEALTHY",
  modules: {
    backend: { status: "HEALTHY", detail: "Database reachable.", latencyMs: 12 },
    identity: { status: "HEALTHY", detail: "Identity store reachable.", latencyMs: 8 },
    marketData: { status: "UNKNOWN", detail: "FINNHUB_API_KEY is not configured in this environment.", latencyMs: 1 },
    news: { status: "HEALTHY", detail: "News provider configured.", latencyMs: 1 },
    ai: { status: "HEALTHY", detail: "AI provider configured.", latencyMs: 1 },
    chart: { status: "HEALTHY", detail: "Chart data source configured.", latencyMs: 1 },
    notifications: { status: "HEALTHY", detail: "Notification store reachable.", latencyMs: 5 },
    decisionCenter: { status: "HEALTHY", detail: "Decision Center store reachable.", latencyMs: 6 },
    impactGraph: { status: "HEALTHY", detail: "Impact Graph store reachable.", latencyMs: 7 },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HealthDashboardScreen", () => {
  it("renders real per-module status pills from the real backend response", async () => {
    systemHealthApi.get.mockResolvedValue(HEALTH_FIXTURE);
    render(<HealthDashboardScreen />);
    await waitFor(() => expect(screen.getByText(/HEALTHY — 12ms/)).toBeInTheDocument());
    expect(screen.getByText(/UNKNOWN — 1ms/)).toBeInTheDocument();
  });

  it("shows the real detail line for a non-healthy module", async () => {
    systemHealthApi.get.mockResolvedValue(HEALTH_FIXTURE);
    render(<HealthDashboardScreen />);
    await waitFor(() => expect(screen.getByText(/FINNHUB_API_KEY is not configured/)).toBeInTheDocument());
  });

  it("shows the real startup validation status (healthy, in a normal test run)", async () => {
    systemHealthApi.get.mockResolvedValue(HEALTH_FIXTURE);
    render(<HealthDashboardScreen />);
    await waitFor(() => expect(screen.getByText("HEALTHY — no issues found")).toBeInTheDocument());
  });

  it("shows a friendly error state with a real retry action on backend failure", async () => {
    systemHealthApi.get.mockRejectedValueOnce(new Error("Failed to fetch"));
    render(<HealthDashboardScreen />);
    await waitFor(() => expect(screen.getByText("Couldn't reach the backend health check right now.")).toBeInTheDocument());

    systemHealthApi.get.mockResolvedValueOnce(HEALTH_FIXTURE);
    fireEvent.click(screen.getByText("Try again"));
    await waitFor(() => expect(screen.getByText(/HEALTHY — 12ms/)).toBeInTheDocument());
  });
});
