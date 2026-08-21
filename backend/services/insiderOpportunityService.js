// Daily insider-opportunity scanner.
//
// Stage 1 is deliberately narrow: only real SEC Form 4 open-market
// purchases (transaction code P) qualify. Grants, option exercises and
// gifts never enter the shortlist. Stage 2 asks the existing multi-agent
// orchestrator to challenge each shortlisted symbol. Missing agents reduce
// coverage/confidence; they are never replaced with made-up neutral votes.
const insiderEngine = require("./domainAgents/insiderAgent/insiderAgent");
const { registerAllAgents } = require("./agentOrchestrator/registry");
const orchestrator = require("./agentOrchestrator/agentOrchestrator");
const { discoverRecentInsiderBuys, discoverRecentSecOpenMarketBuys, createDiscoveredFilingProvider } = require("./insiderDiscoveryService");
const { DECISION_GATES, POLICY_VERSION, weightedVotes } = require("./agentOrchestrator/strategyPolicy");
const { isDecisionEligible } = require("./agentOrchestrator/decisionEligibility");
const { summarizeCommittee } = require("./agentOrchestrator/committeeDecisionModel");
const { ACTIONABLE_MAX_AGE_DAYS, summarizeVerifiedPurchases } = require("./domainAgents/insiderAgent/openMarketPurchasePolicy");

const DEFAULT_UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD",
  "AVGO", "ORCL", "JPM", "BAC", "XOM", "CVX", "LLY", "UNH",
  "PLTR", "MSTR", "COIN", "NFLX",
];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DEFAULT_SCAN = 30;
const SCAN_CONCURRENCY = 2;
const scannerProvider = insiderEngine.createInsiderDataProvider({ maxFilings: 6, lookbackDays: 30 });
// Cache each requested universe independently. The app and Mission Control
// may supply different personalized symbols; a single cache slot made those
// requests evict one another and repeat the SEC scan within the 24-hour TTL.
const dailyCacheByUniverse = new Map();
const inFlightByUniverse = new Map();

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function transactionValue(transaction) {
  const shares = Number(transaction?.shares);
  const price = Number(transaction?.pricePerShare);
  return Number.isFinite(shares) && Number.isFinite(price) ? shares * price : 0;
}

function summarizePurchases(report) {
  return summarizeVerifiedPurchases(report?.inputs?.transactions || []);
}

function directionOf(agent) {
  const direction = String(agent?.direction || "").toUpperCase();
  if (direction.includes("BULL") || direction === "BUY" || direction === "POSITIVE") return "BULLISH";
  if (direction.includes("BEAR") || direction === "SELL" || direction === "NEGATIVE") return "BEARISH";
  return "NEUTRAL";
}

