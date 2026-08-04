// Phase ETF-FLOW-AGENT-001 — "Stock exposure through ETFs" / "Stock
// ETF Exposure". A true reverse lookup ("which ETFs hold this stock,
// and in what weight") requires a real, licensed fund-holdings
// database this environment does not have (the same gap
// fundConcentrationAnalyzer.js discloses). This always honestly
// reports unavailable for a stock symbol; for a directly-analyzed ETF
// symbol it honestly reports "not applicable" instead (the question
// itself doesn't apply — an ETF isn't "held by ETFs" the way a stock
// is), never fabricating either answer.
function analyzeStockExposure({ isDirectEtf }) {
  if (isDirectEtf) {
    return { dataAvailable: false, unavailableReason: "Not applicable — the analyzed symbol is itself an ETF, not a stock held through one.", exposureEstimate: null };
  }
  return {
    dataAvailable: false,
    unavailableReason: "No real ETF-holdings-by-constituent data source is connected in this environment — real stock-level ETF exposure cannot be honestly computed. See Sector Rotation for an indirect, sector-level proxy instead.",
    exposureEstimate: null,
  };
}

module.exports = { analyzeStockExposure };
