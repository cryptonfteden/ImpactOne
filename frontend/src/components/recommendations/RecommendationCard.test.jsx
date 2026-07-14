import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RecommendationCard from "./RecommendationCard";
import { recommendationsApi } from "../../services/api";

vi.mock("../../services/api", () => ({
  recommendationsApi: { getDecisionTrace: vi.fn(), list: vi.fn() },
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
  timeHorizon: "1-3 months",
  reasoning: "Strong AI capex tailwind driving conviction.",
  qualityScore: 82,
  qualityComponents: { sourceQuality: 95, evidenceFreshness: 80, portfolioRelevance: 100, evidenceAgreement: 100, dataCompleteness: 100, modelConfidence: 88 },
  explanation: {
    thesis: "Buy NVDA: AI capex supercycle.",
    supportingEvidence: [],
    opposingEvidence: [],
    keyRisks: [],
    invalidationConditions: [],
    affectedPositions: [],
    affectedWatchlistSymbols: [],
    confidenceDrivers: [],
    confidenceReducers: [],
  },
  scenarios: [
    { case: "bull", narrative: "n", probability: 0.3, priceImpact: "15-22%", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
    { case: "base", narrative: "n", probability: 0.5, priceImpact: "4-9%", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
    { case: "bear", narrative: "n", probability: 0.2, priceImpact: "-8%", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
  ],
  evidence: { symbolSource: "portfolio", matchedEvents: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  recommendationsApi.getDecisionTrace.mockResolvedValue({ confidenceCalculation: { uncertainty: 35 } });
  recommendationsApi.list.mockResolvedValue({ recommendations: [] });
});

describe("RecommendationCard", () => {
  it("always shows symbol, action, provenance badge, quality badge, and thesis, collapsed by default", () => {
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded={false} onToggleExpand={vi.fn()} />);

    expect(screen.getByText("NVDA")).toBeInTheDocument();
    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText("From your portfolio")).toBeInTheDocument();
    expect(screen.getByText("Quality 82/100")).toBeInTheDocument();
    expect(screen.getByText("Buy NVDA: AI capex supercycle.")).toBeInTheDocument();
    expect(screen.queryByText(/Strong AI capex tailwind driving conviction/)).not.toBeInTheDocument();
    expect(screen.queryByText("Bull")).not.toBeInTheDocument();
  });

  it("shows reasoning and the scenario comparison when expanded", () => {
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);

    expect(screen.getByText(/Strong AI capex tailwind driving conviction/)).toBeInTheDocument();
    expect(screen.getByText("Bull")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Bear")).toBeInTheDocument();
  });

  it("calls onToggleExpand when the expand button is clicked", () => {
    const onToggleExpand = vi.fn();
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded={false} onToggleExpand={onToggleExpand} />);

    screen.getByRole("button", { name: "Show full evidence" }).click();
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it("never renders a place-order control in either state", () => {
    const { rerender } = render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded={false} onToggleExpand={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /place order/i })).not.toBeInTheDocument();

    rerender(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /place order/i })).not.toBeInTheDocument();
  });

  it("shows the committee debate (consensus, disagreement, expert votes) when expanded, with no second verdict pill", () => {
    const withDebate = {
      ...RECOMMENDATION_FIXTURE,
      explanation: {
        ...RECOMMENDATION_FIXTURE.explanation,
        committeeDebate: {
          consensusLevel: 80,
          disagreementLevel: 20,
          expertVotes: [
            { agent: "Equity Analyst", vote: "Buy", confidence: 74 },
            { agent: "Risk Manager", vote: "Hold", confidence: 60 },
          ],
        },
      },
    };

    render(<RecommendationCard recommendation={withDebate} isExpanded onToggleExpand={vi.fn()} />);

    expect(screen.getByText("Committee debate")).toBeInTheDocument();
    expect(screen.getByText(/Consensus 80%/)).toBeInTheDocument();
    expect(screen.getByText(/Equity Analyst: Buy \(74\/100\)/)).toBeInTheDocument();
  });

  it("renders no committee debate section when none is present on the recommendation", () => {
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    expect(screen.queryByText("Committee debate")).not.toBeInTheDocument();
  });

  it("fetches and shows uncertainty from the DecisionTrace only when expanded", async () => {
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(recommendationsApi.getDecisionTrace).toHaveBeenCalledWith("rec-1"));
    await waitFor(() => expect(screen.getByText(/Uncertainty 35\/100/)).toBeInTheDocument());
  });

  it("does not fetch decision trace or history when collapsed", () => {
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded={false} onToggleExpand={vi.fn()} />);
    expect(recommendationsApi.getDecisionTrace).not.toHaveBeenCalled();
    expect(recommendationsApi.list).not.toHaveBeenCalled();
  });

  it("shows prior superseded recommendations for the same symbol as history, excluding the current one", async () => {
    recommendationsApi.list.mockResolvedValue({
      recommendations: [
        { id: "rec-1", symbol: "NVDA", action: "BUY", status: "ACTIVE", createdAt: "2026-07-14T00:00:00.000Z" },
        { id: "rec-0", symbol: "NVDA", action: "REDUCE", status: "SUPERSEDED", createdAt: "2026-07-01T00:00:00.000Z" },
      ],
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("History for NVDA")).toBeInTheDocument());
    expect(screen.getByText(/Reduce \(SUPERSEDED\)/)).toBeInTheDocument();
  });
});