function buildCommitteeScore({ insiderReport, purchaseSummary, committee }) {
  const allAgents = committee?.agents || [];
  const fulfilled = allAgents.filter((agent) => agent.status === "fulfilled");
  const eligible = fulfilled.filter(isDecisionEligible);
  const directional = eligible.map((agent) => ({ ...agent, normalizedDirection: directionOf(agent) }));
  const bullish = directional.filter((agent) => agent.normalizedDirection === "BULLISH");
  const bearish = directional.filter((agent) => agent.normalizedDirection === "BEARISH");
  const highConfidenceBearish = bearish.filter((agent) => Number(agent.confidence) >= 70);
  const representedWeight = allAgents.reduce((sum, agent) => sum + Math.max(0.1, Number(agent.priority) || 1), 0);
  const reportedTotal = Math.max(allAgents.length, Number(committee?.summary?.total) || 0);
  const missingAgentCount = Math.max(0, reportedTotal - allAgents.length);
  const averageRepresentedWeight = allAgents.length ? representedWeight / allAgents.length : 1;
  // A partially serialized committee may report a larger total than the rows
  // attached to the response. Those missing agents must reduce coverage too;
  // estimate only their denominator weight, never a vote or confidence.
  const totalWeight = representedWeight + missingAgentCount * averageRepresentedWeight;
  const eligibleWeight = eligible.reduce((sum, agent) => sum + Math.max(0.1, Number(agent.priority) || 1), 0);
  const legacyCoverage = totalWeight > 0 ? eligibleWeight / totalWeight : 0;

  const insiderRecency = purchaseSummary.ageDays === null ? 0 : clamp(100 - purchaseSummary.ageDays * 1.25);
  const insiderSize = clamp(30 + Math.log10(Math.max(1, purchaseSummary.value)) * 9);
  const buyerBreadth = clamp(purchaseSummary.distinctBuyers * 24);
  const insiderConviction = Math.round(
    clamp(Number(insiderReport?.netInsiderScore || 0) * 0.45 + 50) * 0.35
    + insiderRecency * 0.25
    + insiderSize * 0.2
    + buyerBreadth * 0.2
  );
  const directionalDenominator = Math.max(1, bullish.length + bearish.length);
  const agreement = clamp(50 + ((bullish.length - bearish.length) / directionalDenominator) * 50);
  const confidenceAverage = eligibleWeight
    ? eligible.reduce((sum, agent) => sum + clamp(agent.confidence) * Math.max(0.1, Number(agent.priority) || 1), 0) / eligibleWeight
    : 0;
  const weighted = weightedVotes(directional);
  const independent = summarizeCommittee(allAgents, { reportedTotal });
  const coverage = independent.coveragePct / 100;
  const completeness = independent.coveragePct;
  const weightedAgreement = independent.direction === "BULLISH" ? 50 + independent.conviction / 2
    : independent.direction === "BEARISH" ? 50 - independent.conviction / 2 : 50;
  const independentConfirmations = independent.independentBullishFamilies.filter((family) => family !== "ownership");

  // Transparent weighted average over real observations. The insider fact
  // receives the largest weight because it is the scanner's initiating
  // signal; committee agreement and agent confidence challenge it.
  const score = Math.round(
    insiderConviction * 0.4
    + weightedAgreement * 0.25
    + confidenceAverage * 0.2
    + completeness * 0.15
  );
  const approved = purchaseSummary.count > 0
    && purchaseSummary.actionableFreshness
    && coverage >= DECISION_GATES.minimumCommitteeCoveragePct / 100
    && independent.direction !== "BEARISH"
    && independentConfirmations.length >= 1
    && independent.vetoFamilies.filter((family) => family !== "ownership").length === 0
    && score >= DECISION_GATES.committeeApprovalScore;

  return {
    score,
    approved,
    label: approved ? (score >= 80 ? "STRONG BUY WATCH" : "BUY WATCH") : "REVIEW",
    coveragePct: Math.round(completeness),
    confidenceAverage: Math.round(confidenceAverage),
    votes: { bullish: bullish.length, neutral: eligible.length - bullish.length - bearish.length, bearish: bearish.length },
    eligibleAgentCount: eligible.length,
    excludedAgentCount: allAgents.length - eligible.length,
    coverageMethod: independent.methodology,
    weightedVotes: weighted,
    independentEvidence: independent,
    legacyAgentCoveragePct: Math.round(legacyCoverage * 100),
    independentConfirmations,
    components: {
      insiderConviction,
      agentAgreement: Math.round(weightedAgreement),
      agentConfidence: Math.round(confidenceAverage),
      dataCompleteness: Math.round(completeness),
    },
    blockers: [
      ...(!purchaseSummary.actionableFreshness ? [`Latest verified purchase is older than ${ACTIONABLE_MAX_AGE_DAYS} days.`] : []),
      ...(coverage < DECISION_GATES.minimumCommitteeCoveragePct / 100 ? [`Agent coverage is below ${DECISION_GATES.minimumCommitteeCoveragePct}%.`] : []),
      ...(!eligible.length ? ["No agent supplied decision-grade evidence."] : []),
      ...(independent.direction === "BEARISH" ? ["Independent evidence families lean bearish."] : []),
      ...(!independentConfirmations.length ? ["No independent evidence family confirms the insider signal."] : []),
      ...(independent.vetoFamilies.filter((family) => family !== "ownership").length ? [`Strategic veto: ${independent.vetoFamilies.filter((family) => family !== "ownership").join(", ")}.`] : []),
      ...(score < DECISION_GATES.committeeApprovalScore ? [`The weighted evidence score is below ${DECISION_GATES.committeeApprovalScore}/100.`] : []),
    ],
  };
}

