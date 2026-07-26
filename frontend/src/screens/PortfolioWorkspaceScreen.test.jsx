import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import PortfolioWorkspaceScreen from "./PortfolioWorkspaceScreen";
import { portfolioEngineApi, claimsApi } from "../services/api";
import { I18nProvider } from "../i18n/I18nProvider";
import { fallbackSummary } from "./portfolioWorkspace/portfolioWorkspaceMockData";

function renderScreen() {
  return render(
    <I18nProvider>
      <PortfolioWorkspaceScreen />
    </I18nProvider>
  );
}

vi.mock("../services/api", () => ({
  portfolioEngineApi: { getSummary: vi.fn(), getPerformanceDelta: vi.fn() },
  claimsApi: { listPortfolioRelevant: vi.fn() },
}));

const SUMMARY_WITH_POSITIONS = {
  cashBalance: 5000,
  startingCapital: 100000,
  positionsValue: 95000,
  totalValue: 100000,
  realizedPnl: 1200,
  unrealizedPnl: 3400,
  dailyPnl: 800,
  dailyPnlPct: 0.8,
  totalReturn: 4600,
  totalReturnPct: 4.6,
  positions: [
    { id: "p1", symbol: "NVDA", sector: "Technology", assetType: "equity", quantity: 100, avgEntryPrice: 400, currentPrice: 480, marketValue: 48000, unrealizedPnl: 8000, unrealizedPnlPct: 20, dailyPnl: 500, dayChangePercent: 1.2, openedAt: "2026-01-01T00:00:00.000Z" },
    { id: "p2", symbol: "META", sector: "Technology", assetType: "equity", quantity: 50, avgEntryPrice: 500, currentPrice: 420, marketValue: 21000, unrealizedPnl: -4000, unrealizedPnlPct: -16, dailyPnl: -200, dayChangePercent: -0.9, openedAt: "2026-01-01T00:00:00.000Z" },
    { id: "p3", symbol: "XOM", sector: "Energy", assetType: "equity", quantity: 200, avgEntryPrice: 100, currentPrice: 130, marketValue: 26000, unrealizedPnl: 6000, unrealizedPnlPct: 30, dailyPnl: 100, dayChangePercent: 0.4, openedAt: "2026-01-01T00:00:00.000Z" },
  ],
  allocation: {
    bySector: [
      { name: "Technology", value: 69000, pct: 69 },
      { name: "Energy", value: 26000, pct: 26 },
    ],
    byAssetType: [{ name: "equity", value: 95000, pct: 95 }],
  },
  benchmarkSymbol: "SPY",
  updatedAt: "2026-07-25T00:00:00.000Z",
};

const SUMMARY_EMPTY = {
  cashBalance: 0,
  startingCapital: 0,
  positionsValue: 0,
  totalValue: 0,
  realizedPnl: 0,
  unrealizedPnl: 0,
  dailyPnl: 0,
  dailyPnlPct: 0,
  totalReturn: 0,
  totalReturnPct: 0,
  positions: [],
  allocation: { bySector: [], byAssetType: [] },
  benchmarkSymbol: "SPY",
  updatedAt: "2026-07-25T00:00:00.000Z",
};

const DELTA_NO_COMPARISON = { hasComparison: false, totalValue: 100000, changes: [], summary: null };
const DELTA_WITH_COMPARISON = { hasComparison: true, previousCapturedAt: "2026-07-24T00:00:00.000Z", totalValue: 100000, valueChangeAbs: 800, valueChangePct: 0.8, changes: [], summary: "Portfolio value up 0.8% since yesterday." };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  claimsApi.listPortfolioRelevant.mockResolvedValue({ claims: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText("The AI operating center for your holdings")).toBeInTheDocument());
}

