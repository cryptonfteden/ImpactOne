// Phase AI-ENGINE-001.1 — Unusual Options Agent foundation. The
// explanation generator from OPTIONS_AGENT_ARCHITECTURE.md §7. Design
// rule (stated in the architecture doc, applied literally here): the
// function signature REQUIRES the specific numeric fields of the signal
// that produced it — it cannot compile/run against a generic "signal
// happened" shape, precisely to avoid Daily Feed's documented
// explanation-template-collision bug (identical sentences reused across
// unrelated headlines). Every clause below traces to a real argument;
// nothing here is a shared template string filled in with placeholders.

function formatStrike(strike) {
  return Number.isFinite(strike) ? (Number.isInteger(strike) ? `$${strike}` : `$${strike.toFixed(2)}`) : "$?";
}

function formatExpiry(expiry) {
  if (!expiry) return "an unspecified expiry";
  const date = expiry instanceof Date ? expiry : new Date(expiry);
  if (Number.isNaN(date.getTime())) return "an unspecified expiry";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function formatNotional(notionalValue) {
  if (!Number.isFinite(notionalValue)) return null;
  return `$${(notionalValue / 1_000_000 >= 1 ? `${(notionalValue / 1_000_000).toFixed(2)}M` : `${Math.round(notionalValue / 1000)}K`)}`;
}

/**
 * Requires: symbol, optionType, strike, expiry, signalType. Every other
 * field is included only when the signal actually has it (e.g. a
 * VOLUME_SPIKE-only signal has no sweepExchangeCount) — an absent field
 * is omitted from the sentence, never rendered as a fabricated "N/A".
 */
function buildOptionsSignalExplanation({
  symbol,
  optionType,
  strike,
  expiry,
  signalType,
  volumeMultiple = null,
  notionalValue = null,
  sweepExchangeCount = null,
  oiConfirmationStatus = null,
  putCallSkewZScore = null,
  aggressorSide = null,
} = {}) {
  if (!symbol || !optionType || !Number.isFinite(strike) || !expiry || !signalType) {
    throw new Error("buildOptionsSignalExplanation requires symbol, optionType, strike, expiry, and signalType — no generic/template explanation is generated without them.");
  }

  const contractLabel = `${symbol} ${formatExpiry(expiry)} ${formatStrike(strike)} ${optionType === "CALL" ? "calls" : "puts"}`;
  const clauses = [];

  if (Number.isFinite(volumeMultiple)) {
    const notionalClause = formatNotional(notionalValue);
    clauses.push(`traded ${volumeMultiple.toFixed(1)}x their historical average volume today${notionalClause ? ` (${notionalClause} notional)` : ""}`);
  } else if (notionalValue) {
    clauses.push(`traded on ${formatNotional(notionalValue)} in notional value today`);
  }

  if (signalType === "SWEEP" && Number.isFinite(sweepExchangeCount)) {
    clauses.push(`with prints executing as a cross-exchange sweep across ${sweepExchangeCount} exchange${sweepExchangeCount === 1 ? "" : "s"}${aggressorSide === "BUY" ? " at the ask" : aggressorSide === "SELL" ? " at the bid" : ""} — consistent with ${aggressorSide === "BUY" ? "aggressive, urgent buying" : aggressorSide === "SELL" ? "aggressive, urgent selling" : "an urgent, cross-exchange execution"}`);
  }

  if (signalType === "BLOCK_TRADE") {
    clauses.push("with a single large print consistent with a negotiated block trade");
  }

  if (signalType === "CALL_PUT_SKEW" && Number.isFinite(putCallSkewZScore)) {
    clauses.push(`showing a call/put skew ${putCallSkewZScore.toFixed(1)} standard deviations from this symbol's own historical baseline`);
  }

  const oiClause =
    oiConfirmationStatus === "PENDING"
      ? "Open interest confirmation is pending until tomorrow's session."
      : oiConfirmationStatus === "CONFIRMED_NEW_POSITION"
        ? "Open interest confirms this reflects genuinely new positioning, not closing activity."
        : oiConfirmationStatus === "CONFIRMED_CLOSING"
          ? "Open interest confirms this reflects closing or rolling activity, a materially weaker signal."
          : oiConfirmationStatus === "UNCONFIRMED"
            ? "Open interest could not be confirmed against a prior session."
            : null;

  const body = clauses.length ? `${contractLabel} ${clauses.join(", ")}.` : `${contractLabel} showed unusual activity today.`;
  return oiClause ? `${body} ${oiClause}` : body;
}

module.exports = { buildOptionsSignalExplanation };
