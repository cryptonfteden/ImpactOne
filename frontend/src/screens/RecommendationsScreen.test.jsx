import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RecommendationsScreen from "./RecommendationsScreen";
import { recommendationsApi } from "../services/api";

vi.mock("../services/api", () => ({
  recommendationsApi: {
    list: vi.fn(),
    status: vi.fn(),
    run: vi.fn(),
  },
}));

const RECOMMENDATION_FIXTURE = {
  id: "rec-1",
  symbol: "NVDA",
  action: "BUY",
  confidenceScore: 88,
  riskLabel: "Moderate",
  expectedUpside: "10-16%",
  expectedDownside: "-8% tactical stop",
  positionSizeSuggestion: "2-4%",
  reasoning: "Strong AI capex tailwind driving conviction.",
};

const STATUS_FIXTURE = { enabled: true, intervalMinutes: 30, latestRunLog: { startedAt: "2026-07-11T10:00:00.000Z", symbolsEvaluated: 3 } };

describe("RecommendationsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders recommendations with action, confidence, and expected upside/downside", async () => {
    recommendationsApi.list.mockResolvedValue({ recommendations: [RECOMMENDATION_FIXTURE] });
    recommendationsApi.status.mockResolvedValue(STATUS_FIXTURE);

    render(<RecommendationsScreen />);

    await waitFor(() => expect(screen.getByText("NVDA")).toBeInTheDocument());

    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText(/Confidence 88\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Upside 10-16%/)).toBeInTheDocument();
    expect(screen.queryByText(/Strong AI capex tailwind/)).not.toBeInTheDocument();
  });

  it("expands reasoning on click and never renders a place-order control", async () => {
    recommendationsApi.list.mockResolvedValue({ recommendations: [RECOMMENDATION_FIXTURE] });
    recommendationsApi.status.mockResolvedValue(STATUS_FIXTURE);

    render(<RecommendationsScreen />);
    await waitFor(() => expect(screen.getByText("NVDA")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Show reasoning" }));
    expect(screen.getByText(/Strong AI capex tailwind/)).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /place order/i })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no active recommendations", async () => {
    recommendationsApi.list.mockResolvedValue({ recommendations: [] });
    recommendationsApi.status.mockResolvedValue(STATUS_FIXTURE);

    render(<RecommendationsScreen />);

    await waitFor(() => expect(screen.getByText(/No active recommendations/)).toBeInTheDocument());
  });

  it("Run now triggers the engine and refreshes the list", async () => {
    recommendationsApi.list.mockResolvedValue({ recommendations: [] });
    recommendationsApi.status.mockResolvedValue(STATUS_FIXTURE);
    recommendationsApi.run.mockResolvedValue({ recommendationsGenerated: 1 });

    render(<RecommendationsScreen />);
    await waitFor(() => expect(screen.getByText(/No active recommendations/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Run now" }));

    await waitFor(() => expect(recommendationsApi.run).toHaveBeenCalledTimes(1));
    expect(recommendationsApi.list).toHaveBeenCalledTimes(2);
  });
});
