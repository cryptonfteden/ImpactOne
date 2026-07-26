const investorProfileRepository = require("./investorProfileRepository");

const MIN_AGE = 5;
const MAX_AGE = 120;

// Sprint 20 — documented, named constants for the deterministic allocation
// formula (same spirit as autonomousRecommendationEngine.js's
// QUALITY_WEIGHTS): every number here is a stated assumption, not a live
// computation, and is presented to the user as an illustration, never a
// promise (per VISION.md's Investment Principles).
const BASE_STOCK_PCT_FORMULA = "110 - age"; // a common modernized "rule of thumb"
const RISK_TOLERANCE_STOCK_ADJUSTMENT_PTS = { LOW: -15, MEDIUM: 0, HIGH: 15 };
const SHORT_TERM_STOCK_CAP_PCT = 40; // capital needed soon shouldn't be fully market-exposed, regardless of age/risk
const ASSUMED_ANNUAL_VOLATILITY_PCT = { stocks: [12, 22], bonds: [4, 8], cash: [0, 1] };
const ASSUMED_ANNUAL_RETURN_PCT = { stocks: 8, bonds: 4, cash: 2 }; // long-run illustrative averages, not a forecast

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function validateAge(age) {
  const parsed = Number(age);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < MIN_AGE || parsed > MAX_AGE) {
    const error = new Error(`age is required and must be an integer between ${MIN_AGE} and ${MAX_AGE}.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

async function getInvestorProfile(betaUserId) {
  return investorProfileRepository.findDefaultInvestorProfile(betaUserId);
}

async function createInvestorProfile(data = {}, betaUserId) {
  const age = validateAge(data.age);
  return investorProfileRepository.createInvestorProfile({
    age,
    country: data.country || null,
    experienceLevel: data.experienceLevel || null,
    monthlyInvestmentAmount: data.monthlyInvestmentAmount ?? null,
    investmentGoal: data.investmentGoal || null,
    riskTolerance: data.riskTolerance || null,
    investmentHorizon: data.investmentHorizon || null,
    betaUserId: betaUserId || null,
  });
}

async function updateInvestorProfile(data = {}, betaUserId) {
  const existing = await investorProfileRepository.findDefaultInvestorProfile(betaUserId);
  if (!existing) {
    const error = new Error("No investor profile exists yet.");
    error.statusCode = 404;
    throw error;
  }

  const updates = {};
  if (data.age !== undefined) updates.age = validateAge(data.age);
  if (data.country !== undefined) updates.country = data.country;
  if (data.experienceLevel !== undefined) updates.experienceLevel = data.experienceLevel;
  if (data.monthlyInvestmentAmount !== undefined) updates.monthlyInvestmentAmount = data.monthlyInvestmentAmount;
  if (data.investmentGoal !== undefined) updates.investmentGoal = data.investmentGoal;
  if (data.riskTolerance !== undefined) updates.riskTolerance = data.riskTolerance;
  if (data.investmentHorizon !== undefined) updates.investmentHorizon = data.investmentHorizon;

  return investorProfileRepository.updateInvestorProfile(existing.id, updates);
}

/**
 * Sprint 20 — deterministic allocation: age sets a base stock percentage
 * ("110 - age"), risk tolerance shifts it, and a short investment horizon
 * caps it regardless of age/risk (capital needed soon shouldn't be fully
 * market-exposed). No AI/LLM call — every number traces to a named,
 * documented constant above.
 */
function computeSuggestedAllocation({ age, riskTolerance, investmentHorizon }) {
  let stockPct = clamp(110 - age, 20, 95);
  stockPct = clamp(stockPct + (RISK_TOLERANCE_STOCK_ADJUSTMENT_PTS[riskTolerance] || 0), 10, 95);

  if (investmentHorizon === "SHORT_TERM") {
    stockPct = Math.min(stockPct, SHORT_TERM_STOCK_CAP_PCT);
  }

  const bondPct = Math.round((100 - stockPct) * 0.7);
  const cashPct = 100 - stockPct - bondPct;
  return { stocks: stockPct, bonds: bondPct, cash: cashPct };
}

function computeExpectedVolatilityRange(allocation) {
  const weighted = (key) =>
    (allocation.stocks / 100) * ASSUMED_ANNUAL_VOLATILITY_PCT.stocks[key] +
    (allocation.bonds / 100) * ASSUMED_ANNUAL_VOLATILITY_PCT.bonds[key] +
    (allocation.cash / 100) * ASSUMED_ANNUAL_VOLATILITY_PCT.cash[key];

  const lowPct = Math.round(weighted(0));
  const highPct = Math.round(weighted(1));
  const label = highPct >= 16 ? "Higher swings, higher growth potential" : highPct >= 8 ? "Moderate swings" : "Low swings, steadier value";
  return { lowPct, highPct, label };
}

function computeSuggestedAnnualReturnPct(allocation) {
  const blended =
    (allocation.stocks / 100) * ASSUMED_ANNUAL_RETURN_PCT.stocks +
    (allocation.bonds / 100) * ASSUMED_ANNUAL_RETURN_PCT.bonds +
    (allocation.cash / 100) * ASSUMED_ANNUAL_RETURN_PCT.cash;
  return Math.round(blended * 10) / 10;
}

function buildDiversificationExplanation(allocation) {
  return (
    `This starting point spreads your money across stocks (${allocation.stocks}% — growth potential, ` +
    `bigger short-term swings), bonds (${allocation.bonds}% — steadier, lower growth), and cash ` +
    `(${allocation.cash}% — safety, ready access), so no single market move affects your whole plan at once.`
  );
}

const EDUCATIONAL_TEMPLATES = {
  BEGINNER:
    "Compounding means your returns start earning their own returns over time — the earlier you start, the more time compounding has to work. Diversification (spreading money across different types of investments) exists so a single bad month in one area doesn't derail your whole plan. Nothing here is a promise — markets go up and down, and this is a starting point to learn from, not a guarantee.",
  INTERMEDIATE:
    "This allocation balances growth (stocks) against stability (bonds/cash) based on your age, risk tolerance, and horizon. Rebalancing periodically and staying consistent with contributions matters more than trying to time the market. All projections below are illustrations based on configurable assumptions, not promises.",
  ADVANCED:
    "Allocation derived from an age-based glide path, adjusted for stated risk tolerance and horizon. Treat the volatility range and projected-return figures as configurable planning assumptions, not forecasts — adjust them directly in the simulator to match your own view.",
};

function buildEducationalExplanation({ experienceLevel, investmentGoal }) {
  const base = EDUCATIONAL_TEMPLATES[experienceLevel] || EDUCATIONAL_TEMPLATES.BEGINNER;
  const goalLine = {
    WEALTH: " Since your goal is long-term wealth, staying invested through downturns matters more than short-term timing.",
    RETIREMENT: " Since your goal is retirement, this allocation is built to gradually grow more conservative as that date approaches.",
    PASSIVE_INCOME: " Since your goal is passive income, consider that dividend- and income-focused holdings may fit alongside this allocation.",
    LEARNING: " Since you're here to learn, take time to understand *why* each part of this allocation exists before acting on it.",
    HOUSE: " Since you're saving for a house, keep in mind capital you'll need soon is generally better protected in cash or bonds, not stocks.",
    OTHER: "",
  }[investmentGoal] || "";
  return base + goalLine;
}

/**
 * Sprint 20, Part 2 — the AI Investment Profile. Deliberately entirely
 * deterministic: no LLM call. Every return-dependent figure here (and in
 * the client-side compound-interest simulator that consumes
 * suggestedAnnualReturnPct as a starting point) must be presented as an
 * illustration based on configurable assumptions, never a promise.
 */
function generateInvestmentProfile(profile) {
  const allocation = computeSuggestedAllocation(profile);
  const volatility = computeExpectedVolatilityRange(allocation);
  const suggestedAnnualReturnPct = computeSuggestedAnnualReturnPct(allocation);

  return {
    suggestedAllocation: allocation,
    diversificationExplanation: buildDiversificationExplanation(allocation),
    expectedVolatility: volatility,
    suggestedAnnualReturnPct,
    educationalExplanation: buildEducationalExplanation(profile),
    assumptionsDisclosure:
      "All figures above and in the simulator are illustrations based on configurable, stated assumptions " +
      "(historical long-run averages), not promises or forecasts of future performance.",
  };
}

module.exports = {
  MIN_AGE,
  MAX_AGE,
  getInvestorProfile,
  createInvestorProfile,
  updateInvestorProfile,
  computeSuggestedAllocation,
  computeExpectedVolatilityRange,
  computeSuggestedAnnualReturnPct,
  generateInvestmentProfile,
};