describe("PortfolioWorkspaceScreen — Phase PORTFOLIO-001 (Mission Control architecture)", () => {
  it("renders the three Mission-Control-style tiers, each as its own region", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
    renderScreen();
    await waitForLoaded();

    expect(screen.getByRole("region", { name: "Portfolio Brief" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your Positions" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Context" })).toBeInTheDocument();
  });

  it("hides the Demo Mode indicator entirely when every section is live", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
    renderScreen();
    await waitForLoaded();

    expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
  });

  describe("Tier 1 — Portfolio Brief", () => {
    it("the hero shows real total value, total return, and the single highest-Attention real claim as 'why'", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
      claimsApi.listPortfolioRelevant.mockResolvedValue({
        claims: [
          {
            claimId: "c1",
            symbols: ["NVDA"],
            expectedDirection: "BULLISH",
            confidence: 78,
            probability: 60,
            attentionScore: 88,
            status: "ACTIVE",
            statement: "NVDA is expected to trend bullish.",
            plainLanguageStatement: "NVDA looks likely to rise.",
            portfolioImpact: { magnitude: 70, direction: "positive" },
            evidence: [{ observedFact: "NVDA calls swept 3 exchanges." }],
            counterEvidence: [],
          },
        ],
      });
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Portfolio Brief" });
      await waitFor(() => expect(within(region).getByText("$100,000")).toBeInTheDocument());
      expect(within(region).getByText("4.60% total return")).toBeInTheDocument();
      expect(within(region).getByText("+0.8% since yesterday")).toBeInTheDocument();
      expect(within(region).getByText("NVDA looks likely to rise.")).toBeInTheDocument();
      expect(within(region).getByRole("img", { name: "Attention 88 out of 100" })).toBeInTheDocument();
    });

    it("the hero honestly states no Claim explains performance when none exist", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
      claimsApi.listPortfolioRelevant.mockResolvedValue({ claims: [] });
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Portfolio Brief" });
      expect(within(region).getByText("No active Claims currently explain your portfolio's performance.")).toBeInTheDocument();
    });

    it("What Changed Since Yesterday shows real portfolio changes when a comparison exists", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue({
        hasComparison: true,
        totalValue: 100000,
        changes: [{ dimension: "totalValue", label: "Total portfolio value", beforeValue: 99000, afterValue: 100000, changePct: 1.01 }],
        summary: "Portfolio value up 1.01% since the last snapshot.",
      });
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Portfolio Brief" });
      expect(within(region).getByText(/Total portfolio value/)).toBeInTheDocument();
      expect(within(region).getByText(/99000/)).toBeInTheDocument();
    });

    it("What Changed Since Yesterday shows the honest no-comparison message on day one", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Portfolio Brief" });
      expect(within(region).getByText("No prior-day snapshot yet — this is the first day being tracked.")).toBeInTheDocument();
    });
  });

  describe("Tier 2 — Your Positions", () => {
    it("Which Positions Need Attention ranks real positions by real Attention Score, honestly marking positions with no claims", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      claimsApi.listPortfolioRelevant.mockResolvedValue({
        claims: [{ claimId: "c1", symbols: ["META"], attentionScore: 91, confidence: 70, expectedDirection: "BEARISH", status: "WEAKENING", plainLanguageStatement: "META claim." }],
      });
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Your Positions" });
      expect(within(region).getByRole("img", { name: "Attention 91 out of 100" })).toBeInTheDocument();
      expect(within(region).getAllByText("No claims affecting this position").length).toBe(2);
    });

    it("Why This Affects You shows real Claims affecting the portfolio, with separate Confidence and Probability MetricArcs", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      claimsApi.listPortfolioRelevant.mockResolvedValue({
        claims: [
          {
            claimId: "c1",
            symbols: ["NVDA"],
            expectedDirection: "BULLISH",
            confidence: 78,
            probability: 62,
            attentionScore: 50,
            status: "ACTIVE",
            statement: "NVDA is expected to trend bullish.",
            plainLanguageStatement: "NVDA looks likely to rise.",
            portfolioImpact: null,
            evidence: [{ observedFact: "NVDA calls swept 3 exchanges." }],
            counterEvidence: [],
          },
        ],
      });
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Your Positions" });
      await waitFor(() => expect(within(region).getByText(/NVDA looks likely to rise\./)).toBeInTheDocument());
      expect(within(region).getByText(/NVDA calls swept 3 exchanges\./)).toBeInTheDocument();
      expect(within(region).getByText(/Scenario preview not yet available/)).toBeInTheDocument();
      expect(within(region).getByRole("img", { name: "Confidence 78 out of 100 — High" })).toBeInTheDocument();
      expect(within(region).getByRole("img", { name: "Probability 62 percent" })).toBeInTheDocument();
    });

    it("Why This Affects You shows the honest empty state when no claims affect this portfolio", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      claimsApi.listPortfolioRelevant.mockResolvedValue({ claims: [] });
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Your Positions" });
      expect(within(region).getByText("No Claims currently affect your portfolio.")).toBeInTheDocument();
    });
  });

  describe("Tier 3 — Context (supporting detail, unchanged in substance)", () => {
    it("Portfolio Health shows real total value, return, and daily P&L, plus a real day-over-day comparison", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      const healthCard = within(region).getByText("Portfolio Health").closest(".nova-card");
      expect(within(healthCard).getByText("$100,000")).toBeInTheDocument();
      expect(within(healthCard).getByText("4.60%")).toBeInTheDocument();
      expect(within(healthCard).getByText("Portfolio value up 0.8% since yesterday.")).toBeInTheDocument();
    });

    it("Concentration Analysis computes real HHI and top-N weights from real position values", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      // NVDA is the largest holding: 48000 / 100000 = 48%
      expect(within(region).getByText(/Largest holding: NVDA at 48\.0%/)).toBeInTheDocument();
      expect(within(region).getByText(/Top 1: 48\.0%/)).toBeInTheDocument();
    });

    it("Sector Allocation renders the real allocation.bySector table", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      const sectorCard = within(region).getByText("Sector Allocation").closest(".nova-card");
      expect(within(sectorCard).getByText("Technology")).toBeInTheDocument();
      expect(within(sectorCard).getByText("69.0%")).toBeInTheDocument();
      expect(within(sectorCard).getByText("Energy")).toBeInTheDocument();
    });

    it("Biggest Winners and Biggest Losers rank real positions by unrealized P&L%, never fabricated", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      const winners = within(region).getByText("Biggest Winners").closest(".nova-card");
      const losers = within(region).getByText("Biggest Losers").closest(".nova-card");
      expect(within(winners).getByText("XOM")).toBeInTheDocument();
      expect(within(losers).getByText("META")).toBeInTheDocument();
      expect(within(winners).queryByText("META")).not.toBeInTheDocument();
    });

    it("Rebalance Suggestions always shows the honest not-available state — no rebalance engine exists", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      expect(within(region).getByText(/Rebalance suggestions aren't available yet/)).toBeInTheDocument();
    });

    it("Cash Allocation shows real cash balance and weight", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Context" });
      expect(within(region).getByText("Cash: $5,000")).toBeInTheDocument();
      expect(within(region).getByText("5.0% of portfolio")).toBeInTheDocument();
    });

    it("shows honest empty states across every section when there are no positions", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_EMPTY);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
      renderScreen();
      await waitForLoaded();

      expect(screen.getByText(/place a trade to see your health metrics/)).toBeInTheDocument();
      expect(screen.getByText("No sector data yet.")).toBeInTheDocument();
      expect(screen.getByText("Not enough position data to compute concentration yet.")).toBeInTheDocument();
      expect(screen.getByText("No holdings yet.")).toBeInTheDocument();
      expect(screen.getByText("No sector allocation data yet.")).toBeInTheDocument();
      expect(screen.getByText("No positions currently showing a gain.")).toBeInTheDocument();
      expect(screen.getByText("No positions currently showing a loss.")).toBeInTheDocument();
    });
  });

  describe("Phase PORTFOLIO-001 — Demo Mode fallback", () => {
    it("falls back gracefully to demo content and shows the full Demo Mode indicator when every service is unavailable", async () => {
      portfolioEngineApi.getSummary.mockRejectedValue(new Error("network down"));
      portfolioEngineApi.getPerformanceDelta.mockRejectedValue(new Error("network down"));
      claimsApi.listPortfolioRelevant.mockRejectedValue(new Error("network down"));
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Demo mode: showing simulated intelligence, not live data." });
      expect(within(indicator).getByText("Demo")).toBeInTheDocument();
      expect(screen.getAllByText(`$${fallbackSummary.totalValue.toLocaleString()}`).length).toBeGreaterThan(0);
    });

    it("falls back only the failed section on a partial outage, with an accurate section-specific message", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
      claimsApi.listPortfolioRelevant.mockRejectedValue(new Error("claims down"));
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Some sections are showing simulated data because a live service is unavailable." });
      expect(within(indicator).getByText(/Demo data/)).toBeInTheDocument();
      expect(within(indicator).getByText(/Claims Affecting Your Portfolio/)).toBeInTheDocument();

      // Portfolio overview itself is still real.
      const briefRegion = screen.getByRole("region", { name: "Portfolio Brief" });
      expect(within(briefRegion).getByText("$100,000")).toBeInTheDocument();
    });

    it("logs which services connected and which are unavailable", async () => {
      portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
      portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
      claimsApi.listPortfolioRelevant.mockResolvedValue({ claims: [] });
      renderScreen();
      await waitForLoaded();

      expect(console.info).toHaveBeenCalledWith("[PortfolioWorkspace] service status", { connected: ["Portfolio Intelligence", "Claims"], unavailable: [] });
    });
  });

  it("no legacy UI classes remain in Portfolio Workspace", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    const { container } = renderScreen();
    await waitForLoaded();

    expect(container.querySelectorAll(".company-description, .eyebrow, .ghost-button, .pill")).toHaveLength(0);
  });
});
