// Phase COMMERCIAL-MVP-001 — one-off/idempotent script that seeds the
// real, internal plan catalog (never fetched from a billing vendor —
// see the Plan model's own schema comment). Safe to run repeatedly
// (uses `upsertPlan`, keyed by the real, unique `key`). Run manually:
// node backend/scripts/seedPlans.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const planRepository = require("../services/planRepository");

const PLANS = [
  {
    key: "free",
    name: "Free",
    priceCents: 0,
    billingPeriod: "NONE",
    features: {
      unifiedStockIntelligence: true,
      maxAiAnalysesPerMonth: 5,
    },
  },
  {
    key: "pro",
    name: "Pro",
    priceCents: 2900,
    billingPeriod: "MONTHLY",
    features: {
      unifiedStockIntelligence: true,
      maxAiAnalysesPerMonth: null, // genuinely unlimited
      agentReliabilityHistory: true,
    },
  },
];

(async () => {
  for (const plan of PLANS) {
    const result = await planRepository.upsertPlan(plan);
    console.log("seeded plan:", result.key, "->", result.id);
  }
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
