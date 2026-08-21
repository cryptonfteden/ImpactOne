// Weekly-only Fibonacci opportunity scanner.
//
// Discovery is intentionally technical and deterministic: verified daily
// OHLCV is aggregated into real weekly candles, the strongest chronological
// low -> later high swing is selected, and only symbols approaching the
// ImpactOne 0.886 retracement from above enter the agent committee.
const { getDailyBars } = require("./intelligence/priceHistoryProvider");
const { IMPACTONE_FIBONACCI_PROFILE } = require("./domainAgents/fibonacciAgent/impactOneFibonacciProfile");
const {
  MAX_WEEKS_SINCE_HIGH,
  selectWeeklyLowToHighSwing,
  analyzeWeeklySetup,
} = require("./domainAgents/fibonacciAgent/weeklyStrategyAnalyzer");
const { registerAllAgents } = require("./agentOrchestrator/registry");
const orchestrator = require("./agentOrchestrator/agentOrchestrator");
const { DEFAULT_UNIVERSE } = require("./insiderOpportunityService");
const { getUsEquityUniverse } = require("./usEquityUniverseService");
const { DECISION_GATES, POLICY_VERSION, weightedVotes } = require("./agentOrchestrator/strategyPolicy");
const { isDecisionEligible } = require("./agentOrchestrator/decisionEligibility");
const { summarizeCommittee } = require("./agentOrchestrator/committeeDecisionModel");
const { getBulkWeeklyCloses, isPotentialWeeklyApproach } = require("./intelligence/bulkWeeklyCloseProvider");
const fs = require("fs");
const path = require("path");

// A deliberately broad, sector-diverse liquid-US discovery universe. The
// previous implementation silently truncated the scan to 30 symbols, most of
// them mega caps. That made the radar look like a recommendation engine while
// it had never examined the rest of the opportunity set. Personal watchlist
// symbols are always placed first, but never reduce this discovery universe.
const DISCOVERY_UNIVERSE = [
  ...DEFAULT_UNIVERSE,
  // Software, semiconductors, internet and digital infrastructure
  "CRM", "ADBE", "INTC", "MU", "QCOM", "ARM", "ASML", "TSM", "MRVL", "ON",
  "SMCI", "DELL", "HPE", "ANET", "PANW", "CRWD", "NET", "DDOG", "SNOW", "MDB",
  "SHOP", "UBER", "ABNB", "DASH", "RBLX", "ROKU", "U", "PATH", "SOFI", "HOOD",
  // Industrials, aerospace, energy transition and materials
  "CAT", "DE", "BA", "GE", "GEV", "RTX", "LMT", "NOC", "ETN", "EMR",
  "HON", "PH", "URI", "FCX", "NEM", "AA", "CLF", "X", "STLD", "NUE",
  "FSLR", "ENPH", "SEDG", "PLUG", "BE", "QS", "CHPT", "RIVN", "LCID", "SMR",
  // Energy, finance and real assets
  "COP", "OXY", "SLB", "HAL", "EOG", "MPC", "VLO", "DVN", "FANG", "KMI",
  "GS", "MS", "C", "WFC", "SCHW", "BLK", "BX", "KKR", "COF", "AXP",
  // Healthcare and biotechnology
  "PFE", "MRK", "ABBV", "BMY", "AMGN", "GILD", "REGN", "VRTX", "BIIB", "MRNA",
  "CRSP", "BEAM", "NTLA", "RXRX", "TEM", "HIMS", "TMDX", "VKTX", "SAVA", "CELH",
  // Consumer, media, travel and special situations
  "WMT", "COST", "HD", "LOW", "TGT", "NKE", "SBUX", "MCD", "CMG", "CAVA",
  "DIS", "PARA", "WBD", "SPOT", "LYV", "RCL", "CCL", "DAL", "UAL", "LUV",
  // Liquid growth / momentum names often missed by mega-cap-only scans
  "APP", "DUOL", "IOT", "CFLT", "S", "AI", "BBAI", "SOUN", "IONQ", "RGTI",
  "QBTS", "RKLB", "ASTS", "LUNR", "RDW", "JOBY", "ACHR", "OKLO", "VST", "CEG",
];
const MARKET_BATCH_SIZE = Math.max(50, Number(process.env.WEEKLY_FIBONACCI_BATCH_SIZE) || 500);
const MARKET_CYCLE_TTL_MS = 24 * 60 * 60 * 1000;
const REVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TARGET_RATIO = IMPACTONE_FIBONACCI_PROFILE.entryZone.targetRatio;
const MAX_DISTANCE_ABOVE_PCT = IMPACTONE_FIBONACCI_PROFILE.entryZone.maxDistancePct;
// Keep independent cache entries per requested universe. A single mutable
// entry caused the app and Mission Control (which can request different
// personalized universes) to evict one another and rerun the expensive scan.
const STATE_FILE = path.resolve(__dirname, "..", "..", ".cache", "weekly-fibonacci-market-scan.json");
let marketState = null;
let marketScanInFlight = null;
// The same ticker can appear in several personalized universes. Reusing its
// reviewed result keeps committee votes, coverage and scores identical across
// the app and Mission Control during the scan TTL.
const reviewedOpportunityBySymbol = new Map();
const reviewInFlightBySymbol = new Map();

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeUniverse(symbols) {
  const values = Array.isArray(symbols) ? symbols : [];
  return Array.from(new Set(values.map((item) => String(item || "").trim().toUpperCase()).filter((item) => /^[A-Z.\-]{1,10}$/.test(item))));
}