function buildUnusualActivity(purchaseSummary) {
  const valueScore = clamp(Math.log10(Math.max(1, purchaseSummary.value)) * 15 - 20);
  const clusterScore = clamp(purchaseSummary.distinctBuyers * 22);
  const recencyScore = purchaseSummary.ageDays === null ? 0 : clamp(100 - purchaseSummary.ageDays * 5);
  const score = Math.round(valueScore * 0.5 + clusterScore * 0.3 + recencyScore * 0.2);
  return {
    score,
    unusual: score >= 60 || purchaseSummary.value >= 250000 || purchaseSummary.distinctBuyers >= 2,
    label: score >= 80 ? "HIGHLY UNUSUAL" : score >= 60 ? "UNUSUAL BUY" : "INSIDER BUY",
    reasons: [
      ...(purchaseSummary.value >= 250000 ? [`$${Math.round(purchaseSummary.value).toLocaleString("en-US")} open-market purchase value`] : []),
      ...(purchaseSummary.distinctBuyers >= 2 ? `${purchaseSummary.distinctBuyers} separate insiders bought`.split("|") : []),
      ...(purchaseSummary.ageDays !== null && purchaseSummary.ageDays <= 3 ? ["Filed within the last 3 days"] : []),
    ],
  };
}

function buildInsiderReversal({ purchaseSummary, committee }) {
  const fibonacciAgent = (committee?.agents || []).find((agent) => agent.agentId === "fibonacci" && agent.status === "fulfilled");
  const fibonacci = fibonacciAgent?.result?.raw || fibonacciAgent?.raw || null;
  const weekly = fibonacci?.weeklyStrategy;
  const currentPrice = Number(weekly?.currentPrice);
  const swingHigh = Number(weekly?.swing?.swingHigh);
  const point886 = Number(weekly?.targetPrice);
  const drawdownPct = currentPrice > 0 && swingHigh > 0 ? (swingHigh - currentPrice) / swingHigh * 100 : null;
  const distancePct = currentPrice > 0 && point886 > 0 ? Math.abs(currentPrice - point886) / point886 * 100 : null;
  const drawdownAligned = Number.isFinite(drawdownPct) && drawdownPct >= DECISION_GATES.insiderReversalMinimumDrawdownPct;
  const fibonacciAligned = Boolean(fibonacci?.signalEligible) && Number.isFinite(distancePct) && distancePct <= DECISION_GATES.fibonacciDistancePct;
  const triggered = purchaseSummary.count > 0 && purchaseSummary.actionableFreshness && drawdownAligned && fibonacciAligned;
  return {
    status: triggered ? "INSIDER REVERSAL" : drawdownAligned || fibonacciAligned ? "REVERSAL WATCH" : "NOT TRIGGERED",
    triggered,
    timeframe: "Completed weekly candles only",
    currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
    priorSwingHigh: Number.isFinite(swingHigh) ? swingHigh : null,
    drawdownPct: Number.isFinite(drawdownPct) ? Math.round(drawdownPct * 100) / 100 : null,
    point886: Number.isFinite(point886) ? point886 : null,
    distanceTo886Pct: Number.isFinite(distancePct) ? Math.round(distancePct * 100) / 100 : null,
    conditions: { verifiedOpenMarketPurchase: purchaseSummary.count > 0, recentVerifiedPurchase: purchaseSummary.actionableFreshness, materialDrawdown: drawdownAligned, nearPoint886: fibonacciAligned },
    blockers: [
      ...(!purchaseSummary.actionableFreshness ? [`Latest verified purchase is older than ${ACTIONABLE_MAX_AGE_DAYS} days.`] : []),
      ...(!Number.isFinite(drawdownPct) ? ["Verified price swing data is unavailable."] : !drawdownAligned ? [`Drawdown is below ${DECISION_GATES.insiderReversalMinimumDrawdownPct}%.`] : []),
      ...(!Number.isFinite(distancePct) ? ["A verified 0.886 level is unavailable."] : !fibonacciAligned ? [`Price is more than ${DECISION_GATES.fibonacciDistancePct}% from 0.886.`] : []),
    ],
  };
}

