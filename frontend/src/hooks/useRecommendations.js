import { useCallback, useEffect, useState } from "react";
import { recommendationsApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { startVisibilityAwarePolling } from "../utils/pollWhileVisible";

const REFRESH_INTERVAL_MS = 60000;

export default function useRecommendations({ autoRefresh = true } = {}) {
  const [recommendations, setRecommendations] = useState([]);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [listData, statusData] = await Promise.all([
        recommendationsApi.list(),
        recommendationsApi.status(),
      ]);

      setRecommendations(listData.recommendations || []);
      setStatus(statusData);
      setError("");
    } catch (fetchError) {
      logError("Recommendations refresh failed", fetchError);
      setError(fetchError?.message || "Unable to load recommendations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stopPolling;

    async function initialLoad() {
      if (!cancelled) {
        await refresh();
      }
    }

    initialLoad();
    if (autoRefresh) {
      stopPolling = startVisibilityAwarePolling(refresh, REFRESH_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (stopPolling) {
        stopPolling();
      }
    };
  }, [refresh, autoRefresh]);

  const runNow = useCallback(async (watchlist = []) => {
    setActionError("");
    setIsRunning(true);
    try {
      const result = await recommendationsApi.run(watchlist);
      await refresh();
      return result;
    } catch (runError) {
      logError("Recommendation engine run failed", runError);
      setActionError(runError?.message || "Unable to run the recommendation engine.");
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, [refresh]);

  return {
    recommendations,
    status,
    isLoading,
    isRunning,
    error,
    actionError,
    runNow,
    refresh,
  };
}
