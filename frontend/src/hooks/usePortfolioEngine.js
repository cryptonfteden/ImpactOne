import { useCallback, useEffect, useState } from "react";
import { portfolioEngineApi } from "../services/api";
import { logError } from "../utils/errorHandling";

const REFRESH_INTERVAL_MS = 60000;

export default function usePortfolioEngine({ autoRefresh = true } = {}) {
  const [summary, setSummary] = useState(null);
  const [trades, setTrades] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [summaryData, tradesData, transactionsData, performanceData] = await Promise.all([
        portfolioEngineApi.getSummary(),
        portfolioEngineApi.getTrades(),
        portfolioEngineApi.getTransactions(),
        portfolioEngineApi.getPerformance(),
      ]);

      setSummary(summaryData);
      setTrades(tradesData.trades || []);
      setTransactions(transactionsData.transactions || []);
      setPerformance(performanceData.timeline || []);
      setError("");
    } catch (fetchError) {
      logError("Portfolio engine refresh failed", fetchError);
      setError(fetchError?.message || "Unable to load the portfolio engine.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    async function initialLoad() {
      if (!cancelled) {
        await refresh();
      }
    }

    initialLoad();
    if (autoRefresh) {
      intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refresh, autoRefresh]);

  const placeOrder = useCallback(async (order) => {
    setActionError("");
    try {
      const result = await portfolioEngineApi.placeOrder(order);
      await refresh();
      return result;
    } catch (orderError) {
      logError("Portfolio order placement failed", orderError);
      setActionError(orderError?.message || "Unable to place order.");
      throw orderError;
    }
  }, [refresh]);

  const reset = useCallback(async () => {
    setActionError("");
    try {
      await portfolioEngineApi.reset();
      await refresh();
    } catch (resetError) {
      logError("Portfolio reset failed", resetError);
      setActionError(resetError?.message || "Unable to reset the portfolio.");
      throw resetError;
    }
  }, [refresh]);

  return {
    summary,
    trades,
    transactions,
    performance,
    isLoading,
    error,
    actionError,
    placeOrder,
    reset,
    refresh,
  };
}
