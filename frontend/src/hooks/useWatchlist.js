import { useEffect, useMemo, useState } from "react";

const WATCHLIST_KEY = "impactone-watchlist";
const LEGACY_KEY = "impactone-favorites";
const WATCHLIST_EVENT = "impactone:watchlist-updated";

function normalizeTicker(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeWatchlist(values) {
  const unique = new Set();
  for (const value of values || []) {
    const normalized = normalizeTicker(value);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

function readFromStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const next = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "null");
    if (Array.isArray(next)) {
      return normalizeWatchlist(next);
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    return normalizeWatchlist(Array.isArray(legacy) ? legacy : []);
  } catch (error) {
    return [];
  }
}

function saveToStorage(next) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeWatchlist(next);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(normalized));
  localStorage.setItem(LEGACY_KEY, JSON.stringify(normalized));
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT, { detail: normalized }));
  });
}

export default function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => readFromStorage());

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {};
    }

    const sync = () => setWatchlist(readFromStorage());
    window.addEventListener("storage", sync);
    window.addEventListener(WATCHLIST_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(WATCHLIST_EVENT, sync);
    };
  }, []);

  const api = useMemo(() => {
    const addTicker = (ticker) => {
      const normalized = normalizeTicker(ticker);
      if (!normalized) {
        return;
      }

      setWatchlist((current) => {
        const next = normalizeWatchlist([...current, normalized]);
        saveToStorage(next);
        return next;
      });
    };

    const removeTicker = (ticker) => {
      const normalized = normalizeTicker(ticker);
      setWatchlist((current) => {
        const next = current.filter((item) => item !== normalized);
        saveToStorage(next);
        return next;
      });
    };

    const toggleTicker = (ticker) => {
      const normalized = normalizeTicker(ticker);
      if (!normalized) {
        return;
      }

      setWatchlist((current) => {
        const has = current.includes(normalized);
        const next = has ? current.filter((item) => item !== normalized) : normalizeWatchlist([...current, normalized]);
        saveToStorage(next);
        return next;
      });
    };

    return {
      watchlist,
      addTicker,
      removeTicker,
      toggleTicker,
    };
  }, [watchlist]);

  return api;
}
