const fs = require("fs");
const path = require("path");
const portfolioRepository = require("./portfolioRepository");
const portfolioEngine = require("./portfolioEngineService");
const fibonacciScanner = require("./weeklyFibonacciOpportunityService");
const { getDailyBars } = require("./intelligence/priceHistoryProvider");
const { summarizeCommittee } = require("./agentOrchestrator/committeeDecisionModel");

const STATE_FILE = path.resolve(__dirname, "..", "..", ".cache", "strategy-lab-trader.json");
const TRANCHE_OFFSETS = [0.05, 0.025, 0, -0.025, -0.05];
const ALLOCATION_PER_SETUP_PCT = 5;
const MAX_OPEN_SETUPS = 8;

function emptyState() {
  return { version: 1, activatedAt: new Date().toISOString(), plans: {}, journal: [], weeklyReports: [] };
}

function readState() {
  try { return { ...emptyState(), ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) }; }
  catch { return emptyState(); }
}

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function buildTranches(targetPrice) {
  const target = Number(targetPrice);
  if (!Number.isFinite(target) || target <= 0) throw new Error("A valid 0.886 target price is required.");
  return TRANCHE_OFFSETS.map((offset, index) => ({
    number: index + 1,
    offsetPct: Number((offset * 100).toFixed(1)),
    triggerPrice: Number((target * (1 + offset)).toFixed(4)),
    status: "WAITING",
  }));
}

function weeklyEntryGate(weekly) {
  const current = Number(weekly?.currentPrice);
  const target = Number(weekly?.targetPrice);
  const swing = weekly?.swing || {};
  const chronological = Number(swing.swingLowIndex) < Number(swing.swingHighIndex);
  const weeklyOnly = weekly?.candleTimeframe === "1W";
  const reached = current <= target;
  const notInvalidated = current >= target * 0.95;
  return {
    open: Boolean(weekly?.dataAvailable && weeklyOnly && chronological && reached && notInvalidated),
    currentPrice: current,
    targetPrice: target,
    reason: !weekly?.dataAvailable ? "Verified weekly candles are unavailable."
      : !weeklyOnly ? "The setup is not calculated from weekly candles."
      : !chronological ? "The weekly low must occur before the weekly high."
      : !reached ? "Waiting for price to reach the weekly 0.886 point."
      : !notInvalidated ? "Price is already more than 5% below the weekly 0.886 point."
      : "Weekly 0.886 entry point reached.",
  };
}

function shouldFillTranche(currentPrice, tranche, { armed = false } = {}) {
  if (!armed || tranche.status !== "WAITING") return false;
  const current = Number(currentPrice);
  // No purchase is allowed before the weekly 0.886 touch. After that first
  // touch, lower tranches average down and upper tranches buy only on a
  // confirming rebound — never while price is merely approaching 0.886.
  return tranche.offsetPct > 0
    ? current >= tranche.triggerPrice
    : current <= tranche.triggerPrice;
}

function exitDecision({ currentPrice, avgEntryPrice, targetPrice, agents = [], committee = {} }) {
  const price = Number(currentPrice);
  const entry = Number(avgEntryPrice);
  const target = Number(targetPrice);
  const gainPct = entry > 0 ? ((price / entry) - 1) * 100 : 0;
  if (target > 0 && price <= target * 0.925) return { exit: true, code: "RISK_FLOOR", reason: "Price fell 7.5% below the strategy point; the original setup is invalid." };
  const normalizedAgents = agents.map((agent) => ({ ...agent, agentId: agent.agentId || agent.id }));
  const synthesis = committee.independentEvidence || summarizeCommittee(normalizedAgents, { reportedTotal: committee?.reportedAgentCount || normalizedAgents.length });
  const strategicReversal = synthesis.vetoFamilies?.length > 0
    || (synthesis.direction === "BEARISH" && synthesis.conviction >= 60 && synthesis.coveragePct >= 60 && synthesis.independentBearishFamilies.length >= 2);
  if (strategicReversal) return { exit: true, code: "COMMITTEE_REVERSAL", reason: "At least two independent evidence families, or a fundamental/ownership veto, invalidated the setup." };
  const technicalBearish = normalizedAgents.some((agent) => agent.agentId === "technical" && agent.direction === "BEARISH" && Number(agent.confidence) >= 60);
  const nonTechnicalBearish = synthesis.independentBearishFamilies?.some((family) => family !== "priceAction");
  if (gainPct >= 15 && technicalBearish && nonTechnicalBearish) return { exit: true, code: "PROFIT_PROTECTION", reason: "The trade gained at least 15% while price action and an independent evidence family weakened." };
  return { exit: false, code: "HOLD", reason: "No evidence-backed exit gate was reached." };
}

