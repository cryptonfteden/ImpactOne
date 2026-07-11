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

vi.mock("../hooks/useWatchlist", () => ({
  default: () => ({ watchlist: ["PLTR"], addTicker: vi.fn() }),
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
    supportingEvidence: [{ headline: "AI capex supercycle", whyItMatters: "Hyperscaler spend accelerating." }],
    opposingEvidence: [{ headline: "Valuation stretched", whyItMatters: "Multiple expansion outpacing earnings.", counterarguments: ["May already be priced in."] }],
    keyRisks: ["Valuation stretched"],
    invalidationConditions: ["Supporting data fails to confirm the first-order move."],
    timeHorizon: "1-3 months",
    affectedPositions: [{ symbol: "NVDA", quantity: 10, marketValue: 2100, weightPct: 12, sector: "Semiconductors" }],
    affectedWatchlistSymbols: [],
    confidenceDrivers: ["Strong opportunity score (92/100)."],
    confidenceReducers: ["Elevated macro exposure to broader conditions (72/100)."],
  },
  scenarios: [
    { case: "bull", narrative: "AI capex accelerates.", probability: 0.3, priceImpact: "15-22%", portfolioImpact: "+1.8% of total portfolio value (approx.)", catalysts: ["AI capex supercycle"], risks: [], invalidationTrigger: "Supporting data fails to confirm the first-order move." },
    { case: "base", narrative: "Leadership stays concentrated.", probability: 0.5, priceImpact: "4-9%", portfolioImpact: null, catalysts: ["Mixed market impact expected."], risks: ["Valuation stretched"], invalidationTrigger: "Sector leadership rotates away from affected assets." },
    { case: "bear", narrative: "Valuation de-rating.", probability: 0.2, priceImpact: "-8% tactical stop", portfolioImpact: null, catalysts: ["Valuation stretched"], risks: ["Valuation stretched"], invalidationTrigger: "Sector leadership rotates away from affected assets." },
  ],
  evidence: {
    symbolSource: "portfolio",
    matchedEvents: [
      { headline: "AI capex supercycle", confidence: 82, sourceUrl: "https://news.example.com/ai-capex", sourceName: "Reuters", personalRelevance: "Directly affects NVDA — 12% of your portfolio.", publishedAt: "2026-07-11T10:00:00.000Z" },
    ],
  },
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
    expect(screen.getByText("From your portfolio")).toBeInTheDocument();
    expect(screen.getByText("Quality 82/100")).toBeInTheDocument();
    expect(screen.getByText("Buy NVDA: AI capex supercycle.")).toBeInTheDocument();
    expect(screen.queryByText(/Strong AI capex tailwind driving conviction/)).not.toBeInTheDocument();
  });

  it("expands full evidence on click, showing scenarios, quality breakdown, portfolio exposure, matched-event citation with timestamp, and never renders a place-order control", async () => {
    recommendationsApi.list.mockResolvedValue({ recommendations: [RECOMMENDATION_FIXTURE] });
    recommendationsApi.status.mockResolvedValue(STATUS_FIXTURE);

    render(<RecommendationsScreen />);
    await waitFor(() => expect(screen.getByText("NVDA")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Show full evidence" }));

    // reasoning + explanation
    expect(screen.getByText(/Strong AI capex tailwind driving conviction/)).toBeInTheDocument();
    expect(screen.getByText(/12% of portfolio/)).toBeInTheDocument();
    expect(screen.getAllByText(/Valuation stretched/).length).toBeGreaterThan(0);
    expect(screen.getByText(/May already be priced in/)).toBeInTheDocument();
    expect(screen.getAllByText(/Supporting data fails to confirm the first-order move/).length).toBeGreaterThan(0);

    // scenarios
    expect(screen.getByText("Bull")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Bear")).toBeInTheDocument();

    // quality breakdown
    expect(screen.getByText("Source quality")).toBeInTheDocument();
    expect(screen.getByText("95/100")).toBeInTheDocument();

    // matched-event citation + timestamp + confidence
    expect(screen.getByText(/Directly affects NVDA/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence 82\/100/)).toBeInTheDocument();

    const sourceLink = screen.getByRole("link", { name: "Reuters" });
    expect(sourceLink).toHaveAttribute("href", "https://news.example.com/ai-capex");

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
    expect(recommendationsApi.run).toHaveBeenCalledWith(["PLTR"]);
    expect(recommendationsApi.list).toHaveBeenCalledTimes(2);
  });
});
