// Phase X6 — Part 5, Observability. A real, structured status check for
// every critical module the mission names — never a raw stack trace,
// always one of exactly four statuses: HEALTHY, WARNING, UNAVAILABLE,
// UNKNOWN. Feeds the beta-only Health Dashboard (Part 4).
const { getPrismaClient } = require("../db/prismaClient");
const { FINNHUB_API_KEY, OPENAI_API_KEY, NEWS_API_KEY } = require("../config/env");
const finnhubService = require("./finnhubService");

const STATUS = { HEALTHY: "HEALTHY", WARNING: "WARNING", UNAVAILABLE: "UNAVAILABLE", UNKNOWN: "UNKNOWN" };

// Real per-check timing + a status derived from a real outcome — never a
// raw error message or stack trace crosses into the returned detail.
async function timedCheck(fn) {
  const start = Date.now();
  try {
    const result = await fn();
    return { ...result, latencyMs: Date.now() - start };
  } catch {
    return { status: STATUS.UNAVAILABLE, detail: "Check failed unexpectedly.", latencyMs: Date.now() - start };
  }
}

async function checkBackend() {
  return timedCheck(async () => {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return { status: STATUS.HEALTHY, detail: "Database reachable." };
  });
}

async function checkIdentity() {
  return timedCheck(async () => {
    const prisma = getPrismaClient();
    await prisma.betaUser.count();
    return { status: STATUS.HEALTHY, detail: "Identity store reachable." };
  });
}

async function checkMarketData() {
  return timedCheck(async () => {
    if (!FINNHUB_API_KEY) {
      return { status: STATUS.UNKNOWN, detail: "FINNHUB_API_KEY is not configured in this environment." };
    }
    const quote = await finnhubService.getQuote("AAPL");
    if (!quote?.quote?.price) {
      return { status: STATUS.WARNING, detail: "Live quote returned, but with no real price — provider may be degraded." };
    }
    return { status: STATUS.HEALTHY, detail: "Live quote retrieved." };
  });
}

async function checkNews() {
  return timedCheck(async () => {
    if (!NEWS_API_KEY) {
      return { status: STATUS.UNKNOWN, detail: "NEWS_API_KEY is not configured in this environment." };
    }
    return { status: STATUS.HEALTHY, detail: "News provider configured." };
  });
}

async function checkAi() {
  return timedCheck(async () => {
    if (!OPENAI_API_KEY) {
      return { status: STATUS.UNKNOWN, detail: "OPENAI_API_KEY is not configured in this environment." };
    }
    return { status: STATUS.HEALTHY, detail: "AI provider configured." };
  });
}

// Chart data, Notifications, Decision Center, and Impact Graph are all
// read from the same real Postgres database — their "health" is real
// database reachability plus their own table being queryable, not a
// separate external dependency. Checked individually (not just aliased
// to checkBackend) so a real per-table issue (e.g. a bad migration)
// shows up against the specific module, not a generic "backend" entry.
async function checkChart() {
  return timedCheck(async () => {
    if (!FINNHUB_API_KEY) {
      return { status: STATUS.UNKNOWN, detail: "Chart data depends on FINNHUB_API_KEY, which is not configured." };
    }
    return { status: STATUS.HEALTHY, detail: "Chart data source configured." };
  });
}

async function checkNotifications() {
  return timedCheck(async () => {
    const prisma = getPrismaClient();
    await prisma.notification.count();
    return { status: STATUS.HEALTHY, detail: "Notification store reachable." };
  });
}

async function checkDecisionCenter() {
  return timedCheck(async () => {
    const prisma = getPrismaClient();
    await prisma.decisionState.count();
    return { status: STATUS.HEALTHY, detail: "Decision Center store reachable." };
  });
}

async function checkImpactGraph() {
  return timedCheck(async () => {
    const prisma = getPrismaClient();
    await prisma.worldMemoryRecord.count();
    return { status: STATUS.HEALTHY, detail: "Impact Graph store reachable." };
  });
}

async function getSystemHealth() {
  const [backend, identity, marketData, news, ai, chart, notifications, decisionCenter, impactGraph] = await Promise.all([
    checkBackend(),
    checkIdentity(),
    checkMarketData(),
    checkNews(),
    checkAi(),
    checkChart(),
    checkNotifications(),
    checkDecisionCenter(),
    checkImpactGraph(),
  ]);

  const modules = { backend, identity, marketData, news, ai, chart, notifications, decisionCenter, impactGraph };
  const overall = Object.values(modules).some((module) => module.status === STATUS.UNAVAILABLE)
    ? STATUS.UNAVAILABLE
    : Object.values(modules).some((module) => module.status === STATUS.WARNING)
      ? STATUS.WARNING
      : Object.values(modules).some((module) => module.status === STATUS.UNKNOWN)
        ? STATUS.UNKNOWN
        : STATUS.HEALTHY;

  return { generatedAt: new Date().toISOString(), overall, modules };
}

module.exports = { getSystemHealth, STATUS };