function addJournal(state, event) {
  state.journal.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, at: new Date().toISOString(), ...event });
  state.journal = state.journal.slice(0, 2000);
}

async function getLabPortfolio() {
  return portfolioRepository.getOrCreateStrategyLabPortfolio();
}

async function resetExperiment({ preservePlans = false } = {}) {
  const portfolio = await getLabPortfolio();
  await portfolioRepository.resetPortfolio(portfolio.id);
  const previous = readState();
  const state = emptyState();
  if (preservePlans) {
    state.plans = Object.fromEntries(Object.entries(previous.plans || {}).map(([symbol, plan]) => [symbol, {
      ...plan,
      status: "ACTIVE",
      armedAt: undefined,
      closedAt: undefined,
      lastExitDecision: undefined,
      tranches: buildTranches(plan.targetPrice),
    }]));
  }
  addJournal(state, { type: "EXPERIMENT_RESET", note: preservePlans
    ? "The dedicated Strategy Lab holdings were cleared. The approved weekly symbol universe was preserved; no entry can occur before a new verified weekly 0.886 touch."
    : "Only the dedicated Strategy Lab portfolio was cleared; the user's manual portfolio was preserved." });
  writeState(state);
  return getStatus();
}

async function executeCycle() {
  const portfolio = await getLabPortfolio();
  const state = readState();
  const scan = fibonacciScanner.getScanSnapshot() || await fibonacciScanner.runScan();
  const candidates = (scan.approvedOpportunities || []).slice(0, MAX_OPEN_SETUPS);
  const summaryBefore = await portfolioEngine.getPortfolioSummaryById(portfolio.id);

  for (const candidate of candidates) {
    const symbol = candidate.symbol;
    if (!state.plans[symbol]) {
      state.plans[symbol] = {
        symbol,
        targetRatio: 0.886,
        targetPrice: candidate.weekly.targetPrice,
        swingLow: candidate.weekly.swing?.swingLow,
        swingHigh: candidate.weekly.swing?.swingHigh,
        committeeScore: candidate.committee.score,
        createdAt: new Date().toISOString(),
        status: "ACTIVE",
        tranches: buildTranches(candidate.weekly.targetPrice),
      };
      addJournal(state, { type: "PLAN_CREATED", symbol, targetPrice: candidate.weekly.targetPrice, committeeScore: candidate.committee.score });
    }
  }

  for (const plan of Object.values(state.plans).filter((item) => item.status === "ACTIVE")) {
    const candidate = (scan.opportunities || []).find((item) => item.symbol === plan.symbol);
    let liveWeekly = null;
    try {
      liveWeekly = await fibonacciScanner.analyzeWeeklySetup(plan.symbol, await getDailyBars(plan.symbol, { range: "2y" }));
    } catch (error) {
      plan.lastDataError = error.message;
    }
    const gate = weeklyEntryGate(liveWeekly);
    plan.lastWeeklyCheck = { ...gate, checkedAt: new Date().toISOString(), swing: liveWeekly?.swing || null };
    if (gate.open && !plan.armedAt) {
      plan.armedAt = new Date().toISOString();
      plan.targetPrice = gate.targetPrice;
      plan.tranches = buildTranches(gate.targetPrice);
      addJournal(state, { type: "WEEKLY_0886_REACHED", symbol: plan.symbol, targetPrice: gate.targetPrice, currentPrice: gate.currentPrice, swing: liveWeekly.swing });
    }
    const markedPosition = summaryBefore.positions.find((position) => position.symbol === plan.symbol);
    if (markedPosition) {
      const decision = exitDecision({ currentPrice: markedPosition.currentPrice, avgEntryPrice: markedPosition.avgEntryPrice, targetPrice: plan.targetPrice, agents: candidate?.agents, committee: candidate?.committee });
      plan.lastExitDecision = { ...decision, checkedAt: new Date().toISOString() };
      if (decision.exit) {
        const order = await portfolioEngine.placeOrder({ portfolioId: portfolio.id, symbol: plan.symbol, side: "SELL", quantity: Math.abs(Math.trunc(markedPosition.quantity)), verifiedPaperPrice: markedPosition.currentPrice, verifiedPaperPriceSource: "Strategy Lab marked price from the verified chart-provider chain" });
        plan.status = "CLOSED";
        plan.closedAt = new Date().toISOString();
        addJournal(state, { type: "EXIT_FILLED", symbol: plan.symbol, reason: decision.reason, order });
        continue;
      }
    }

    const currentPrice = Number(liveWeekly?.currentPrice);
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) continue;
    const trancheBudget = summaryBefore.startingCapital * (ALLOCATION_PER_SETUP_PCT / 100) / 5;
    for (const tranche of plan.tranches.filter((item) => shouldFillTranche(currentPrice, item, { armed: Boolean(plan.armedAt) }))) {
      const quantity = Math.floor(trancheBudget / currentPrice);
      if (quantity < 1) {
        tranche.status = "SKIPPED_TOO_SMALL";
        continue;
      }
      try {
        const order = await portfolioEngine.placeOrder({ portfolioId: portfolio.id, symbol: plan.symbol, side: "BUY", quantity, verifiedPaperPrice: currentPrice, verifiedPaperPriceSource: `Weekly Fibonacci verified candle · ${liveWeekly.latestWeek}` });
        Object.assign(tranche, { status: "FILLED", filledAt: new Date().toISOString(), actualPrice: order.trade?.price || currentPrice, quantity, orderId: order.order?.id });
        addJournal(state, { type: "ENTRY_FILLED", symbol: plan.symbol, tranche: tranche.number, triggerPrice: tranche.triggerPrice, actualPrice: tranche.actualPrice, quantity });
      } catch (error) {
        tranche.lastError = error.message;
        addJournal(state, { type: "ORDER_FAILED", symbol: plan.symbol, tranche: tranche.number, error: error.message });
      }
    }
  }

  state.lastCycleAt = new Date().toISOString();
  writeState(state);
  return getStatus();
}

