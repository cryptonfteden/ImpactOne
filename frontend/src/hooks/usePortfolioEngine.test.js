import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import usePortfolioEngine from "./usePortfolioEngine";
import { portfolioEngineApi } from "../services/api";

vi.mock("../services/api", () => ({
  portfolioEngineApi: {
    getSummary: vi.fn(),
    getTrades: vi.fn(),
    getTransactions: vi.fn(),
    getPerformance: vi.fn(),
    getPerformanceDelta: vi.fn(),
    placeOrder: vi.fn(),
    reset: vi.fn(),
  },
}));

const SUMMARY_FIXTURE = { cashBalance: 100000, totalValue: 100000, positions: [] };
const DELTA_FIXTURE = { hasComparison: false, totalValue: 100000, changes: [], summary: "No prior-day snapshot yet — this is the first day being tracked." };

function mockHappyPath() {
  portfolioEngineApi.getSummary.mockResolvedValue(SUMMARY_FIXTURE);
  portfolioEngineApi.getTrades.mockResolvedValue({ trades: [] });
  portfolioEngineApi.getTransactions.mockResolvedValue({ transactions: [] });
  portfolioEngineApi.getPerformance.mockResolvedValue({ timeline: [] });
  portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_FIXTURE);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePortfolioEngine", () => {
  it("loads summary, trades, transactions, and performance on mount", async () => {
    mockHappyPath();

    const { result } = renderHook(() => usePortfolioEngine({ autoRefresh: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.summary).toEqual(SUMMARY_FIXTURE);
    expect(result.current.trades).toEqual([]);
    expect(result.current.error).toBe("");
    expect(result.current.performanceDelta).toEqual(DELTA_FIXTURE);
  });

  it("surfaces a fetch error without throwing", async () => {
    portfolioEngineApi.getSummary.mockRejectedValue(new Error("backend unavailable"));
    portfolioEngineApi.getTrades.mockResolvedValue({ trades: [] });
    portfolioEngineApi.getTransactions.mockResolvedValue({ transactions: [] });
    portfolioEngineApi.getPerformance.mockResolvedValue({ timeline: [] });
    portfolioEngineApi.getPerformanceDelta.mockResolvedValue(DELTA_FIXTURE);

    const { result } = renderHook(() => usePortfolioEngine({ autoRefresh: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("backend unavailable");
    expect(result.current.summary).toBeNull();
  });

  it("placeOrder calls the API and refreshes state", async () => {
    mockHappyPath();
    portfolioEngineApi.placeOrder.mockResolvedValue({ order: { status: "FILLED" } });

    const { result } = renderHook(() => usePortfolioEngine({ autoRefresh: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.placeOrder({ symbol: "AAPL", side: "BUY", quantity: 1 });
    });

    expect(portfolioEngineApi.placeOrder).toHaveBeenCalledWith({ symbol: "AAPL", side: "BUY", quantity: 1 });
    expect(portfolioEngineApi.getSummary).toHaveBeenCalledTimes(2); // initial load + post-order refresh
    expect(result.current.actionError).toBe("");
  });

  it("placeOrder surfaces a rejection as actionError and rethrows", async () => {
    mockHappyPath();
    portfolioEngineApi.placeOrder.mockRejectedValue(new Error("Insufficient cash balance."));

    const { result } = renderHook(() => usePortfolioEngine({ autoRefresh: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(
        result.current.placeOrder({ symbol: "AAPL", side: "BUY", quantity: 999999 })
      ).rejects.toThrow("Insufficient cash balance.");
    });

    expect(result.current.actionError).toBe("Insufficient cash balance.");
  });

  it("reset calls the API and refreshes state", async () => {
    mockHappyPath();
    portfolioEngineApi.reset.mockResolvedValue(SUMMARY_FIXTURE);

    const { result } = renderHook(() => usePortfolioEngine({ autoRefresh: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.reset();
    });

    expect(portfolioEngineApi.reset).toHaveBeenCalledTimes(1);
    expect(portfolioEngineApi.getSummary).toHaveBeenCalledTimes(2);
  });
});
