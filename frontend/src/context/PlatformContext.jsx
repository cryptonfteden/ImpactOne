import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { portfolioEngineApi } from "../services/api";
import { withRequestCache } from "../services/requestCache";
import { logError } from "../utils/errorHandling";

// Phase PLATFORM-INTEGRATION-001 — the shared state that makes Mission
// Control, Portfolio Workspace, and News Intelligence feel like one
// continuous experience rather than three independent screens:
//   - selectedClaim / selectedSymbol: whichever real Claim or symbol a
//     screen most recently surfaced as its own top priority (or the user
//     acted on), so navigating between screens carries that context
//     forward instead of resetting to nothing.
//   - portfolioContext: the one real portfolio summary (GET
//     /v2/portfolio), fetched once and shared — any screen that needs
//     real held positions reads it from here instead of issuing its own
//     redundant request (see requestCache.js for the de-dup mechanism).
//   - navigateTo: the one shared way to move between screens while
//     optionally carrying a claim/symbol forward as the new selection.
// This context is additive: it changes no rendering by itself. No new
// visual component exists here — only state and the functions that move
// it.

const PORTFOLIO_SUMMARY_CACHE_KEY = "platform:portfolio-summary";

const PlatformContext = createContext(null);

export function PlatformProvider({ navigate, children }) {
  const [selectedClaim, setSelectedClaimState] = useState(null);
  const [selectedSymbol, setSelectedSymbolState] = useState(null);
  const [portfolioContext, setPortfolioContext] = useState(null);
  const [portfolioContextStatus, setPortfolioContextStatus] = useState("idle");

  const selectClaim = useCallback((claim) => {
    setSelectedClaimState(claim || null);
    if (claim?.symbols?.length) {
      setSelectedSymbolState(claim.symbols[0]);
    }
  }, []);

  const selectSymbol = useCallback((symbol) => {
    setSelectedSymbolState(symbol || null);
  }, []);

  const loadPortfolioContext = useCallback(async ({ force = false } = {}) => {
    if (force) {
      // A forced reload still shares the de-dup cache key, so a
      // concurrent non-forced caller doesn't trigger its own second
      // request while this one is in flight.
      setPortfolioContextStatus("loading");
    } else if (portfolioContextStatus === "loaded") {
      return portfolioContext;
    } else {
      setPortfolioContextStatus("loading");
    }

    try {
      const summary = await withRequestCache(PORTFOLIO_SUMMARY_CACHE_KEY, () => portfolioEngineApi.getSummary());
      setPortfolioContext(summary);
      setPortfolioContextStatus("loaded");
      return summary;
    } catch (error) {
      logError("platform context portfolio summary load failed", error);
      setPortfolioContextStatus("error");
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioContextStatus]);

  const navigateTo = useCallback(
    (screenKey, { claim, symbol } = {}) => {
      if (claim) {
        selectClaim(claim);
      } else if (symbol) {
        selectSymbol(symbol);
      }
      navigate?.(screenKey);
    },
    [navigate, selectClaim, selectSymbol]
  );

  const value = useMemo(
    () => ({
      selectedClaim,
      selectClaim,
      selectedSymbol,
      selectSymbol,
      portfolioContext,
      portfolioContextStatus,
      loadPortfolioContext,
      navigateTo,
    }),
    [selectedClaim, selectClaim, selectedSymbol, selectSymbol, portfolioContext, portfolioContextStatus, loadPortfolioContext, navigateTo]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatformContext() {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error("usePlatformContext must be used within a PlatformProvider");
  }
  return ctx;
}