function buildWeeklyReport(state, portfolio) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const events = state.journal.filter((item) => new Date(item.at).getTime() >= cutoff);
  const buys = events.filter((item) => item.type === "ENTRY_FILLED");
  const exits = events.filter((item) => item.type === "EXIT_FILLED");
  const pnl = Number(portfolio.totalReturn || 0);
  return {
    generatedAt: new Date().toISOString(),
    periodDays: 7,
    title: "השבוע של תיק הניסוי",
    simpleSummary: buys.length
      ? `השבוע הסוכן ביצע ${buys.length} פעימות קנייה ב-${new Set(buys.map((item) => item.symbol)).size} מניות. שווי התיק השתנה ב-${pnl.toFixed(2)} דולר.`
      : "השבוע הסוכן המתין בסבלנות ולא קנה מניה בלי אישור מלא של האסטרטגיה.",
    numbers: { buyTranches: buys.length, exits: exits.length, openPositions: portfolio.positions.length, cashBalance: portfolio.cashBalance, totalValue: portfolio.totalValue, totalReturn: portfolio.totalReturn, totalReturnPct: portfolio.totalReturnPct },
    events,
    safetyNote: "זהו מסחר דמה בלבד. אין הוראות שנשלחות לברוקר אמיתי.",
  };
}

async function generateWeeklyReport() {
  const state = readState();
  const portfolio = await getLabPortfolio();
  const summary = await portfolioEngine.getPortfolioSummaryById(portfolio.id);
  const report = buildWeeklyReport(state, summary);
  state.weeklyReports = [report, ...(state.weeklyReports || [])].slice(0, 52);
  writeState(state);
  return report;
}

async function getStatus() {
  const state = readState();
  const portfolio = await getLabPortfolio();
  const summary = await portfolioEngine.getPortfolioSummaryById(portfolio.id);
  return {
    mode: "PAPER_ONLY",
    portfolioName: portfolioRepository.STRATEGY_LAB_PORTFOLIO_NAME,
    policy: { fibonacciRatio: 0.886, timeframe: "WEEKLY_ONLY", entryAuthority: "FIBONACCI_ONLY", entryRule: "No first purchase until verified weekly price reaches 0.886", approachBandPct: 5, trancheOffsetsPct: TRANCHE_OFFSETS.map((value) => value * 100), trancheBehavior: "After the first 0.886 touch: central entry, two lower averaging entries, two upper rebound-confirmation entries", allocationPerSetupPct: ALLOCATION_PER_SETUP_PCT, exitGates: ["7.5% below 0.886 risk floor", "weighted committee reversal", "15% profit protection with weakening evidence"] },
    portfolio: summary,
    plans: Object.values(state.plans),
    journal: state.journal.slice(0, 100),
    latestWeeklyReport: state.weeklyReports?.[0] || buildWeeklyReport(state, summary),
    lastCycleAt: state.lastCycleAt || null,
  };
}

module.exports = { TRANCHE_OFFSETS, buildTranches, weeklyEntryGate, shouldFillTranche, exitDecision, buildWeeklyReport, getStatus, resetExperiment, executeCycle, generateWeeklyReport };