function summarizeDiscoveredPurchase(item) {
  const transactions = Array.isArray(item?.transactions) ? item.transactions : [];
  const shares = transactions.reduce((sum, row) => sum + Number(row.shares || 0), 0);
  const totalValue = transactions.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const buyers = [...new Set(transactions.map((row) => row.owner).filter(Boolean))];
  const summary = { count: transactions.length, distinctBuyers: buyers.length, shares, value: totalValue, averagePrice: shares ? totalValue / shares : null, ageDays: 0 };
  return {
    symbol: item.symbol, company: item.company, verificationStatus: "PENDING_SEC_VERIFICATION",
    filingSource: "Finviz public insider feed · SEC filing linked",
    filingUrl: transactions[0]?.filingUrl || null,
    insider: { purchaseCount: transactions.length, distinctBuyers: buyers.length, shares, totalValue, averagePrice: summary.averagePrice, latestPurchaseDate: transactions[0]?.transactionDateLabel || null, buyers: transactions.slice(0, 5).map((row) => ({ name: row.owner, role: row.role, date: row.transactionDateLabel, shares: row.shares, price: row.price, value: row.value })) },
    unusualActivity: buildUnusualActivity(summary),
    committee: { score: null, approved: false, label: "NOT YET SCORED", coveragePct: 0, votes: { bullish: 0, neutral: 0, bearish: 0 }, blockers: ["SEC EDGAR verification is pending; the agent committee has not scored this symbol."] },
  };
}

function normalizeUniverse(symbols) {
  // Personal symbols are prioritised, while the core liquid universe remains
  // covered so a small watchlist does not turn the scanner into a single-name
  // widget.
  const values = Array.isArray(symbols) && symbols.length ? [...symbols, ...DEFAULT_UNIVERSE] : DEFAULT_UNIVERSE;
  return Array.from(new Set(values.map((value) => String(value || "").trim().toUpperCase()).filter((value) => /^[A-Z.\-]{1,10}$/.test(value))));
}

async function analyzeSymbol(symbol, { insiderProvider } = {}) {
  const insiderReport = await insiderEngine.generateReport(symbol, { provider: insiderProvider || scannerProvider });
  const purchaseSummary = summarizePurchases(insiderReport);
  if (!insiderReport.dataAvailable || purchaseSummary.count === 0) return null;

  registerAllAgents();
  const committee = await orchestrator.run(symbol);
  const committeeScore = buildCommitteeScore({ insiderReport, purchaseSummary, committee });
  const unusualActivity = buildUnusualActivity(purchaseSummary);
  const reversalSignal = buildInsiderReversal({ purchaseSummary, committee });
  return {
    symbol,
    company: insiderReport.inputs?.companyTitle || symbol,
    generatedAt: committee.generatedAt,
    filingSource: "SEC EDGAR Form 4",
    filingUrl: purchaseSummary.purchases[0]?.filingUrl || null,
    insider: {
      purchaseCount: purchaseSummary.count,
      distinctBuyers: purchaseSummary.distinctBuyers,
      shares: Math.round(purchaseSummary.shares),
      totalValue: Math.round(purchaseSummary.value * 100) / 100,
      averagePrice: purchaseSummary.averagePrice,
      latestPurchaseDate: purchaseSummary.latestDate,
      clusterBuy: Boolean(insiderReport.clusterActivity?.clusterBuy),
      netInsiderScore: insiderReport.netInsiderScore,
      buyers: purchaseSummary.purchases.slice(0, 5).map((item) => ({
        name: item.ownerName,
        role: item.officerTitle || (item.isDirector ? "Director" : item.isOfficer ? "Officer" : "Insider"),
        date: item.transactionDate,
        shares: item.shares,
        price: item.pricePerShare,
        value: transactionValue(item),
      })),
    },
    dataQuality: {
      source: purchaseSummary.source,
      verificationRule: purchaseSummary.verificationRule,
      cik: insiderReport.inputs?.cik || null,
      filingsFetched: insiderReport.inputs?.filingsFetched || 0,
      distinctFilings: purchaseSummary.distinctFilings,
      latestVerifiedPurchaseDate: purchaseSummary.latestDate,
      ageDays: purchaseSummary.ageDays,
      actionableFreshness: purchaseSummary.actionableFreshness,
    },
    unusualActivity,
    reversalSignal,
    committee: committeeScore,
    agents: committee.agents.map((agent) => ({
      id: agent.agentId,
      name: agent.agentName,
      status: agent.status,
      direction: directionOf(agent),
      confidence: Number.isFinite(Number(agent.confidence)) ? Number(agent.confidence) : null,
      summary: agent.summary || null,
    })),
  };
}

