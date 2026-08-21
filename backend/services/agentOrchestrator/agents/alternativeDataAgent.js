const altDataService = require("../../altDataService");

function directionFrom(data) {
  const values = [];
  const cotNet = Number(data?.cot?.netPositioning);
  if (Number.isFinite(cotNet)) values.push(Math.sign(cotNet));
  const probability = Number(data?.signals?.predictionMarketProbabilities?.probability);
  if (Number.isFinite(probability)) values.push(probability > 0.55 ? 1 : probability < 0.45 ? -1 : 0);
  if (!values.length) return null;
  const score = values.reduce((sum, value) => sum + value, 0);
  return score > 0 ? "BULLISH" : score < 0 ? "BEARISH" : null;
}

async function execute(symbol) {
  const report = await altDataService.getAltDataSummary({ symbol });
  const evidence = [];
  if (report.cot?.source === "cftc") evidence.push({ observedFact: `CFTC ${report.cot.market}: ${report.cot.signal}; weekly net ${report.cot.netPositioning}. This is asset-class context, not a position in ${symbol}.` });
  const prediction = report.polymarket?.[0];
  if (prediction) evidence.push({ observedFact: `Polymarket: ${prediction.event} at ${(Number(prediction.probability) * 100).toFixed(0)}% implied probability.` });
  if (report.sec?.source === "sec") evidence.push({ observedFact: `SEC EDGAR: ${report.sec.filings.length} recent material filings checked for ${symbol}.` });
  if (report.congress?.source && report.congress.source !== "unavailable" && report.congress.directMatch && report.congress.trades?.length) evidence.push({ observedFact: `${report.congress.trades.length} congressional disclosures directly matching ${symbol} were reviewed; disclosures may be delayed.` });
  const coverageScore = Number(report.signals?.confidenceScore || 0);
  const directCongressMatches = report.congress?.directMatch ? report.congress.trades.length : 0;
  const sourceCount = [
    report.cot?.source === "cftc",
    report.polymarket?.some((item) => item.source === "polymarket"),
    report.macro?.source === "fred",
    report.sec?.source === "sec",
    report.congress?.source === "house-stock-watcher" && report.congress?.directMatch,
  ].filter(Boolean).length;
  const dataQuality = {
    sourceCount,
    coverageScore,
    directCongressMatches,
    signalEligible: false,
    blockers: ["Public alternative feeds are context lenses; they are not yet validated as a directional, symbol-specific signal."],
  };
  return {
    summary: evidence.length ? `${evidence.length} public alternative-data lenses verified. These signals add context and are not standalone trade instructions.` : "No verified alternative-data signal is available for this symbol right now.",
    direction: null,
    evidence,
    // Coverage is retained for transparency, but agent confidence is
    // deliberately zero while no symbol-specific directional method is
    // validated. This prevents contextual feeds from gaining committee
    // voting weight.
    raw: { ...report, confidence: { confidence: 0, coverageScore }, signalEligible: false, dataQuality },
  };
}

function confidence(result) {
  return Number(result?.raw?.confidence?.confidence || 0);
}

async function health() { return { status: "healthy", reason: null }; }

module.exports = {
  metadata: { id: "alternative-data", name: "Public Alternative Data Agent", category: "ALTERNATIVE_DATA", priority: 6 },
  execute,
  confidence,
  health,
};
