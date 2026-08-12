const fs = require("node:fs");
const path = require("node:path");
const { getPrismaClient } = require("../db/prismaClient");

const prisma = getPrismaClient();
const execute = process.argv.includes("--execute");

// Ordered from dependent/leaf records toward their parent summaries. Most
// cross-engine references are deliberately loose strings, but keeping this
// order makes the cleanup safe if stronger relations are added later.
const PURGE_MODELS = [
  "claimOutcome",
  "claimTransition",
  "claimEvidence",
  "claim",
  "recommendationFeedback",
  "recommendationLifecycleEvent",
  "decisionTrace",
  "decisionState",
  "recommendation",
  "autonomousRunLog",
  "dailyBriefSnapshot",
  "notification",
  "marketSentimentSnapshot",
  "optionsSignal",
  "optionsOpenInterestSnapshot",
  "optionsFlowPrint",
  "intelligenceBusEvent",
  "canonicalEvent",
  "providerRunLog",
  "worldMemoryLesson",
  "worldMemorySectorImpact",
  "worldMemoryThesisRevision",
  "worldMemoryPrediction",
  "worldMemoryStateChange",
  "worldMemoryCausalLink",
  "worldMemoryRecord",
  "themeConfidenceSnapshot",
  "outcome",
  "sourceScoreSnapshot",
  "scoringAdjustmentAudit",
  "principleBacktestResult",
  "userMemoryEvent",
  "analyticsEvent",
  "errorReport",
];

const PRESERVED_MODELS = [
  "user",
  "session",
  "plan",
  "subscription",
  "usageCounter",
  "betaUser",
  "investorProfile",
  "portfolio",
  "position",
  "order",
  "trade",
  "cashLedgerEntry",
  "performanceSnapshot",
  "watchlistFolder",
  "watchlistFolderItem",
  "workspaceNote",
  "priceAlert",
  "feedback",
  "featureFlag",
  "methodologyVersion",
  "tradingPrinciple",
];

function serialize(value) {
  return JSON.stringify(
    value,
    (_key, item) => {
      if (typeof item === "bigint") return item.toString();
      if (item && typeof item === "object" && typeof item.toJSON === "function") return item.toJSON();
      return item;
    },
    2,
  );
}

async function countModels(names) {
  return Object.fromEntries(await Promise.all(names.map(async (name) => [name, await prisma[name].count()])));
}

async function main() {
  const purgeCounts = await countModels(PURGE_MODELS);
  const preservedCounts = await countModels(PRESERVED_MODELS);

  console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", purgeCounts, preservedCounts }, null, 2));
  if (!execute) {
    console.log("Dry run only. Re-run with --execute to back up and delete generated data.");
    return;
  }

  const backup = {};
  for (const model of PURGE_MODELS) {
    backup[model] = await prisma[model].findMany();
  }

  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const backupDirectory = path.resolve(__dirname, "../../backups/data-cleanup");
  const backupPath = path.join(backupDirectory, `generated-data-${stamp}.json`);
  fs.mkdirSync(backupDirectory, { recursive: true });
  fs.writeFileSync(backupPath, serialize({ createdAt: new Date().toISOString(), purgeCounts, data: backup }), "utf8");

  const deleted = {};
  await prisma.$transaction(async (tx) => {
    for (const model of PURGE_MODELS) {
      const result = await tx[model].deleteMany();
      deleted[model] = result.count;
    }
  });

  const remaining = await countModels(PURGE_MODELS);
  console.log(JSON.stringify({ backupPath, deleted, remaining }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
