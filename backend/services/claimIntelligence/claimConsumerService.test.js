require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const claimFormationService = require("./claimFormationService");
const claimResolutionService = require("./claimResolutionService");
const claimConsumerService = require("./claimConsumerService");
const repository = require("./claimRepository");
const { REQUIRED_CONTRACT_FIELDS } = require("./claimContract");

function optionsBusEvent({ symbol = "NVDA", aggressorSide = "BUY", confidence = 78, publishedAt = "2026-07-26T14:30:00.000Z" } = {}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    engineId: "options",
    symbols: [symbol],
    payload: { signalType: "SWEEP", aggressorSide, explanation: `${symbol} calls swept multiple exchanges.` },
    provenance: { sourceEngine: "options", sourceProvider: "optionsFlow" },
    publishedAt,
    confidence,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("canonical contract: every claim returned by a consumer service satisfies the full required shape", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  await claimFormationService.ingestBusEvent(optionsBusEvent(), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ confidence: 85, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });

  const active = await claimConsumerService.getActiveClaims();
  assert.ok(active.length >= 1);
  for (const field of REQUIRED_CONTRACT_FIELDS) {
    assert.ok(field in active[0], `missing required contract field: ${field}`);
  }
});

test("getClaimsBySymbol returns only claims that actually reference the given symbol", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "META" }), { now });

  const nvdaClaims = await claimConsumerService.getClaimsBySymbol("NVDA");
  assert.ok(nvdaClaims.every((claim) => claim.symbols.includes("NVDA")));
  assert.ok(nvdaClaims.length >= 1);
});

test("getContestedClaims returns only real CONTESTED claims", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  await claimFormationService.ingestBusEvent(optionsBusEvent({ aggressorSide: "BUY" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ aggressorSide: "SELL", confidence: 60, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });

  const contested = await claimConsumerService.getContestedClaims();
  assert.ok(contested.every((claim) => claim.status === "CONTESTED"));
  assert.ok(contested.length >= 1);
});

test("getRecentlyInvalidatedClaims returns only real INVALIDATED claims", async () => {
  const now = new Date("2026-07-27T15:00:00.000Z");
  const created = await claimFormationService.ingestBusEvent(optionsBusEvent(), { now });
  await claimFormationService.invalidateClaim(created.claim.id, { now: new Date(now.getTime() + 60000) });

  const invalidated = await claimConsumerService.getRecentlyInvalidatedClaims({});
  assert.ok(invalidated.some((claim) => claim.claimId === created.claim.id));
  assert.ok(invalidated.every((claim) => claim.status === "INVALIDATED"));
});

test("getRecentlyResolvedClaims only returns real, graded, terminal claims", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const first = await claimFormationService.ingestBusEvent(optionsBusEvent(), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ confidence: 85, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });
  await repository.updateClaimScalars(first.claim.id, { status: "EXPIRED" });
  await claimResolutionService.resolveClaim(first.claim.id, { actualDirection: "BULLISH", windowReturnPct: 5 }, { now: new Date(now.getTime() + 200000000) });

  const resolved = await claimConsumerService.getRecentlyResolvedClaims({});
  assert.ok(resolved.some((claim) => claim.claimId === first.claim.id));
  assert.ok(resolved.every((claim) => claim.status.startsWith("RESOLVED_") || claim.status === "INSUFFICIENT_DATA"));
});

test("getClaimHistory returns the real, full audit trail: claim view, transitions, and (once graded) outcome", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const first = await claimFormationService.ingestBusEvent(optionsBusEvent(), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ confidence: 85, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });

  const history = await claimConsumerService.getClaimHistory(first.claim.id);
  assert.equal(history.claim.claimId, first.claim.id);
  assert.ok(history.transitions.length >= 2);
  assert.equal(history.outcome, null); // not yet resolved
});

test("getStrongestEvidence ranks supporting and contradicting evidence separately, by real contribution/confidence", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const first = await claimFormationService.ingestBusEvent(optionsBusEvent({ confidence: 60 }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ confidence: 90, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ aggressorSide: "SELL", confidence: 55, publishedAt: new Date(now.getTime() + 120000).toISOString() }), { now: new Date(now.getTime() + 120000) });

  const { strongestSupporting, strongestContradicting } = await claimConsumerService.getStrongestEvidence(first.claim.id);
  assert.ok(strongestSupporting.every((entry) => entry.stance === "SUPPORTS"));
  assert.ok(strongestContradicting.every((entry) => entry.stance === "CONTRADICTS" || entry.stance === "INVALIDATES"));
});

test("getClaimsByPortfolioRelevance is honestly empty when the portfolio holds nothing matching any active claim", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "ZZZZ" }), { now });
  const relevant = await claimConsumerService.getClaimsByPortfolioRelevance({});
  assert.deepEqual(relevant, []);
});

test("Phase PRODUCT-001 — getClaimsChangedOvernight only returns claims whose real lastUpdatedAt falls within the window", async () => {
  // lastUpdatedAt is a Prisma @updatedAt column — it always reflects the
  // real wall-clock write time, not claimFormationService's simulated
  // `now` parameter (that only drives business timestamps like
  // firstObservedAt/expiresAt). To honestly test a real "old" claim here,
  // this directly backdates that one row's real lastUpdatedAt after
  // creation, rather than relying on a fabricated `now` that Prisma would
  // ignore anyway.
  const now = new Date("2026-07-27T15:00:00.000Z");
  const oldClaim = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "OLD" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "OLD", confidence: 85, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });

  const prisma = require("../../db/prismaClient").getPrismaClient();
  await prisma.claim.update({ where: { id: oldClaim.claim.id }, data: { lastUpdatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) } });

  const recent = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", confidence: 85, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });

  const changed = await claimConsumerService.getClaimsChangedOvernight({ now: new Date() });
  assert.ok(changed.some((claim) => claim.claimId === recent.claim.id));
  assert.ok(!changed.some((claim) => claim.claimId === oldClaim.claim.id));
});