function directionOf(agent) {
  const value = String(agent?.direction || "").toUpperCase();
  if (value.includes("BULL") || value === "BUY" || value === "POSITIVE") return "BULLISH";
  if (value.includes("BEAR") || value === "SELL" || value === "NEGATIVE") return "BEARISH";
  return "NEUTRAL";
}

function buildDecisionScore(setup, committee) {
  const fulfilled = (committee?.agents || []).filter((agent) => agent.status === "fulfilled");
  // A successful process is not automatically usable investment evidence.
  // Upgraded agents expose signalEligible=false when the provider returned an
  // empty, stale or insufficiently corroborated payload. Counting those rows
  // as committee coverage made an incomplete committee look complete.
  // Legacy/custom agents that do not expose the flag remain eligible so the
  // generic orchestrator contract stays backwards compatible.
  const eligible = fulfilled.filter(isDecisionEligible);
  const normalized = eligible.map((agent) => ({ ...agent, normalizedDirection: directionOf(agent) }));
  const bullish = normalized.filter((agent) => agent.normalizedDirection === "BULLISH");
  const bearish = normalized.filter((agent) => agent.normalizedDirection === "BEARISH");
  const allAgents = committee?.agents || [];
  const totalWeight = allAgents.reduce((sum, agent) => sum + Math.max(0.1, Number(agent.priority) || 1), 0);
  const eligibleWeight = eligible.reduce((sum, agent) => sum + Math.max(0.1, Number(agent.priority) || 1), 0);
  const legacyCoveragePct = totalWeight ? eligibleWeight / totalWeight * 100 : 0;
  const weighted = weightedVotes(normalized);
  const independent = summarizeCommittee(allAgents, { reportedTotal: committee?.summary?.total });
  const coveragePct = independent.coveragePct;
  const agreement = independent.direction === "BULLISH" ? 50 + independent.conviction / 2
    : independent.direction === "BEARISH" ? 50 - independent.conviction / 2 : 50;
  const confidence = independent.confidence;
  const independentConfirmations = independent.independentBullishFamilies.filter((family) => family !== "setup");
  const score = Math.round(setup.technicalScore * 0.5 + agreement * 0.25 + confidence * 0.15 + coveragePct * 0.1);
  const strongBearish = bearish.filter((agent) => Number(agent.confidence) >= 70);
  const strategyEligible = setup.signalEligible === true;
  const approved = strategyEligible
    && coveragePct >= DECISION_GATES.minimumCommitteeCoveragePct
    && independent.direction !== "BEARISH"
    && independentConfirmations.length >= 1
    && independent.vetoFamilies.length === 0
    && score >= DECISION_GATES.committeeApprovalScore;
  return {
    score,
    approved,
    label: approved ? (score >= 80 ? "HIGH-CONVICTION ENTRY WATCH" : "ENTRY WATCH") : "TECHNICAL REVIEW",
    coveragePct: Math.round(coveragePct),
    coverageMethod: independent.methodology,
    eligibleAgentCount: eligible.length,
    excludedAgentCount: allAgents.length - eligible.length,
    confidenceAverage: Math.round(confidence),
    votes: { bullish: bullish.length, neutral: fulfilled.length - bullish.length - bearish.length, bearish: bearish.length },
    weightedVotes: weighted,
    independentEvidence: independent,
    legacyAgentCoveragePct: Math.round(legacyCoveragePct),
    independentConfirmations,
    components: { weeklyFibonacci: setup.technicalScore, agentAgreement: Math.round(agreement), agentConfidence: Math.round(confidence), dataCompleteness: Math.round(coveragePct) },
    blockers: [
      ...(!strategyEligible
        ? (Array.isArray(setup.strategyWarnings) && setup.strategyWarnings.length
          ? setup.strategyWarnings
          : ["The verified weekly 0.886 strategy gate is not satisfied."])
        : []),
      ...(coveragePct < DECISION_GATES.minimumCommitteeCoveragePct ? [`Agent coverage is below ${DECISION_GATES.minimumCommitteeCoveragePct}%.`] : []),
      ...(!eligible.length ? ["No agent supplied decision-grade evidence."] : []),
      ...(independent.direction === "BEARISH" ? ["Independent evidence families lean bearish."] : []),
      ...(!independentConfirmations.length ? ["No independent evidence family confirms the Fibonacci setup."] : []),
      ...(independent.vetoFamilies.length ? [`Strategic veto: ${independent.vetoFamilies.join(", ")}.`] : []),
      ...(score < DECISION_GATES.committeeApprovalScore ? [`The combined evidence score is below ${DECISION_GATES.committeeApprovalScore}/100.`] : []),
    ],
  };
}

