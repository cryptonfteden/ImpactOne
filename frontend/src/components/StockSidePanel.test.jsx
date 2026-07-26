import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StockSidePanel from "./StockSidePanel";
import { marketApi, portfolioEngineApi, priceAlertsApi, watchlistFoldersApi, impactGraphApi, symbolIntelligenceApi, claimsApi, optionsAgentApi, marketSentimentApi } from "../services/api";

vi.mock("../services/api", () => ({
  marketApi: { getQuote: vi.fn() },
  symbolIntelligenceApi: { get: vi.fn() },
  portfolioEngineApi: { getSummary: vi.fn() },
  priceAlertsApi: { list: vi.fn() },
  watchlistFoldersApi: { list: vi.fn() },
  impactGraphApi: { getGraph: vi.fn() },
  claimsApi: { listBySymbol: vi.fn() },
  optionsAgentApi: { getSymbolView: vi.fn() },
  marketSentimentApi: { getOverview: vi.fn() },
}));

vi.mock("./chart/AdvancedChart", () => ({ default: () => <div>Chart placeholder</div> }));
vi.mock("./ImpactGraph", () => ({ default: () => <div data-testid="impact-graph" /> }));

const QUOTE_FIXTURE = {
  quote: { price: 320, change: 5, changePercent: 1.5, companyDescription: "A real company description." },
  news: [{ headline: "Real headline one" }, { headline: "Real headline two" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  marketApi.getQuote.mockResolvedValue(QUOTE_FIXTURE);
  symbolIntelligenceApi.get.mockResolvedValue({
    symbol: "AAPL",
    opportunityScore: { symbol: "AAPL", score: 72, explanation: [{ factor: "momentum", weight: 20, available: true, realValue: 5, normalizedContribution: 60 }] },
    marketPositioning: { longPressure: [], shortPressure: [], excludedFromUniverse: [] },
    impactGraph: { status: "NO_DATA" },
    aiSummary: null,
    alerts: [],
  });
  portfolioEngineApi.getSummary.mockResolvedValue({ positions: [] });
  priceAlertsApi.list.mockResolvedValue({ alerts: [] });
  watchlistFoldersApi.list.mockResolvedValue({ folders: [] });
  impactGraphApi.getGraph.mockResolvedValue({ symbol: "AAPL", status: "NO_DATA", nodes: [], edges: [], message: "No WorldMemoryRecord mentions AAPL yet." });
  claimsApi.listBySymbol.mockResolvedValue({ claims: [] });
  optionsAgentApi.getSymbolView.mockResolvedValue({ unavailable: true, reason: "Options flow provider is not connected yet.", recentSignals: [] });
  marketSentimentApi.getOverview.mockResolvedValue({ market: "US", score: null, confidence: null });
});

describe("StockSidePanel", () => {
  it("renders all nine required sections plus the Phase X3 Impact Graph, with no page navigation", async () => {
    render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());

    for (const section of ["Overview", "Chart", "AI Summary", "Portfolio Impact", "Latest News", "Opportunity Score", "Market Positioning", "Impact Graph", "Alerts", "Workspace Membership"]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
    expect(screen.getByText("Chart placeholder")).toBeInTheDocument();
  });

  it("shows the real opportunity score and per-factor explanation, never fabricated", async () => {
    render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("72")).toBeInTheDocument());
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("AI Summary shows the real active recommendation from the canonical symbolIntelligenceService object", async () => {
    symbolIntelligenceApi.get.mockResolvedValue({
      symbol: "AAPL",
      opportunityScore: { symbol: "AAPL", score: 72, explanation: [] },
      marketPositioning: { longPressure: [], shortPressure: [], excludedFromUniverse: [] },
      impactGraph: { status: "NO_DATA" },
      aiSummary: { action: "BUY", qualityScore: 81, riskLabel: "Moderate", reasoning: "Real, composed reasoning text." },
      alerts: [],
    });
    render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Real, composed reasoning text.")).toBeInTheDocument());
    expect(screen.getByText("BUY")).toBeInTheDocument();
    expect(screen.getByText("Quality 81/100 · Risk Moderate")).toBeInTheDocument();
  });

  it("AI Summary honestly falls back when no active recommendation exists and no company description either", async () => {
    marketApi.getQuote.mockResolvedValue({ quote: { price: 320, change: 5, changePercent: 1.5 }, news: [] });
    render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/No active AI recommendation/)).toBeInTheDocument());
  });

  it("shows real portfolio impact when a position exists", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue({ positions: [{ symbol: "AAPL", quantity: 10, unrealizedPnl: "125.50" }] });
    render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("10 shares held")).toBeInTheDocument());
  });

  it("shows an honest empty state for portfolio impact with no position", async () => {
    render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/No open position in AAPL/)).toBeInTheDocument());
  });

  it("close button calls onClose", async () => {
    const onClose = vi.fn();
    render(<StockSidePanel symbol="AAPL" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText("Overview")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders real workspace folder membership when the symbol is tracked", async () => {
    watchlistFoldersApi.list.mockResolvedValue({ folders: [{ id: "f1", name: "AI", items: [{ symbol: "AAPL" }] }] });
    render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
  });

  describe("Phase UI-INTEGRATION-001 — canonical intelligence view", () => {
    it("shows honest empty states across every new intelligence section when nothing real exists yet", async () => {
      render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);

      await waitFor(() => expect(screen.getByText("No active claim exists for this symbol right now.")).toBeInTheDocument());
      expect(screen.getByText("No active Claim exists yet to explain why this symbol matters today.")).toBeInTheDocument();
      expect(screen.getByText("No active claims for this symbol right now.")).toBeInTheDocument();
      expect(screen.getByText("No real supporting evidence recorded yet.")).toBeInTheDocument();
      expect(screen.getByText("No real counter-evidence recorded yet.")).toBeInTheDocument();
      expect(screen.getByText("Options flow provider is not connected yet.")).toBeInTheDocument();
      expect(screen.getByText("No claim history for this symbol yet.")).toBeInTheDocument();
      expect(screen.getByText("No resolved claims for this symbol yet.")).toBeInTheDocument();
      expect(screen.getByText(/Scenario preview not yet available/)).toBeInTheDocument();
    });

    it("shows a real active claim as the Current Platform View, with real confidence and probability", async () => {
      claimsApi.listBySymbol.mockResolvedValue({
        claims: [
          {
            claimId: "c1",
            status: "ACTIVE",
            expectedDirection: "BULLISH",
            confidence: 70,
            probability: 60,
            statement: "AAPL bullish",
            plainLanguageStatement: "AAPL looks likely to rise.",
            evidence: [{ id: "e1", observedFact: "Real sweep." }],
            counterEvidence: [],
            lastUpdatedAt: "2026-07-27T00:00:00.000Z",
            attentionScore: 74,
            attentionExplanation: "Ranked 74/100, driven mainly by confidence (70), portfolio relevance (20).",
          },
        ],
      });
      render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);

      // The one real claim honestly qualifies for both "Why This Symbol
      // Matters Today"/"Current Platform View" (the highest-confidence
      // active claim) and "Active Claims" (the full list) and, since it
      // has a real lastUpdatedAt, the historical timeline too — so it
      // legitimately renders more than once.
      await waitFor(() => expect(screen.getAllByText("AAPL looks likely to rise.").length).toBeGreaterThan(0));
      expect(screen.getByText(/Confidence 70\/100/)).toBeInTheDocument();
      expect(screen.getByText("Real sweep.")).toBeInTheDocument();
    });

    it("Phase PRODUCT-001 — leads with 'Why This Symbol Matters Today', showing the real Attention Score and explanation", async () => {
      claimsApi.listBySymbol.mockResolvedValue({
        claims: [
          {
            claimId: "c1",
            status: "ACTIVE",
            expectedDirection: "BULLISH",
            confidence: 70,
            probability: 60,
            statement: "AAPL bullish",
            plainLanguageStatement: "AAPL looks likely to rise.",
            evidence: [],
            counterEvidence: [],
            lastUpdatedAt: "2026-07-27T00:00:00.000Z",
            attentionScore: 74,
            attentionExplanation: "Ranked 74/100, driven mainly by confidence (70).",
          },
        ],
      });
      render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);

      await waitFor(() => expect(screen.getByText("Why This Symbol Matters Today")).toBeInTheDocument());
      expect(screen.getByText(/Attention score: 74\/100 — Ranked 74\/100, driven mainly by confidence \(70\)\./)).toBeInTheDocument();

      // It must be the very first section, before Overview.
      const sectionTitles = Array.from(document.querySelectorAll(".side-panel__section-title")).map((el) => el.textContent);
      expect(sectionTitles[0]).toBe("Why This Symbol Matters Today");
      expect(sectionTitles[1]).toBe("Overview");
    });

    it("a failed claims fetch shows an honest error state without blocking the rest of the panel", async () => {
      claimsApi.listBySymbol.mockRejectedValue(new Error("down"));
      render(<StockSidePanel symbol="AAPL" onClose={vi.fn()} />);

      // The same real claims error honestly shows in both "Why This Symbol
      // Matters Today" (the new lead section) and "Current Platform View".
      await waitFor(() => expect(screen.getAllByText("Claims are temporarily unavailable for this symbol.").length).toBeGreaterThan(0));
      expect(screen.getByText("Chart placeholder")).toBeInTheDocument();
    });
  });
});
