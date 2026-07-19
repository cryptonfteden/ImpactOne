import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import IntelligenceConsoleScreen from "./IntelligenceConsoleScreen";
import { providerApi, qualityDashboardApi, marketIntelligenceApi, committeeIntelligenceApi } from "../services/api";

vi.mock("../services/api", () => ({
  providerApi: { list: vi.fn(), getMetrics: vi.fn(), getDiagnostics: vi.fn(), getMetadata: vi.fn(), run: vi.fn() },
  qualityDashboardApi: { get: vi.fn(), getLearningSignals: vi.fn() },
  marketIntelligenceApi: { getProviderInventory: vi.fn(), getEvidenceMatrix: vi.fn(), getTechnical: vi.fn() },
  committeeIntelligenceApi: { convene: vi.fn() },
}));

const PROVIDERS_FIXTURE = {
  providers: [
    { providerId: "sec", label: "SEC (EDGAR filings)", sourceType: "regulatory-filing", lastRunAt: null, lastStatus: null, successRate: null },
    { providerId: "reddit", label: "Reddit", sourceType: "social", lastRunAt: "2026-07-13T00:00:00.000Z", lastStatus: "SUCCESS", successRate: 100 },
  ],
};

const METRICS_FIXTURE = { providerId: "sec", totalRuns: 0, totalItemsFetched: 0, totalItemsPersisted: 0, totalItemsDeduped: 0, dedupRate: null, errorRate: null, avgDurationMs: null, lastSuccessAt: null };
const DIAGNOSTICS_FIXTURE = { providerId: "sec", contractValid: true, contractIssues: [], rateLimiter: { maxPerMinute: 10, currentCount: 0, windowResetInMs: 60000 }, lastError: null };
const METADATA_FIXTURE = { providerId: "sec", label: "SEC (EDGAR filings)", sourceType: "regulatory-filing", category: "regulation", defaultThemes: [], rateLimit: { maxPerMinute: 10 } };

const QUALITY_DASHBOARD_FIXTURE = {
  hitRate: 67,
  confidenceCalibration: 72,
  avgHoldingPeriodHours: 24.3,
  avgUncertainty: 35,
  outcomeCompletion: 80,
  sampleSizes: { totalPredictions: 10, totalOutcomes: 8, gradedOutcomes: 6, decisionTraces: 10 },
};

const LEARNING_SIGNALS_FIXTURE = {
  feedbackSignals: { totalFeedback: 3, byType: { USEFUL: 2, NOT_USEFUL: 1 }, mostUsefulSymbols: ["NVDA"], leastUsefulSymbols: ["AAPL"] },
  outcomeSignals: { hitRate: 67, confidenceCalibration: 72, outcomeCompletion: 80 },
  themeSignals: { strengthenedThemes: ["ai"], weakenedThemes: [], disappearedThemes: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  qualityDashboardApi.get.mockResolvedValue(QUALITY_DASHBOARD_FIXTURE);
  qualityDashboardApi.getLearningSignals.mockResolvedValue(LEARNING_SIGNALS_FIXTURE);
  marketIntelligenceApi.getProviderInventory.mockResolvedValue({ providers: [] });
});

