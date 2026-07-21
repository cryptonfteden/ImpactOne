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

// Sprint 41 — Committee Unification: the ONE committee's real output shape
// (committeeCoordinator.summarizeCommittee + chiefInvestmentOfficerService.summarizeForCio).
const COMMITTEE_FIXTURE = {
  members: [
    {
      memberId: "equityResearchSpecialist",
      memberName: "Equity Analyst",
      headline: "Business quality supports upside.",
      reasoning: "Analyst ratings skew positive.",
      supportingEvidence: [{ category: "ANALYSTS", reason: "Business quality supports upside." }],
      counterEvidence: [],
      confidence: 74,
      uncertainty: 26,
      freshness: "CURRENT",
      missingEvidence: [],
      isRecommendation: false,
    },
    {
      memberId: "marketSentimentSpecialist",
      memberName: "Risk Manager",
      headline: "Tail risk remains elevated.",
      reasoning: "Crowding risk is high.",
      supportingEvidence: [],
      counterEvidence: [{ category: "SENTIMENT", reason: "Tail risk remains elevated." }],
      confidence: 60,
      uncertainty: 40,
      freshness: "CURRENT",
      missingEvidence: [],
      isRecommendation: false,
    },
  ],
  agreement: { status: "NO_CLEAR_AGREEMENT", direction: null, members: [] },
  disagreement: { status: "DISAGREEMENT", supportiveMembers: ["equityResearchSpecialist"], contraryMembers: ["marketSentimentSpecialist"] },
  strongestSupportingEvidence: { memberId: "equityResearchSpecialist", category: "ANALYSTS", reason: "Business quality supports upside.", memberConfidence: 74 },
  strongestContradictoryEvidence: { memberId: "marketSentimentSpecialist", category: "SENTIMENT", reason: "Tail risk remains elevated.", memberConfidence: 60 },
  missingEvidence: [],
  staleEvidence: [],
  isVerdict: false,
};

const CIO_FIXTURE = {
  overallThesis: "Balance of views points to buy with moderate conviction.",
  confidence: "LOW_SPLIT",
  largestDisagreement: "equityResearchSpecialist vs. marketSentimentSpecialist",
  highestRisk: "marketSentimentSpecialist: Tail risk remains elevated.",
  missingInformation: [],
  whyRecommendationExists: "Analyst evidence leans positive.",
  whyRecommendationMayBeWrong: ["Committee members disagree: equityResearchSpecialist vs. marketSentimentSpecialist."],
  isVerdict: false,
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
      committee: COMMITTEE_FIXTURE,
      cio: CIO_FIXTURE,
    },
  });
  analysisApi.compare.mockResolvedValue({ comparison: [] });
  altDataApi.getSummary.mockResolvedValue({ signals: null });
  intelligenceApi.analyze.mockResolvedValue(null);
}

describe("AiAnalysisScreen — Investment Committee panel (Sprint 18A, unified Sprint 41)", () => {
  it("Sprint 41 — renders the unified committee's real debate (members, agreement/disagreement, CIO thesis) without a standalone verdict pill", async () => {
    mockSuccessfulLoad();
    render(<AiAnalysisScreen />);

    await waitFor(() => expect(screen.getByText(/Disagreement among specialists/)).toBeInTheDocument());

    expect(screen.getByText(/Balance of views points to buy with moderate conviction/)).toBeInTheDocument();
    expect(screen.getByText(/Largest disagreement: equityResearchSpecialist vs. marketSentimentSpecialist/)).toBeInTheDocument();
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
