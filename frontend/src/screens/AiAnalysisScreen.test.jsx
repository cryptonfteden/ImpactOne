import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AiAnalysisScreen from "./AiAnalysisScreen";
import { marketApi, analysisApi, altDataApi, intelligenceApi, claimsApi } from "../services/api";

vi.mock("../services/api", () => ({
  marketApi: { getQuote: vi.fn() },
  analysisApi: { analyze: vi.fn(), compare: vi.fn() },
  altDataApi: { getSummary: vi.fn() },
  intelligenceApi: { analyze: vi.fn() },
  claimsApi: { listBySymbol: vi.fn() },
  performanceMetricsApi: { recordClientTiming: vi.fn().mockResolvedValue() },
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
  claimsApi.listBySymbol.mockResolvedValue({ claims: [] });
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

describe("AiAnalysisScreen — Claims-Based Analysis (Phase UI-INTEGRATION-001)", () => {
  it("shows the honest empty state when no active Claim exists for this symbol", async () => {
    mockSuccessfulLoad();
    render(<AiAnalysisScreen />);

    await waitFor(() => expect(screen.getByText(/No active Claim exists for this symbol yet/)).toBeInTheDocument());
  });

  it("generates the required Claims-based report structure from a real Claim, never fabricating unsupported fields", async () => {
    mockSuccessfulLoad();
    claimsApi.listBySymbol.mockResolvedValue({
      claims: [
        {
          claimId: "c1",
          status: "STRENGTHENING",
          expectedDirection: "BULLISH",
          confidence: 82,
          probability: 65,
          statement: "NVDA demand outpaces supply through Q3.",
          plainLanguageStatement: "NVDA looks set to keep beating expectations.",
          evidence: [{ id: "e1", observedFact: "Real capex guidance raised." }],
          counterEvidence: [{ id: "e2", observedFact: "Real export restriction risk." }],
          invalidationConditions: ["A confirmed capex pullback from a major hyperscaler."],
          assumptions: ["Assumes no new export control action this quarter."],
          portfolioImpact: null,
        },
      ],
    });
    render(<AiAnalysisScreen />);

    // Executive Summary and Why this matters both honestly show real
    // fields off the same Claim (plainLanguageStatement / statement), so
    // some duplication across sections is expected, never fabricated.
    await waitFor(() => expect(screen.getAllByText("NVDA looks set to keep beating expectations.").length).toBeGreaterThan(0));
    expect(screen.getByText("Real capex guidance raised.")).toBeInTheDocument();
    expect(screen.getByText("Real export restriction risk.")).toBeInTheDocument();
    expect(screen.getAllByText(/82\/100/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Probability 65%/)).toBeInTheDocument();
    expect(screen.getByText("Assumes no new export control action this quarter.")).toBeInTheDocument();
    expect(screen.getByText("A confirmed capex pullback from a major hyperscaler.")).toBeInTheDocument();
    expect(screen.getByText(/Scenario preview not yet available/)).toBeInTheDocument();
    expect(screen.getByText("No real portfolio impact computed for this Claim yet.")).toBeInTheDocument();

    // The required section order: Executive Summary, Why this matters,
    // Evidence, Counter evidence, Portfolio impact, Possible outcomes,
    // Confidence, Unknowns, Things to monitor next.
    const headings = Array.from(document.querySelectorAll("#ai-claims h4")).map((el) => el.textContent);
    expect(headings).toEqual([
      "Executive Summary",
      "Why this matters",
      "Evidence",
      "Counter evidence",
      "Portfolio impact",
      "Possible outcomes",
      "Confidence",
      "Unknowns",
      "Things to monitor next",
    ]);
  });

  it("shows an honest error state without blocking the rest of the screen when the claims fetch fails", async () => {
    mockSuccessfulLoad();
    claimsApi.listBySymbol.mockRejectedValue(new Error("down"));
    render(<AiAnalysisScreen />);

    await waitFor(() => expect(screen.getByText("Claims are temporarily unavailable for this symbol.")).toBeInTheDocument());
    expect(screen.getByText("NVIDIA Corporation")).toBeInTheDocument();
  });
});
