function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function findRaw(agentResults, id) {
  const row = (agentResults || []).find((item) => item.agentId === id);
  return row?.result?.raw || null;
}

function pct(value) {
  const number = finite(value);
  return number === null ? null : Math.round(number * 1000) / 10;
}

function buildPriceEarningsSynthesis(agentResults = []) {
  const valuation = findRaw(agentResults, "valuation");
  const earnings = findRaw(agentResults, "earnings");
  const valuationAvailable = Boolean(valuation?.dataAvailable && valuation.valuationStatus !== "UNKNOWN");
  const earningsAvailable = Boolean(earnings?.dataAvailable && earnings.earningsHealth !== "UNKNOWN");
  const blockers = [];

  if (!valuationAvailable) blockers.push(valuation?.unavailableReason || valuation?.unavailableForFairValueReason || "Verified valuation data is unavailable.");
  if (!earningsAvailable) blockers.push(earnings?.unavailableReason || "Verified earnings data is unavailable.");

  let assessment = "INSUFFICIENT_DATA";
  let plainLanguage = "There is not enough verified financial data to judge whether the current price is supported by the business.";
  if (valuationAvailable && earningsAvailable) {
    const valuationStatus = valuation.valuationStatus;
    const earningsHealth = earnings.earningsHealth;
    if (valuationStatus === "UNDERVALUED" && ["STRONG", "STABLE"].includes(earningsHealth)) {
      assessment = "PRICE_SUPPORTED";
      plainLanguage = "The price appears attractive relative to the available earnings and fair-value evidence.";
    } else if (valuationStatus === "OVERVALUED" && ["WEAK", "DETERIORATING"].includes(earningsHealth)) {
      assessment = "PRICE_NOT_SUPPORTED";
      plainLanguage = "The price looks demanding while the available earnings evidence is weak.";
    } else if (valuationStatus === "OVERVALUED") {
      assessment = "GROWTH_REQUIRED";
      plainLanguage = "The market price assumes further business growth; current earnings must keep improving to justify it.";
    } else {
      assessment = "MIXED";
      plainLanguage = "Price and business performance are not giving the same clear signal yet.";
    }
  }

  return {
    assessment,
    plainLanguage,
    complete: valuationAvailable && earningsAvailable,
    valuation: {
      available: valuationAvailable,
      status: valuation?.valuationStatus || "UNKNOWN",
      fairValue: finite(valuation?.estimatedFairValue),
      priceGapPct: pct(valuation?.discountToFairValue),
      confidence: finite(valuation?.confidence),
      source: valuation?.sourceProvider || valuation?.inputs?.sourceProvider || null,
      asOf: valuation?.generatedAt || null,
    },
    earnings: {
      available: earningsAvailable,
      health: earnings?.earningsHealth || "UNKNOWN",
      outlook: earnings?.forwardOutlook || "UNKNOWN",
      growthScore: finite(earnings?.growthScore),
      surpriseScore: finite(earnings?.surpriseScore),
      source: earnings?.sourceProvider || earnings?.inputs?.sourceProvider || null,
      asOf: earnings?.generatedAt || null,
    },
    blockers: [...new Set(blockers.filter(Boolean))],
  };
}

module.exports = { buildPriceEarningsSynthesis };
