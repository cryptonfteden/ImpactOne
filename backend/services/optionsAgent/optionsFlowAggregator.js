// Phase AI-ENGINE-001.1 — Unusual Options Agent foundation.
// OPTIONS_AGENT_ARCHITECTURE.md §4 step 3: groups already-normalized
// prints by contract (symbol, expiry, strike, optionType) so the
// detectors (§5) run against aggregate windows, never against raw print
// history one row at a time. Pure functions only — no I/O.

function contractKey(print) {
  return [print.symbol, print.expiry.toISOString().slice(0, 10), print.strike, print.optionType].join("|");
}

/**
 * Groups prints by exact contract. Each group carries everything the
 * detectors need: total volume/notional, the largest single print (for
 * block detection), and per-aggressor-side volume (for sweep/skew
 * reasoning) — all real sums/maxes over the input prints, nothing derived
 * beyond that.
 */
function aggregateByContract(prints = []) {
  const groups = new Map();

  for (const print of prints) {
    const key = contractKey(print);
    if (!groups.has(key)) {
      groups.set(key, {
        symbol: print.symbol,
        expiry: print.expiry,
        strike: print.strike,
        optionType: print.optionType,
        prints: [],
        totalVolume: 0,
        notionalValue: 0,
        largestSinglePrintSize: 0,
        buyVolume: 0,
        sellVolume: 0,
      });
    }
    const group = groups.get(key);
    group.prints.push(print);
    group.totalVolume += print.size;
    group.notionalValue += print.notionalValue;
    group.largestSinglePrintSize = Math.max(group.largestSinglePrintSize, print.size);
    if (print.aggressorSide === "BUY") group.buyVolume += print.size;
    else if (print.aggressorSide === "SELL") group.sellVolume += print.size;
  }

  return Array.from(groups.values());
}

/**
 * Real, aggregate symbol-level call/put volume — the input the skew
 * detector (§5b) needs. Computed only from prints actually present in
 * this batch; never backfilled from an assumed history.
 */
function aggregateSymbolCallPutVolume(prints = []) {
  const bySymbol = new Map();
  for (const print of prints) {
    if (!bySymbol.has(print.symbol)) {
      bySymbol.set(print.symbol, { symbol: print.symbol, callVolume: 0, putVolume: 0 });
    }
    const entry = bySymbol.get(print.symbol);
    if (print.optionType === "CALL") entry.callVolume += print.size;
    else entry.putVolume += print.size;
  }
  return Array.from(bySymbol.values());
}

module.exports = {
  contractKey,
  aggregateByContract,
  aggregateSymbolCallPutVolume,
};