describe("IntelligenceConsoleScreen", () => {
  it("renders all providers from the list", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("SEC (EDGAR filings)")).toBeInTheDocument());
    expect(screen.getByText("Reddit")).toBeInTheDocument();
  });

  it("expands a provider to show metrics, diagnostics, and metadata, fetching each once", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    providerApi.getMetrics.mockResolvedValue(METRICS_FIXTURE);
    providerApi.getDiagnostics.mockResolvedValue(DIAGNOSTICS_FIXTURE);
    providerApi.getMetadata.mockResolvedValue(METADATA_FIXTURE);
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("SEC (EDGAR filings)")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Show details")[0]);

    await waitFor(() => expect(screen.getByText(/Contract: Valid/)).toBeInTheDocument());
    expect(providerApi.getMetrics).toHaveBeenCalledTimes(1);
    expect(providerApi.getDiagnostics).toHaveBeenCalledTimes(1);
    expect(providerApi.getMetadata).toHaveBeenCalledTimes(1);
  });

  it("triggers a manual run and shows its result", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    providerApi.run.mockResolvedValue({ providerId: "sec", status: "SUCCESS", itemsFetched: 0, itemsPersisted: 0, itemsDeduped: 0 });
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("SEC (EDGAR filings)")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Run now")[0]);

    await waitFor(() => expect(providerApi.run).toHaveBeenCalledWith("sec"));
    await waitFor(() => expect(screen.getByText(/Last manual run: SUCCESS/)).toBeInTheDocument());
  });

  it("never renders a buy/execute/place-order affordance anywhere on this screen", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("SEC (EDGAR filings)")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /buy|place order|execute/i })).not.toBeInTheDocument();
  });

  it("Sprint 29 — shows the real Recommendation Quality Dashboard metrics (hit rate, calibration, holding period, uncertainty, completion)", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("67%")).toBeInTheDocument());
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("24.3h")).toBeInTheDocument();
    expect(screen.getByText("35/100")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("Sprint 29 — quality dashboard shows an honest 'not enough data yet' for null metrics instead of a misleading 0", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    qualityDashboardApi.get.mockResolvedValue({
      hitRate: null,
      confidenceCalibration: null,
      avgHoldingPeriodHours: null,
      avgUncertainty: null,
      outcomeCompletion: null,
      sampleSizes: { totalPredictions: 0, totalOutcomes: 0, gradedOutcomes: 0, decisionTraces: 0 },
    });
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getAllByText("Not enough data yet").length).toBe(5));
  });

  it("Sprint 30 — shows real Learning Loop signals (feedback totals, most/least useful symbols, theme strengthened/weakened/disappeared)", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("3 total feedback entries")).toBeInTheDocument());
    expect(screen.getByText(/Most useful: NVDA/)).toBeInTheDocument();
    expect(screen.getByText(/Least useful: AAPL/)).toBeInTheDocument();
    expect(screen.getByText(/Strengthened: ai/)).toBeInTheDocument();
    expect(screen.getByText(/Weakened: None/)).toBeInTheDocument();
  });

  it("Sprint 37 — renders the generated provider inventory with a real status pill", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    marketIntelligenceApi.getProviderInventory.mockResolvedValue({
      providers: [{ providerId: "cftcCot", label: "CFTC Commitments of Traders", category: "FUTURES_COT", status: "LIVE", lastSuccessfulRetrieval: "2026-07-17T00:00:00.000Z", authenticationRequirement: "None (public, no-auth source)" }],
    });
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("CFTC Commitments of Traders")).toBeInTheDocument());
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("Sprint 37 — loading the evidence matrix surfaces real cross-source disagreement, not a blended score", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    marketIntelligenceApi.getEvidenceMatrix.mockResolvedValue({
      symbol: "AAPL",
      isVerdict: false,
      categories: [
        { category: "ANALYSTS", stance: "CONTRADICTORY", disagreement: true, confidence: 25, uncertainty: 75, sourceCount: 3, strongestCounterEvidence: "zacks rates this \"Hold\" while finviz rates it \"Strong Buy\"." },
      ],
    });
    render(<IntelligenceConsoleScreen />);
    await waitFor(() => expect(screen.getByText("Load evidence matrix")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Load evidence matrix"));

    await waitFor(() => expect(screen.getByText(/DISAGREEMENT/)).toBeInTheDocument());
    expect(screen.getByText(/zacks rates this/)).toBeInTheDocument();
  });

  it("Sprint 38 — convening the committee shows each specialist's confidence, counter-evidence, and the CIO's largest disagreement", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    committeeIntelligenceApi.convene.mockResolvedValue({
      symbol: "AAPL",
      isVerdict: false,
      committee: {
        members: [
          { memberId: "technicalAnalyst", memberName: "Technical Analyst", headline: "Technical structure is supportive.", confidence: 60, uncertainty: 40, freshness: "CURRENT", counterEvidence: [], missingEvidence: [] },
          { memberId: "equityResearchSpecialist", memberName: "Equity Research Specialist", headline: "Analysts disagree — this is not a consensus view.", confidence: 25, uncertainty: 75, freshness: "UNKNOWN", counterEvidence: [{ category: "ANALYSTS", reason: "zacks rates this Hold while finviz rates it Strong Buy" }], missingEvidence: [] },
        ],
        isVerdict: false,
      },
      cio: {
        overallThesis: "The committee is split.",
        confidence: "LOW_SPLIT",
        largestDisagreement: "technicalAnalyst vs. equityResearchSpecialist",
        highestRisk: "equityResearchSpecialist: zacks rates this Hold while finviz rates it Strong Buy",
        missingInformation: [],
        whyRecommendationMayBeWrong: ["Committee members disagree: technicalAnalyst vs. equityResearchSpecialist."],
        isVerdict: false,
      },
    });
    render(<IntelligenceConsoleScreen />);
    await waitFor(() => expect(screen.getByText("Convene committee")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Convene committee"));

    await waitFor(() => expect(screen.getByText("Technical Analyst")).toBeInTheDocument());
    expect(screen.getByText("Equity Research Specialist")).toBeInTheDocument();
    expect(screen.getAllByText(/technicalAnalyst vs. equityResearchSpecialist/).length).toBeGreaterThan(0);
  });
});
