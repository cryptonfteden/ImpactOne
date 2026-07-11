import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PortfolioScreen from "./PortfolioScreen";

vi.mock("../hooks/useWatchlist", () => ({
  default: () => ({ watchlist: [], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() }),
}));

vi.mock("../hooks/useVirtualPortfolio", () => ({
  default: () => ({
    portfolio: {
      cashBalance: 100000,
      totalPortfolioValue: 100000,
      totalReturn: 0,
      dailyReturn: 0,
      realizedPnL: 0,
      riskExposure: 0,
      positions: [],
      trades: [],
      performance: {},
      allocationBySector: [],
      allocationByAssetType: [],
      benchmark: {},
    },
    reset: vi.fn(),
  }),
}));

vi.mock("../hooks/usePortfolioEngine", () => ({
  default: () => ({
    summary: { cashBalance: 100000, startingCapital: 100000, totalValue: 100000, totalReturnPct: 0, realizedPnl: 0, unrealizedPnl: 0, positions: [], allocation: { bySector: [], byAssetType: [] } },
    trades: [],
    transactions: [],
    performance: [],
    isLoading: false,
    error: "",
    actionError: "",
    placeOrder: vi.fn(),
    reset: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../services/api", () => ({
  intelligenceApi: { overview: vi.fn().mockResolvedValue({}) },
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PortfolioScreen feature flag", () => {
  it("renders the legacy localStorage-driven screen by default", () => {
    render(<PortfolioScreen />);
    expect(screen.getByText("Virtual agent portfolio and paper trading")).toBeInTheDocument();
  });

  it("renders the legacy screen when the flag is explicitly \"legacy\"", () => {
    vi.stubEnv("VITE_PORTFOLIO_ENGINE", "legacy");
    render(<PortfolioScreen />);
    expect(screen.getByText("Virtual agent portfolio and paper trading")).toBeInTheDocument();
  });

  it("renders the new server-backed engine screen when the flag is \"api\"", () => {
    vi.stubEnv("VITE_PORTFOLIO_ENGINE", "api");
    render(<PortfolioScreen />);
    expect(screen.getByText("Persistent paper-trading engine")).toBeInTheDocument();
    expect(screen.queryByText("Virtual agent portfolio and paper trading")).not.toBeInTheDocument();
  });
});