async function settleWithConcurrency(items, worker, limit = 4) {
  const results = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = { status: "fulfilled", value: await worker(items[index]) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results;
}

async function reviewSetup(setup, { force = false } = {}) {
  const symbol = setup.symbol;
  const cached = reviewedOpportunityBySymbol.get(symbol);
  if (!force && cached && Date.now() - cached.cachedAt < REVIEW_CACHE_TTL_MS) return cached.value;
  if (!force && reviewInFlightBySymbol.has(symbol)) return reviewInFlightBySymbol.get(symbol);

  const reviewPromise = (async () => {
    const committee = await orchestrator.run(symbol);
    const value = {
      symbol,
      generatedAt: committee.generatedAt,
      weekly: setup,
      committee: buildDecisionScore(setup, committee),
      agents: committee.agents.map((agent) => ({ id: agent.agentId, name: agent.agentName, status: agent.status, direction: directionOf(agent), confidence: Number.isFinite(Number(agent.confidence)) ? Number(agent.confidence) : null, summary: agent.summary || null })),
    };
    reviewedOpportunityBySymbol.set(symbol, { cachedAt: Date.now(), value });
    return value;
  })();
  reviewInFlightBySymbol.set(symbol, reviewPromise);
  try { return await reviewPromise; } finally { reviewInFlightBySymbol.delete(symbol); }
}

function universeSignature(symbols) {
  // Stable enough to invalidate an interrupted cycle when the official daily
  // directory changes, without exposing a several-thousand-symbol cache key.
  return require("crypto").createHash("sha256").update(symbols.join(",")).digest("hex");
}

function freshMarketState(universe) {
  return {
    version: 7,
    universeSignature: universeSignature(universe.symbols),
    universeSymbols: universe.symbols,
    universeSource: universe.source,
    universeSourceUrls: universe.sourceUrls,
    universeRetrievedAt: universe.retrievedAt,
    universeStale: Boolean(universe.stale),
    cursor: 0,
    cycleStartedAt: new Date().toISOString(),
    updatedAt: null,
    completedAt: null,
    scannedSymbols: new Set(),
    weeklyDataSymbols: new Set(),
    prefilteredSymbols: new Set(),
    nearTargetSymbols: new Set(),
    opportunitiesBySymbol: new Map(),
    failuresBySymbol: new Map(),
  };
}

function restoreMarketState(raw, universe) {
  if (!raw || raw.version !== 7 || raw.universeSignature !== universeSignature(universe.symbols)) return null;
  return {
    ...raw,
    universeSymbols: universe.symbols,
    universeSource: universe.source,
    universeSourceUrls: universe.sourceUrls,
    universeRetrievedAt: universe.retrievedAt,
    universeStale: Boolean(universe.stale),
    scannedSymbols: new Set(raw.scannedSymbols || []),
    weeklyDataSymbols: new Set(raw.weeklyDataSymbols || []),
    prefilteredSymbols: new Set(raw.prefilteredSymbols || []),
    nearTargetSymbols: new Set(raw.nearTargetSymbols || []),
    opportunitiesBySymbol: new Map(raw.opportunitiesBySymbol || []),
    failuresBySymbol: new Map(raw.failuresBySymbol || []),
  };
}

function readPersistedState(universe) {
  try { return restoreMarketState(JSON.parse(fs.readFileSync(STATE_FILE, "utf8")), universe); }
  catch { return null; }
}

function persistMarketState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      ...state,
      scannedSymbols: [...state.scannedSymbols],
      weeklyDataSymbols: [...state.weeklyDataSymbols],
      prefilteredSymbols: [...state.prefilteredSymbols],
      nearTargetSymbols: [...state.nearTargetSymbols],
      opportunitiesBySymbol: [...state.opportunitiesBySymbol],
      failuresBySymbol: [...state.failuresBySymbol],
    }));
  } catch {
    // Persistence is an optimization. The live scan remains valid in memory.
  }
}

