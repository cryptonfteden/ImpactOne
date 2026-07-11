import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RecommendationCard from "./RecommendationCard";

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
});
