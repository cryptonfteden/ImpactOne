import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import PortfolioWorkspaceScreen from "./PortfolioWorkspaceScreen";
import { portfolioEngineApi, claimsApi } from "../services/api";
import { I18nProvider } from "../i18n/I18nProvider";

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
  claimsApi.listPortfolioRelevant.mockResolvedValue({ claims: [] });
});

describe("PortfolioWorkspaceScreen", () => {
  it("renders all 10 required sections once data loads", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
    renderScreen();

    await waitFor(() => expect(screen.getByText("The AI operating center for your holdings")).toBeInTheDocument());
    [
      "What Changed Since Yesterday",
      "Why This Affects You",
      "Portfolio Health",
      "Portfolio Risk Map",
      "Concentration Analysis",
      "Diversification Score",
      "Sector Allocation",
      "Biggest Winners",
      "Biggest Losers",
      "Rebalance Suggestions",
      "Cash Allocation",
    ].forEach((name) => {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    });
  });

  it("Phase PRODUCT-001 — What Changed Since Yesterday and Why This Affects You appear before every other section, never recommendations first", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
    renderScreen();

    await waitFor(() => expect(screen.getByRole("region", { name: "What Changed Since Yesterday" })).toBeInTheDocument());
    const regionNames = Array.from(document.querySelectorAll("section[aria-label]")).map((el) => el.getAttribute("aria-label"));
    expect(regionNames[0]).toBe("What Changed Since Yesterday");
    expect(regionNames[1]).toBe("Why This Affects You");
  });

  it("Portfolio Health shows real total value, return, and daily P&L, plus a real day-over-day comparison", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_WITH_COMPARISON);
    renderScreen();

    const healthRegion = await screen.findByRole("region", { name: "Portfolio Health" });
    await waitFor(() => expect(within(healthRegion).getByText("$100,000")).toBeInTheDocument());
    expect(within(healthRegion).getByText("4.60%")).toBeInTheDocument();
    expect(within(healthRegion).getByText("Portfolio value up 0.8% since yesterday.")).toBeInTheDocument();
  });

  it("Portfolio Health shows an honest no-comparison message on day one", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    renderScreen();

    const healthRegion = await screen.findByRole("region", { name: "Portfolio Health" });
    await waitFor(() => expect(within(healthRegion).getByText(/No prior snapshot yet/)).toBeInTheDocument());
  });

  it("Concentration Analysis computes real HHI and top-N weights from real position values", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    renderScreen();

    const region = await screen.findByRole("region", { name: "Concentration Analysis" });
    // NVDA is the largest holding: 48000 / 100000 = 48%
    await waitFor(() => expect(within(region).getByText(/Largest holding: NVDA at 48\.0%/)).toBeInTheDocument());
    expect(within(region).getByText(/Top 1: 48\.0%/)).toBeInTheDocument();
  });

  it("Sector Allocation renders the real allocation.bySector table", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    renderScreen();

    const region = await screen.findByRole("region", { name: "Sector Allocation" });
    await waitFor(() => expect(within(region).getByText("Technology")).toBeInTheDocument());
    expect(within(region).getByText("69.0%")).toBeInTheDocument();
    expect(within(region).getByText("Energy")).toBeInTheDocument();
  });

  it("Biggest Winners and Biggest Losers rank real positions by unrealized P&L%, never fabricated", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    renderScreen();

    const winners = await screen.findByRole("region", { name: "Biggest Winners" });
    const losers = await screen.findByRole("region", { name: "Biggest Losers" });
    await waitFor(() => expect(within(winners).getByText("XOM")).toBeInTheDocument());
    expect(within(losers).getByText("META")).toBeInTheDocument();
    expect(within(winners).queryByText("META")).not.toBeInTheDocument();
  });

  it("Why This Affects You shows real Claims affecting the portfolio, in Why/Evidence/Counter Evidence/Potential Scenarios order (Phase PRODUCT-001)", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    claimsApi.listPortfolioRelevant.mockResolvedValue({
      claims: [
        {
          claimId: "c1",
          symbols: ["NVDA"],
          expectedDirection: "BULLISH",
          confidence: 78,
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

    const region = await screen.findByRole("region", { name: "Why This Affects You" });
    await waitFor(() => expect(within(region).getByText(/NVDA looks likely to rise\./)).toBeInTheDocument());
    expect(within(region).getByText(/NVDA calls swept 3 exchanges\./)).toBeInTheDocument();
    expect(within(region).getByText(/Scenario preview not yet available/)).toBeInTheDocument();
  });

  it("Why This Affects You shows the honest empty state when no claims affect this portfolio", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    claimsApi.listPortfolioRelevant.mockResolvedValue({ claims: [] });
    renderScreen();

    const region = await screen.findByRole("region", { name: "Why This Affects You" });
    await waitFor(() => expect(within(region).getByText("No Claims currently affect your portfolio.")).toBeInTheDocument());
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

    const region = await screen.findByRole("region", { name: "What Changed Since Yesterday" });
    await waitFor(() => expect(within(region).getByText(/Total portfolio value/)).toBeInTheDocument());
    expect(within(region).getByText(/99000/)).toBeInTheDocument();
  });

  it("What Changed Since Yesterday shows the honest no-comparison message on day one", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    renderScreen();

    const region = await screen.findByRole("region", { name: "What Changed Since Yesterday" });
    await waitFor(() => expect(within(region).getByText("No prior-day snapshot yet — this is the first day being tracked.")).toBeInTheDocument());
  });

  it("Rebalance Suggestions always shows the honest not-available state — no rebalance engine exists", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    renderScreen();

    const region = await screen.findByRole("region", { name: "Rebalance Suggestions" });
    await waitFor(() => expect(within(region).getByText(/Rebalance suggestions aren't available yet/)).toBeInTheDocument());
  });

  it("Cash Allocation shows real cash balance and weight", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    renderScreen();

    const region = await screen.findByRole("region", { name: "Cash Allocation" });
    await waitFor(() => expect(within(region).getByText("Cash: $5,000")).toBeInTheDocument());
    expect(within(region).getByText("5.0% of portfolio")).toBeInTheDocument();
  });

  it("shows honest empty states across every section when there are no positions", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_EMPTY);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    renderScreen();

    await waitFor(() => expect(screen.getByText(/place a trade to see your health metrics/)).toBeInTheDocument());
    expect(screen.getByText("No sector data yet.")).toBeInTheDocument();
    expect(screen.getByText("Not enough position data to compute concentration yet.")).toBeInTheDocument();
    expect(screen.getByText("No holdings yet.")).toBeInTheDocument();
    expect(screen.getByText("No sector allocation data yet.")).toBeInTheDocument();
    expect(screen.getByText("No positions currently showing a gain.")).toBeInTheDocument();
    expect(screen.getByText("No positions currently showing a loss.")).toBeInTheDocument();
  });

  it("shows the noCachedFallback message when the initial load fails with no prior data", async () => {
    portfolioEngineApi.getSummary.mockRejectedValue(new Error("network down"));
    portfolioEngineApi.getPerformanceDelta.mockRejectedValue(new Error("network down"));
    renderScreen();

    await waitFor(() => expect(screen.getByText(/We couldn't refresh the Portfolio Workspace/)).toBeInTheDocument());
    expect(screen.getByText(/Nothing has loaded yet, so there's no cached view to fall back to/)).toBeInTheDocument();
  });

  it("no legacy UI classes remain in Portfolio Workspace", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_WITH_POSITIONS);
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_NO_COMPARISON);
    const { container } = renderScreen();

    await waitFor(() => expect(screen.getByText("The AI operating center for your holdings")).toBeInTheDocument());
    expect(container.querySelectorAll(".company-description, .eyebrow, .ghost-button, .pill")).toHaveLength(0);
  });
});
