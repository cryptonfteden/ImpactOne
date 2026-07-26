import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ExecutiveDashboardScreen from "./ExecutiveDashboardScreen";
import { executiveDashboardApi } from "../services/api";

vi.mock("../services/api", () => ({
  executiveDashboardApi: { get: vi.fn() },
}));

vi.mock("../utils/symbolPanel", () => ({ openSymbolPanel: vi.fn() }));

const FIXTURE = {
  highestConvictionOpportunities: [{ symbol: "NVDA", action: "BUY", qualityScore: 92, reasoning: "real reasoning" }],
  highestMarketRisks: [{ symbol: "TSLA", riskScore: 88, riskLabel: "High", expectedDownside: "15%" }],
  largestPortfolioImpacts: [{ symbol: "AAPL", unrealizedPnl: 450.25, quantity: 10 }],
  majorMarketEvents: [{ headline: "Real market headline", sourceName: "Reuters", publishedAt: "2026-07-24T10:00:00.000Z", credibilityScore: 95 }],
  largestPositioningChanges: null,
  highestAiConfidence: [{ symbol: "MSFT", action: "BUY", confidenceScore: 85 }],
  unavailableSources: [{ source: "largestPositioningChanges", reason: "no history" }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ExecutiveDashboardScreen", () => {
  it("renders all six real curated lists", async () => {
    executiveDashboardApi.get.mockResolvedValue(FIXTURE);
    render(<ExecutiveDashboardScreen />);
    await waitFor(() => expect(screen.getByText("Quality 92/100")).toBeInTheDocument());
    expect(screen.getByText("High — 88/100")).toBeInTheDocument();
    expect(screen.getByText("$450.25")).toBeInTheDocument();
    expect(screen.getByText("Real market headline")).toBeInTheDocument();
    expect(screen.getByText("BUY — 85/100")).toBeInTheDocument();
  });

  it("honestly discloses that positioning changes are unavailable, never fabricated", async () => {
    executiveDashboardApi.get.mockResolvedValue(FIXTURE);
    render(<ExecutiveDashboardScreen />);
    await waitFor(() => expect(screen.getByText(/no persisted history yet/)).toBeInTheDocument());
  });

  it("shows honest empty states with no data", async () => {
    executiveDashboardApi.get.mockResolvedValue({
      highestConvictionOpportunities: [], highestMarketRisks: [], largestPortfolioImpacts: [],
      majorMarketEvents: [], largestPositioningChanges: null, highestAiConfidence: [], unavailableSources: [],
    });
    render(<ExecutiveDashboardScreen />);
    await waitFor(() => expect(screen.getByText("No active BUY recommendations right now.")).toBeInTheDocument());
  });

  it("shows a friendly error state with a real retry action", async () => {
    executiveDashboardApi.get.mockRejectedValueOnce(new Error("Failed to fetch"));
    render(<ExecutiveDashboardScreen />);
    await waitFor(() => expect(screen.getByText("Couldn't load the Market Dashboard right now.")).toBeInTheDocument());

    executiveDashboardApi.get.mockResolvedValueOnce(FIXTURE);
    fireEvent.click(screen.getByText("Try again"));
    await waitFor(() => expect(screen.getByText("Quality 92/100")).toBeInTheDocument());
  });
});
