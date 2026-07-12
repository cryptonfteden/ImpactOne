import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AiAnalysisScreen from "./AiAnalysisScreen";
import { marketApi, analysisApi, altDataApi, intelligenceApi } from "../services/api";

vi.mock("../services/api", () => ({
  marketApi: { getQuote: vi.fn() },
  analysisApi: { analyze: vi.fn(), compare: vi.fn() },
  altDataApi: { getSummary: vi.fn() },
  intelligenceApi: { analyze: vi.fn() },
}));

vi.mock("../hooks/useWatchlist", () => ({
  default: () => ({ watchlist: [], toggleTicker: vi.fn() }),
}));

const COMMITTEE_DEBATE_FIXTURE = {
  generatedAt: new Date().toISOString(),
  eventHint: "AI capex remains strong",
  supportingArguments: [{ agent: "Equity Analyst", argument: "Business quality supports upside." }],
  opposingArguments: [{ agent: "Risk Manager", argument: "Tail risk remains elevated." }],
  expertVotes: [
    { agent: "Equity Analyst", vote: "Buy", confidence: 74, rationale: "Business quality supports upside." },
    { agent: "Risk Manager", vote: "Hold", confidence: 60, rationale: "Tail risk remains elevated." },
  ],
  disagreementLevel: 20,
  consensusLevel: 80,
  expertsDisagree: false,
  disagreementExplanation: "Committee alignment is high enough to support a cleaner final recommendation.",
  voteBreakdown: [{ vote: "Buy", count: 4 }],
  specialistObservations: [
    { agent: "Equity Analyst", focus: ["Valuation"], supportingEvidence: ["Analyst posture: Buy"], unknowns: ["Future earnings quality is uncertain."] },
    { agent: "Risk Manager", focus: ["Tail risk"], supportingEvidence: ["Market impact score: 55/100"], unknowns: ["Hidden balance-sheet issues may not be visible yet."] },
  ],
  synthesis: {
    executiveSummary: "Balance of views points to buy with moderate conviction.",
    expectedReturn: "12-18%",
    risk: "Moderate",
    confidence: 74,
    investmentHorizon: "3-12 months",
    portfolioAllocationSuggestion: "3-5% tactical allocation",
    providerNotice: null,
    source: "openai",
  },
};

function mockSuccessfulLoad() {
  marketApi.getQuote.mockResolvedValue({
    quote: { price: 130.4, change: 2.1, marketCap: "3.2T", pe: 45, volume: "1B", weekHigh: 140, weekLow: 90 },
    company: { name: "NVIDIA Corporation" },
    recommendation: { label: "Buy" },
    recommendationTrend: null,
    news: [{ headline: "AI capex remains strong", datetime: 0, summary: "" }],
    chart: [],
    fearGreed: null,
  });
  analysisApi.analyze.mockResolvedValue({
    analysis: {
      investmentRating: "Buy",
      confidenceScore: 80,
      committeeDebate: COMMITTEE_DEBATE_FIXTURE,
      committeeTrackRecord: { totalDecisions: 5, accuracy: 80, winRate: 60, averageReturn: 4.2 },
    },
  });
  analysisApi.compare.mockResolvedValue({ comparison: [] });
  altDataApi.getSummary.mockResolvedValue({ signals: null });
  intelligenceApi.analyze.mockResolvedValue(null);
}

describe("AiAnalysisScreen — Investment Committee panel (Sprint 18A)", () => {
  it("renders committee debate (consensus, disagreement, expert votes) without a standalone verdict pill", async () => {
    mockSuccessfulLoad();
    render(<AiAnalysisScreen />);

    await waitFor(() => expect(screen.getByText(/Consensus 80%/)).toBeInTheDocument());

    expect(screen.getByText(/Disagreement 20%/)).toBeInTheDocument();
    expect(screen.getByText(/Balance of views points to buy with moderate conviction/)).toBeInTheDocument();
    expect(screen.getAllByText(/Equity Analyst/).length).toBeGreaterThan(0);

    // The committee section must never render a bare "Buy"/"Strong Buy"
    // decision pill of its own — no score-card__recommendation element
    // should exist anywhere on this screen's committee panel.
    const committeeSection = document.getElementById("ai-committee");
    expect(committeeSection.querySelector(".score-card__recommendation")).toBeNull();
  });

  it("shows an unavailable message, not a stale verdict, when the committee debate is absent", async () => {
    mockSuccessfulLoad();
    analysisApi.analyze.mockResolvedValue({ analysis: { investmentRating: "Buy", confidenceScore: 80 } });
    render(<AiAnalysisScreen />);

    await waitFor(() => expect(screen.getByText(/Investment committee is temporarily unavailable/)).toBeInTheDocument());
  });
});
