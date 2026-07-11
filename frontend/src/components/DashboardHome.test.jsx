import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardHome from "./DashboardHome";

// Composition test: does DashboardHome render all 9 MVP spec sections, in
// the spec's order? Child components are mocked to a simple marker each —
// their own internals (data shape, empty/loading states) are covered by
// dashboardMetrics.test.js and manual/browser verification, not re-tested
// here. This keeps the test focused on what actually matters at this
// level: composition and order.
vi.mock("./dashboard/MarketContextStrip", () => ({ default: () => <div data-testid="section">MarketContextStrip</div> }));
vi.mock("./dashboard/DailyBriefHero", () => ({ default: () => <div data-testid="section">DailyBriefHero</div> }));
vi.mock("./dashboard/PriorityIntelligenceCards", () => ({ default: () => <div data-testid="section">PriorityIntelligenceCards</div> }));
vi.mock("./dashboard/PortfolioRiskPanel", () => ({ default: () => <div data-testid="section">PortfolioRiskPanel</div> }));
vi.mock("./dashboard/WatchlistPriorityPanel", () => ({ default: () => <div data-testid="section">WatchlistPriorityPanel</div> }));
vi.mock("./dashboard/AskImpactOnePanel", () => ({ default: () => <div data-testid="section">AskImpactOnePanel</div> }));
vi.mock("./dashboard/OpportunityModule", () => ({ default: () => <div data-testid="section">OpportunityModule</div> }));
vi.mock("./dashboard/DailyBriefArchive", () => ({ default: () => <div data-testid="section">DailyBriefArchive</div> }));
vi.mock("./dashboard/DashboardFooter", () => ({ default: () => <div data-testid="section">DashboardFooter</div> }));

vi.mock("../hooks/useWatchlist", () => ({
  default: () => ({ watchlist: ["AAPL"], addTicker: vi.fn() }),
}));

vi.mock("../hooks/usePortfolioEngine", () => ({
  default: () => ({
    summary: { totalValue: 100000, cashBalance: 100000, positionsValue: 0, dailyPnl: 0, positions: [], allocation: { bySector: [], byAssetType: [] } },
    isLoading: false,
    error: "",
  }),
}));

vi.mock("../services/api", () => ({
  intelligenceApi: {
    overview: vi.fn().mockResolvedValue({ dailyBrief: {}, feed: [], alerts: [], watchlistRankings: [], alphaDiscovery: {}, globalMap: {}, decisionCenter: {}, generatedAt: null }),
    dailyBriefArchive: vi.fn().mockResolvedValue({ briefs: [] }),
  },
  altDataApi: { getSummary: vi.fn().mockResolvedValue(null) },
  marketApi: { getQuote: vi.fn().mockResolvedValue({ quote: { changePercent: 0 }, chart: [] }) },
  watchlistApi: { getIntelligence: vi.fn().mockResolvedValue({ watchlist: [] }) },
}));

describe("DashboardHome", () => {
  it("renders all 9 MVP dashboard sections in spec order", async () => {
    render(<DashboardHome onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("section").length).toBeGreaterThanOrEqual(9);
    });

    const sectionNames = screen.getAllByTestId("section").map((el) => el.textContent);

    expect(sectionNames).toEqual([
      "MarketContextStrip",
      "DailyBriefHero",
      "PriorityIntelligenceCards",
      "PortfolioRiskPanel",
      "WatchlistPriorityPanel",
      "AskImpactOnePanel",
      "OpportunityModule",
      "DailyBriefArchive",
      "DashboardFooter",
    ]);
  });
});