async function settleWithConcurrency(items, worker, limit = SCAN_CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results;
}

async function runDailyScan({ symbols, force = false } = {}) {
  const isDefault = !Array.isArray(symbols) || symbols.length === 0;
  let discovery = [];
  let discoverySource = "SEC EDGAR current Form 4 feed";
  if (isDefault) {
    try { discovery = await discoverRecentSecOpenMarketBuys({ limit: MAX_DEFAULT_SCAN }); } catch {}
    if (!discovery.length) {
      discoverySource = "Finviz public discovery feed; every candidate reverified with SEC EDGAR";
      try { discovery = await discoverRecentInsiderBuys({ limit: MAX_DEFAULT_SCAN }); } catch {}
    }
  }
  const requested = isDefault && discovery.length ? discovery.map((item) => item.symbol) : normalizeUniverse(symbols);
  const universe = requested.slice(0, isDefault ? MAX_DEFAULT_SCAN : 30);
  const cacheKey = universe.join(",");
  const cached = dailyCacheByUniverse.get(cacheKey);
  if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.payload;
  if (!force && inFlightByUniverse.has(cacheKey)) return inFlightByUniverse.get(cacheKey);

  const scanPromise = (async () => {
    // The SEC asks API consumers to behave politely. Bounded concurrency also
    // prevents a daily scan from exhausting the rest of the application's
    // provider budget.
    const discoveryBySymbol = new Map(discovery.map((item) => [item.symbol, item]));
    const settled = await settleWithConcurrency(universe, (symbol) => analyzeSymbol(symbol, {
      insiderProvider: discoveryBySymbol.has(symbol) ? createDiscoveredFilingProvider(discoveryBySymbol.get(symbol)) : undefined,
    }));
    const opportunities = settled
      .filter((entry) => entry.status === "fulfilled" && entry.value)
      .map((entry) => entry.value)
      .sort((a, b) => Number(b.committee.score) - Number(a.committee.score));
    const failures = settled
      .map((entry, index) => entry.status === "rejected" ? { symbol: universe[index], reason: entry.reason?.message || "Scan failed" } : null)
      .filter(Boolean);
    const payload = {
      generatedAt: new Date().toISOString(),
      nextRefreshAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      methodologyVersion: "insider-closed-loop-v2",
      strategyPolicyVersion: POLICY_VERSION,
      coverage: { scanned: universe.length, configuredUniverse: requested.length, discoveredRecentBuySymbols: discovery.length, candidatesWithOpenMarketBuys: opportunities.length, unusualPurchases: opportunities.filter((item) => item.unusualActivity?.unusual).length, approved: opportunities.filter((item) => item.committee?.approved).length, failures: failures.length },
      methodology: {
        discovery: discovery.length ? discoverySource : "No current-filing discovery source was available; fallback symbols were checked but are not presented as discovered opportunities",
        trigger: "Verified SEC Form 4 open-market purchase (transaction code P)",
        verification: "Every discovered candidate is independently re-fetched and parsed from SEC EDGAR before display",
        approvalGate: `At least ${DECISION_GATES.minimumCommitteeCoveragePct}% agent coverage, weighted bullish evidence >= weighted bearish evidence, no >=70-confidence bearish objection, score >=${DECISION_GATES.committeeApprovalScore}`,
        weights: { insiderConviction: 40, agentAgreement: 25, agentConfidence: 20, dataCompleteness: 15 },
      },
      discoveredPurchases: discovery.map((item) => {
        const verified = opportunities.find((opportunity) => opportunity.symbol === item.symbol);
        return verified || summarizeDiscoveredPurchase(item);
      }),
      opportunities,
      failures,
    };
    dailyCacheByUniverse.set(cacheKey, { cachedAt: Date.now(), payload });
    return payload;
  })();
  inFlightByUniverse.set(cacheKey, scanPromise);

  try {
    return await scanPromise;
  } finally {
    inFlightByUniverse.delete(cacheKey);
  }
}

function clearCache() {
  dailyCacheByUniverse.clear();
  inFlightByUniverse.clear();
}

module.exports = {
  DEFAULT_UNIVERSE,
  summarizePurchases,
  buildCommitteeScore,
  buildUnusualActivity,
  buildInsiderReversal,
  summarizeDiscoveredPurchase,
  analyzeSymbol,
  runDailyScan,
  clearCache,
};