function buildPayload(state) {
  const opportunities = [...state.opportunitiesBySymbol.values()].sort((a, b) => b.committee.score - a.committee.score);
  const approvedOpportunities = opportunities.filter((item) => item.committee.approved);
  const researchCandidates = opportunities.filter((item) => !item.committee.approved);
  const total = state.universeSymbols.length;
  // Cursor is the exact count of official directory symbols processed.
  // Personalized out-of-directory requests must never inflate market coverage.
  const scanned = Math.min(total, state.cursor);
  const officialSymbols = new Set(state.universeSymbols);
  const weeklyDataAvailable = [...state.weeklyDataSymbols].filter((symbol) => officialSymbols.has(symbol)).length;
  const failures = [...state.failuresBySymbol].slice(-100).map(([symbol, reason]) => ({ symbol, reason }));
  return {
    // Describes when the scan changed, rather than when a client read it.
    // Both frontends can therefore prove they render the same snapshot.
    generatedAt: state.updatedAt || state.completedAt || state.cycleStartedAt,
    methodologyVersion: "weekly-fibonacci-market-wide-v2",
    strategyPolicyVersion: POLICY_VERSION,
    scanStatus: state.completedAt ? "COMPLETE" : marketScanInFlight ? "SCANNING" : "PAUSED_BETWEEN_BATCHES",
    coverage: {
      scanned,
      configuredUniverse: total,
      officialUniverse: total,
      remaining: Math.max(0, total - scanned),
      progressPct: total ? Math.round(scanned / total * 1000) / 10 : 0,
      batchSize: MARKET_BATCH_SIZE,
      weeklyDataAvailable,
      broadPrefilter: state.prefilteredSymbols.size,
      nearPoint886: state.nearTargetSymbols.size,
      committeeReviewed: opportunities.length,
      approved: approvedOpportunities.length,
      rejectedByCommittee: researchCandidates.length,
      failures: state.failuresBySymbol.size,
      cycleComplete: Boolean(state.completedAt),
      cycleStartedAt: state.cycleStartedAt,
      completedAt: state.completedAt,
    },
    universe: {
      source: state.universeSource,
      sourceUrls: state.universeSourceUrls,
      retrievedAt: state.universeRetrievedAt,
      stale: state.universeStale,
      securityType: "US-listed operating-company equities; ETFs, funds, warrants, rights, units, preferred shares and debt excluded",
    },
    methodology: {
      timeframe: "Weekly candles only",
      universe: "All common operating-company equities in the official Nasdaq Trader Nasdaq/other-exchange directories",
      execution: `Incremental ${MARKET_BATCH_SIZE}-symbol batches with persistent full-market cycle coverage`,
      anchor: "Chronological weekly low to later weekly high",
      targetRatio: TARGET_RATIO,
      approachZone: `0% to ${MAX_DISTANCE_ABOVE_PCT}% above the 0.886 level; motion, prior crossings and swing age are disclosed to the committee but do not hide candidates`,
      maxWeeksSinceHigh: MAX_WEEKS_SINCE_HIGH,
      approvalThreshold: DECISION_GATES.committeeApprovalScore,
      minimumCommitteeCoveragePct: DECISION_GATES.minimumCommitteeCoveragePct,
      weights: { weeklyFibonacci: 50, agentAgreement: 25, agentConfidence: 15, dataCompleteness: 10 },
    },
    opportunities,
    approvedOpportunities,
    researchCandidates,
    failures,
  };
}

