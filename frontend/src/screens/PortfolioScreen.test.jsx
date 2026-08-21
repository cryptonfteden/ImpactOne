import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PortfolioScreen from "./PortfolioScreen";
import { I18nProvider } from "../i18n/I18nProvider";

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
  impactGraphApi: {
    getGraph: vi.fn().mockResolvedValue({ status: "NO_DATA", nodes: [], edges: [] }),
    getPortfolioGraph: vi.fn().mockResolvedValue({ status: "NO_DATA", nodes: [], edges: [] }),
    getWorkspaceGraph: vi.fn().mockResolvedValue({ status: "NO_DATA", nodes: [], edges: [] }),
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

function renderScreen() {
  return render(<I18nProvider><PortfolioScreen /></I18nProvider>);
}

describe("PortfolioScreen feature flag", () => {
  it("renders the canonical server-backed engine by default", () => {
    renderScreen();
    expect(screen.getByText("Your simulated portfolio")).toBeInTheDocument();
    expect(screen.queryByText("Virtual agent portfolio and paper trading")).not.toBeInTheDocument();
  });

  it("renders the legacy screen when the flag is explicitly \"legacy\"", () => {
    vi.stubEnv("VITE_PORTFOLIO_ENGINE", "legacy");
    renderScreen();
    expect(screen.getByText("Virtual agent portfolio and paper trading")).toBeInTheDocument();
  });

  it("renders the new server-backed engine screen when the flag is \"api\"", () => {
    vi.stubEnv("VITE_PORTFOLIO_ENGINE", "api");
    renderScreen();
    expect(screen.getByText("Your simulated portfolio")).toBeInTheDocument();
    expect(screen.queryByText("Virtual agent portfolio and paper trading")).not.toBeInTheDocument();
  });
});

describe("Sprint 40 — Portfolio AI Advisor Insights", () => {
  it("shows an honest empty state when there are no open positions or sector allocation", () => {
    vi.stubEnv("VITE_PORTFOLIO_ENGINE", "legacy");
    renderScreen();
    expect(screen.getByText("AI Advisor Insights")).toBeInTheDocument();
    expect(screen.getByText("No open positions yet — no sector concentration to report.")).toBeInTheDocument();
    expect(screen.getByText("No open positions yet — no opportunity to report.")).toBeInTheDocument();
    expect(screen.getByText("No open positions — no risk exposure to warn about.")).toBeInTheDocument();
    expect(screen.getByText(/Not tracked at the portfolio level yet/)).toBeInTheDocument();
  });
});
