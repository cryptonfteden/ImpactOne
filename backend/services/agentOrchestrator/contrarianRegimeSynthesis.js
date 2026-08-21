function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function findRaw(agentResults, id) {
  return (agentResults || []).find((item) => item.agentId === id)?.result?.raw || null;
}

function buildContrarianRegimeSynthesis(agentResults = []) {
  const sentiment = findRaw(agentResults, "sentiment");
  const macro = findRaw(agentResults, "macro");
  const score = finite(sentiment?.score);
  const sentimentConfidence = finite(sentiment?.confidence);
  const liquidityScore = finite(macro?.liquidityScore);
  const macroConfidence = finite(macro?.confidence);
  const dailyTrend = sentiment?.trend?.daily?.direction || "UNKNOWN";
  const blockers = [];

  if (score === null) blockers.push("A verified market-sentiment score is unavailable.");
  if (liquidityScore === null) blockers.push("Verified macro liquidity data is unavailable.");
  if ((sentimentConfidence ?? 0) < 50) blockers.push("Market-sentiment confidence is below 50/100.");
  if ((macroConfidence ?? 0) < 50) blockers.push("Macro confidence is below 50/100.");

  const extremeFear = score !== null && score <= 25;
  const extremeGreed = score !== null && score >= 75;
  const liquiditySupportive = liquidityScore !== null && liquidityScore >= 60;
  const liquidityTight = liquidityScore !== null && liquidityScore <= 40;
  const trendImproving = ["IMPROVING", "RISING", "BULLISH", "POSITIVE"].includes(String(dailyTrend).toUpperCase());
  const trendWeakening = ["DETERIORATING", "FALLING", "BEARISH", "NEGATIVE"].includes(String(dailyTrend).toUpperCase());

  let state = "NO_CONTRARIAN_SIGNAL";
  let plainLanguage = "Crowd sentiment is not at a verified extreme, so the system will not force a contrarian call.";
  if (extremeFear && liquiditySupportive && trendImproving) {
    state = "CONTRARIAN_RISK_ON_WATCH";
    plainLanguage = "Fear is extreme while liquidity and short-term direction are improving. This is a watch condition, not an automatic buy.";
  } else if (extremeGreed && liquidityTight && trendWeakening) {
    state = "CONTRARIAN_RISK_OFF_WATCH";
    plainLanguage = "Greed is extreme while liquidity and short-term direction are weakening. This is a risk warning, not an automatic sell.";
  } else if (extremeFear) {
    if (!liquiditySupportive) blockers.push("Extreme fear is not confirmed by supportive liquidity.");
    if (!trendImproving) blockers.push("Extreme fear is not confirmed by an improving market trend.");
  } else if (extremeGreed) {
    if (!liquidityTight) blockers.push("Extreme greed is not confirmed by tight liquidity.");
    if (!trendWeakening) blockers.push("Extreme greed is not confirmed by a weakening market trend.");
  }

  return {
    state,
    actionable: state !== "NO_CONTRARIAN_SIGNAL",
    advisoryOnly: true,
    plainLanguage,
    marketWide: true,
    inputs: {
      sentimentScore: score,
      sentimentConfidence,
      dailyTrend,
      liquidityScore,
      macroConfidence,
      policyDirection: macro?.policyDirection || "UNKNOWN",
      marketStress: macro?.marketStress || "UNKNOWN",
    },
    evidence: [
      score === null ? null : `Market sentiment ${score}/100`,
      liquidityScore === null ? null : `Macro liquidity ${liquidityScore}/100`,
      dailyTrend === "UNKNOWN" ? null : `Daily sentiment trend ${dailyTrend}`,
    ].filter(Boolean),
    blockers: [...new Set(blockers)],
    provenance: {
      sentimentSources: sentiment?.provenance?.sources || [],
      sentimentAsOf: sentiment?.lastUpdated || null,
      macroAsOf: macro?.generatedAt || null,
    },
  };
}

module.exports = { buildContrarianRegimeSynthesis };
