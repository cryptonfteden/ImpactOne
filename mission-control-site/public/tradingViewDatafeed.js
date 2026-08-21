(function exposeImpactOneTradingViewDatafeed(global) {
  class ImpactOneTradingViewDatafeed {
    constructor(baseUrl = "/api/v2/integrations/tradingview/datafeed") {
      this.baseUrl = baseUrl.replace(/\/$/, "");
      this.subscriptions = new Map();
    }

    async request(path, params = {}) {
      const url = new URL(`${this.baseUrl}/${path}`, global.location?.origin || "http://localhost");
      Object.entries(params).forEach(([key, value]) => value != null && url.searchParams.set(key, value));
      const response = await fetch(url);
      if (!response.ok) throw new Error(`ImpactOne datafeed request failed (${response.status}).`);
      return response.json();
    }

    onReady(callback) {
      this.request("config").then((config) => setTimeout(() => callback(config), 0)).catch(() => callback({ supported_resolutions: [] }));
    }

    searchSymbols(userInput, _exchange, _symbolType, onResultReadyCallback) {
      this.request("search", { query: userInput, limit: 50 }).then(onResultReadyCallback).catch(() => onResultReadyCallback([]));
    }

    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
      this.request("symbols", { symbol: symbolName }).then(onSymbolResolvedCallback).catch((error) => onResolveErrorCallback(error.message));
    }

    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
      this.request("history", { symbol: symbolInfo.ticker || symbolInfo.name, resolution, from: periodParams.from, to: periodParams.to })
        .then((payload) => {
          if (payload.s === "no_data") return onHistoryCallback([], { noData: true });
          if (payload.s !== "ok") return onErrorCallback(payload.errmsg || "Market history is unavailable.");
          const bars = payload.t.map((time, index) => ({ time: time * 1000, open: payload.o[index], high: payload.h[index], low: payload.l[index], close: payload.c[index], volume: payload.v[index] }));
          onHistoryCallback(bars, { noData: false });
        })
        .catch((error) => onErrorCallback(error.message));
    }

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID) {
      this.unsubscribeBars(subscriberUID);
      const poll = async () => {
        const now = Math.floor(Date.now() / 1000);
        try {
          const payload = await this.request("history", { symbol: symbolInfo.ticker || symbolInfo.name, resolution, from: now - 8 * 24 * 60 * 60, to: now });
          if (payload.s !== "ok" || !payload.t.length) return;
          const index = payload.t.length - 1;
          onRealtimeCallback({ time: payload.t[index] * 1000, open: payload.o[index], high: payload.h[index], low: payload.l[index], close: payload.c[index], volume: payload.v[index] });
        } catch { /* A failed poll must not replace the last verified bar. */ }
      };
      const timer = global.setInterval(poll, 30_000);
      this.subscriptions.set(subscriberUID, timer);
    }

    unsubscribeBars(subscriberUID) {
      const timer = this.subscriptions.get(subscriberUID);
      if (timer) global.clearInterval(timer);
      this.subscriptions.delete(subscriberUID);
    }
  }

  global.ImpactOneTradingViewDatafeed = ImpactOneTradingViewDatafeed;
  if (typeof module !== "undefined" && module.exports) module.exports = { ImpactOneTradingViewDatafeed };
})(typeof window !== "undefined" ? window : globalThis);