async function ensureMarketState({ forceUniverse = false } = {}) {
  let universe;
  try { universe = await getUsEquityUniverse({ force: forceUniverse }); }
  catch (error) {
    // A startup without network still scans the disclosed fallback set. It is
    // never labelled as full-market coverage.
    universe = {
      symbols: DISCOVERY_UNIVERSE,
      source: "Bundled emergency fallback universe",
      sourceUrls: [],
      retrievedAt: new Date().toISOString(),
      stale: true,
      warning: error.message,
    };
  }
  const signature = universeSignature(universe.symbols);
  if (!marketState || marketState.universeSignature !== signature) marketState = readPersistedState(universe) || freshMarketState(universe);
  if (marketState.completedAt && Date.now() - new Date(marketState.completedAt).getTime() >= MARKET_CYCLE_TTL_MS) marketState = freshMarketState(universe);
  return marketState;
}

async function scanNextMarketBatch({ symbols, force = false } = {}) {
  if (marketScanInFlight) return marketScanInFlight;
  marketScanInFlight = (async () => {
    const state = await ensureMarketState({ forceUniverse: force });
    const personalized = normalizeUniverse(symbols).filter((symbol) => !state.scannedSymbols.has(symbol));
    const officialBatch = state.completedAt ? [] : state.universeSymbols.slice(state.cursor, state.cursor + MARKET_BATCH_SIZE);
    const scanSymbols = [...new Set([...personalized, ...officialBatch])];
    if (!scanSymbols.length) return buildPayload(state);

    // Stage 1 covers every official symbol with real batched weekly closes.
    // The intentionally wide prefilter only decides which symbols deserve the
    // expensive full-OHLC verification in Stage 2.
    const weeklyCloses = await getBulkWeeklyCloses(scanSymbols);
    const personalizedSet = new Set(personalized);
    const detailSymbols = scanSymbols.filter((symbol) => personalizedSet.has(symbol) || isPotentialWeeklyApproach(weeklyCloses.get(symbol)));
    detailSymbols.forEach((symbol) => state.prefilteredSymbols.add(symbol));
    scanSymbols.forEach((symbol) => {
      state.scannedSymbols.add(symbol);
      const series = weeklyCloses.get(symbol);
      if (series?.length >= 20) {
        state.weeklyDataSymbols.add(symbol);
        state.failuresBySymbol.delete(symbol);
      } else {
        state.failuresBySymbol.set(symbol, "Batched weekly close history unavailable");
      }
    });

    const technicalResults = await settleWithConcurrency(detailSymbols, async (symbol) => analyzeWeeklySetup(symbol, await getDailyBars(symbol, { range: "2y" })), 6);
    const setups = [];
    technicalResults.forEach((item, index) => {
      const symbol = detailSymbols[index];
      if (item.status === "rejected") state.failuresBySymbol.set(symbol, item.reason?.message || "Weekly scan failed");
      else {
        setups.push(item.value);
        if (item.value.dataAvailable) {
          state.weeklyDataSymbols.add(symbol);
          state.failuresBySymbol.delete(symbol);
        }
        if (item.value.dataAvailable && item.value.signalEligible) state.nearTargetSymbols.add(symbol);
      }
    });

    const shortlist = setups.filter((item) => item.dataAvailable && item.signalEligible);
    if (shortlist.length) registerAllAgents();
    const reviewed = await settleWithConcurrency(shortlist, (setup) => reviewSetup(setup, { force }), 2);
    reviewed.forEach((item, index) => {
      if (item.status === "fulfilled") state.opportunitiesBySymbol.set(item.value.symbol, item.value);
      else state.failuresBySymbol.set(shortlist[index].symbol, item.reason?.message || "Agent committee review failed");
    });

    state.cursor = Math.min(state.universeSymbols.length, state.cursor + officialBatch.length);
    state.updatedAt = new Date().toISOString();
    if (state.cursor >= state.universeSymbols.length) state.completedAt = state.updatedAt;
    persistMarketState(state);
    return buildPayload(state);
  })();
  try { return await marketScanInFlight; } finally { marketScanInFlight = null; }
}

async function runScan({ symbols, force = false } = {}) {
  return scanNextMarketBatch({ symbols, force });
}

function getScanSnapshot() {
  return marketState ? buildPayload(marketState) : null;
}

function clearCache() {
  marketState = null;
  marketScanInFlight = null;
  reviewedOpportunityBySymbol.clear();
  reviewInFlightBySymbol.clear();
}

module.exports = {
  DISCOVERY_UNIVERSE,
  MARKET_BATCH_SIZE,
  TARGET_RATIO,
  selectWeeklyLowToHighSwing,
  analyzeWeeklySetup,
  buildDecisionScore,
  runScan,
  scanNextMarketBatch,
  getScanSnapshot,
  clearCache,
};
