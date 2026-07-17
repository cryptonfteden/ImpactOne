import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RecommendationCard from "./RecommendationCard";
import { recommendationsApi } from "../../services/api";

vi.mock("../../services/api", () => ({
  recommendationsApi: { getDecisionTrace: vi.fn(), list: vi.fn(), getFeedback: vi.fn(), submitFeedback: vi.fn(), recordView: vi.fn(), getDecisionReview: vi.fn() },
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
  recommendationsApi.getFeedback.mockResolvedValue({ feedback: [] });
  recommendationsApi.submitFeedback.mockResolvedValue({ id: "fb-1", feedbackType: "USEFUL" });
  recommendationsApi.recordView.mockResolvedValue({ id: "evt-1" });
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

  it("shows a labeled 'What changed' section with a real computed diff between history entries", async () => {
    recommendationsApi.list.mockResolvedValue({
      recommendations: [
        { id: "rec-1", symbol: "NVDA", action: "BUY", status: "ACTIVE", createdAt: "2026-07-14T00:00:00.000Z" },
        { id: "rec-0", symbol: "NVDA", action: "REDUCE", status: "SUPERSEDED", createdAt: "2026-07-07T00:00:00.000Z" },
        { id: "rec--1", symbol: "NVDA", action: "BUY", status: "SUPERSEDED", createdAt: "2026-07-01T00:00:00.000Z" },
      ],
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("What changed")).toBeInTheDocument());
    expect(screen.getByText(/Reduce \(SUPERSEDED\)/)).toBeInTheDocument();
    expect(screen.getByText(/Why it changed: Action: Buy → Reduce/)).toBeInTheDocument();
  });

  it("filters out repeated-tick history entries with no real change, keeping only the baseline and genuine changes", async () => {
    recommendationsApi.list.mockResolvedValue({
      recommendations: [
        { id: "rec-3", symbol: "NVDA", action: "BUY", status: "SUPERSEDED", confidenceScore: 80, createdAt: "2026-07-14T02:00:00.000Z" },
        { id: "rec-2", symbol: "NVDA", action: "BUY", status: "SUPERSEDED", confidenceScore: 80, createdAt: "2026-07-14T01:00:00.000Z" },
        { id: "rec-0", symbol: "NVDA", action: "BUY", status: "SUPERSEDED", confidenceScore: 80, createdAt: "2026-07-07T00:00:00.000Z" },
      ],
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("What changed")).toBeInTheDocument());
    expect(screen.getByText(/first tracked version/)).toBeInTheDocument();
    expect(screen.getAllByText(/Buy \(SUPERSEDED\)/)).toHaveLength(1);
  });

  it("timeline entries also surface confidence deltas and new evidence, not just action/status", async () => {
    recommendationsApi.list.mockResolvedValue({
      recommendations: [
        {
          id: "rec-2",
          symbol: "NVDA",
          action: "BUY",
          status: "ACTIVE",
          confidenceScore: 82,
          reasoning: "Strong AI capex tailwind driving conviction.",
          evidence: { matchedEvents: [{ headline: "NVDA guides above consensus" }, { headline: "Hyperscaler capex raised" }] },
          createdAt: "2026-07-14T00:00:00.000Z",
        },
        {
          id: "rec-0",
          symbol: "NVDA",
          action: "BUY",
          status: "SUPERSEDED",
          confidenceScore: 68,
          reasoning: "Early signs of AI capex acceleration.",
          evidence: { matchedEvents: [{ headline: "NVDA guides above consensus" }] },
          createdAt: "2026-07-07T00:00:00.000Z",
        },
      ],
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("What changed")).toBeInTheDocument());
    expect(screen.getByText(/What confidence changed: 68 → 82 \(rose\)/)).toBeInTheDocument();
    expect(screen.getByText(/What evidence changed: Hyperscaler capex raised/)).toBeInTheDocument();
    expect(screen.getByText(/What thesis changed: Strong AI capex tailwind driving conviction\./)).toBeInTheDocument();
  });

  it("Sprint 34 — a live quote refresh alone (same underlying thesis) does not trigger a false 'What thesis changed' entry", async () => {
    recommendationsApi.list.mockResolvedValue({
      recommendations: [
        {
          id: "rec-2",
          symbol: "NVDA",
          action: "BUY",
          status: "ACTIVE",
          confidenceScore: 82,
          reasoning: "AI conviction and risk/reward currently favor a new position (suggested size 4-6%). Currently trading at $135.20, +1.10% today.",
          evidence: { matchedEvents: [] },
          createdAt: "2026-07-14T00:00:00.000Z",
        },
        {
          id: "rec-0",
          symbol: "NVDA",
          action: "BUY",
          status: "SUPERSEDED",
          confidenceScore: 68,
          reasoning: "AI conviction and risk/reward currently favor a new position (suggested size 4-6%). Currently trading at $133.05, +0.42% today.",
          evidence: { matchedEvents: [] },
          createdAt: "2026-07-07T00:00:00.000Z",
        },
      ],
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("What changed")).toBeInTheDocument());
    expect(screen.getByText(/What confidence changed: 68 → 82 \(rose\)/)).toBeInTheDocument();
    expect(screen.queryByText(/What thesis changed/)).not.toBeInTheDocument();
  });

  it("shows a labeled 'Why now' section explaining timing, not just a bare thesis", () => {
    render(<RecommendationCard recommendation={{ ...RECOMMENDATION_FIXTURE, createdAt: "2026-07-14T00:00:00.000Z" }} isExpanded onToggleExpand={vi.fn()} />);
    expect(screen.getByText("Why now")).toBeInTheDocument();
    expect(screen.getByText(/timed to the stated 1-3 months/)).toBeInTheDocument();
  });

  it("Sprint 29 — shows all six feedback options and submits the real feedbackType on click", async () => {
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Was this useful?")).toBeInTheDocument());
    for (const label of ["Useful", "Not useful", "Too early", "Too late", "Already knew", "Don't understand"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    fireEvent.click(screen.getByText("Too early"));
    await waitFor(() => expect(recommendationsApi.submitFeedback).toHaveBeenCalledWith("rec-1", "TOO_EARLY"));
  });

  it("Sprint 29 — shows previously recorded feedback without requiring a new submission", async () => {
    recommendationsApi.getFeedback.mockResolvedValue({ feedback: [{ id: "fb-1", feedbackType: "USEFUL", createdAt: "2026-07-14T00:00:00.000Z" }] });
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Feedback recorded: Useful/)).toBeInTheDocument());
  });

  it("Sprint 30 — records a real view event when the card is expanded, never when it stays collapsed", async () => {
    const { rerender } = render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded={false} onToggleExpand={vi.fn()} />);
    expect(recommendationsApi.recordView).not.toHaveBeenCalled();

    rerender(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(recommendationsApi.recordView).toHaveBeenCalledWith("rec-1"));
  });

  it("Sprint 32 — Decision Review is never fetched until the user actually asks for it, then shows real timeline/outcome/lesson/calibration", async () => {
    recommendationsApi.getDecisionReview.mockResolvedValue({
      timeline: [{ id: "rec-1", createdAt: "2026-07-14T00:00:00.000Z", action: "BUY", status: "ACTIVE", confidenceScore: 88, isCurrent: true }],
      outcome: { gradeLabel: "CORRECT", windowReturnPct: 8.3, timeWindow: "D1", directionCorrect: true },
      lesson: { lessonText: "NVDA confirmed the bullish thesis." },
      calibration: { isStatisticallyMeaningful: true, expectedConfidence: 80, actualOutcomeHitRate: 65, calibrationTrend: "stable", sampleSize: 6 },
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Show full decision review")).toBeInTheDocument());
    expect(recommendationsApi.getDecisionReview).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Show full decision review"));
    await waitFor(() => expect(recommendationsApi.getDecisionReview).toHaveBeenCalledWith("rec-1"));
    await waitFor(() => expect(screen.getByText(/\+8\.3% over D1/)).toBeInTheDocument());
    expect(screen.getByText("NVDA confirmed the bullish thesis.")).toBeInTheDocument();
    expect(screen.getByText(/Expected 80\/100 · Actual 65%/)).toBeInTheDocument();
  });

  it("Sprint 32 Priority 5 — Decision Review never re-renders the timeline a second time (already shown in 'What changed' above)", async () => {
    recommendationsApi.list.mockResolvedValue({
      recommendations: [
        { id: "rec-0", symbol: "NVDA", action: "REDUCE", status: "SUPERSEDED", confidenceScore: 88, createdAt: "2026-07-07T00:00:00.000Z" },
      ],
    });
    recommendationsApi.getDecisionReview.mockResolvedValue({
      timeline: [{ id: "rec-1", createdAt: "2026-07-14T00:00:00.000Z", action: "BUY", status: "ACTIVE", confidenceScore: 88, isCurrent: true }],
      outcome: { gradeLabel: "CORRECT", windowReturnPct: 8.3, timeWindow: "D1", directionCorrect: true },
      lesson: { lessonText: "NVDA confirmed the bullish thesis." },
      calibration: { isStatisticallyMeaningful: true, expectedConfidence: 80, actualOutcomeHitRate: 65, calibrationTrend: "stable", sampleSize: 6 },
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("What changed")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Show full decision review"));
    await waitFor(() => expect(screen.getByText("Outcome")).toBeInTheDocument());
    expect(screen.queryByText("Timeline")).not.toBeInTheDocument();
  });

  it("Sprint 32 — Decision Review shows honest 'not graded yet' / 'no lesson yet' rather than fabricating them", async () => {
    recommendationsApi.getDecisionReview.mockResolvedValue({
      timeline: [{ id: "rec-1", createdAt: "2026-07-14T00:00:00.000Z", action: "BUY", status: "ACTIVE", confidenceScore: 88, isCurrent: true }],
      outcome: null,
      lesson: null,
      calibration: { isStatisticallyMeaningful: false, insufficientDataMessage: "More observations required (2 so far, need at least 5)." },
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Show full decision review")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Show full decision review"));

    await waitFor(() => expect(screen.getByText(/Not graded yet/)).toBeInTheDocument());
    expect(screen.getByText(/No lesson yet/)).toBeInTheDocument();
    expect(screen.getByText(/More observations required/)).toBeInTheDocument();
  });

  it("Sprint 32 Priority 4 — teaches when uncertainty is high, using the real decision trace value", async () => {
    recommendationsApi.getDecisionTrace.mockResolvedValue({ confidenceCalculation: { uncertainty: 72 } });
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Understanding this recommendation")).toBeInTheDocument());
    expect(screen.getByText(/Uncertainty is high \(72\/100\)/)).toBeInTheDocument();
  });

  it("Sprint 32 Priority 4 — explains when confidence is low, using the real recommendation confidence value", async () => {
    const lowConfidence = { ...RECOMMENDATION_FIXTURE, confidenceScore: 42 };
    render(<RecommendationCard recommendation={lowConfidence} isExpanded onToggleExpand={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Understanding this recommendation")).toBeInTheDocument());
    expect(screen.getByText(/Confidence is low \(42\/100\)/)).toBeInTheDocument();
  });

  it("Sprint 32 Priority 4 — shows no educational notes when uncertainty is low and confidence is high (nothing to teach)", async () => {
    recommendationsApi.getDecisionTrace.mockResolvedValue({ confidenceCalculation: { uncertainty: 20 } });
    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Why now")).toBeInTheDocument());
    expect(screen.queryByText("Understanding this recommendation")).not.toBeInTheDocument();
  });

  it("Sprint 32 Priority 4 — educates when the thesis genuinely changed in the most recent real timeline entry", async () => {
    recommendationsApi.list.mockResolvedValue({
      recommendations: [
        {
          id: "rec-2",
          symbol: "NVDA",
          action: "BUY",
          status: "ACTIVE",
          confidenceScore: 88,
          reasoning: "New reasoning after a real thesis shift.",
          evidence: { matchedEvents: [] },
          createdAt: "2026-07-14T00:00:00.000Z",
        },
        {
          id: "rec-0",
          symbol: "NVDA",
          action: "BUY",
          status: "SUPERSEDED",
          confidenceScore: 88,
          reasoning: "Original reasoning.",
          evidence: { matchedEvents: [] },
          createdAt: "2026-07-07T00:00:00.000Z",
        },
      ],
    });

    render(<RecommendationCard recommendation={RECOMMENDATION_FIXTURE} isExpanded onToggleExpand={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Understanding this recommendation")).toBeInTheDocument());
    expect(screen.getByText(/The thesis behind this recommendation just changed/)).toBeInTheDocument();
  });
});
