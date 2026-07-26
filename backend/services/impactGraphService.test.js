require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const impactGraphService = require("./impactGraphService");

test.beforeEach(async () => {
  await truncateAll();
});

test("getImpactGraph requires a symbol", async () => {
  await assert.rejects(() => impactGraphService.getImpactGraph(""), (error) => error.statusCode === 400);
});

test("honestly reports NO_DATA — never fabricates a chain — when no WorldMemoryRecord mentions the symbol", async () => {
  const result = await impactGraphService.getImpactGraph("ZZZZ_NOT_REAL");
  assert.equal(result.status, "NO_DATA");
  assert.equal(result.nodes.length, 0);
  assert.equal(result.edges.length, 0);
  assert.match(result.message, /No WorldMemoryRecord mentions/);
});

test("reports NODES_ONLY_NO_LINKS when real records exist but no causal link connects them — never invents an edge", async () => {
  const prisma = getPrismaClient();
  await prisma.worldMemoryRecord.create({
    data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: ["Semiconductors"], headline: "NVDA earnings beat" },
  });

  const result = await impactGraphService.getImpactGraph("NVDA");
  assert.equal(result.status, "NODES_ONLY_NO_LINKS");
  assert.equal(result.nodes.length, 1);
  assert.equal(result.edges.length, 0);
  assert.match(result.message, /no causal links between them yet/);
});

test("builds a real graph from real causal links, with real confidence and explanation on every edge", async () => {
  const prisma = getPrismaClient();
  const cause = await prisma.worldMemoryRecord.create({
    data: { occurredAt: new Date(), symbols: ["TSM"], sectors: ["Semiconductors"], headline: "Taiwan geopolitical tension rises" },
  });
  const effect = await prisma.worldMemoryRecord.create({
    data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: ["Semiconductors"], headline: "NVDA supply chain risk flagged" },
  });
  await prisma.worldMemoryCausalLink.create({
    data: {
      causeRecordId: cause.id,
      effectRecordId: effect.id,
      explanation: "TSMC fabricates NVDA's chips; Taiwan tension is a real, cited supply risk.",
      confidence: 62.5,
      methodologyVersion: "x3-v1",
    },
  });

  const result = await impactGraphService.getImpactGraph("NVDA");
  assert.equal(result.status, "REAL_CHAIN");
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0].confidence, 62.5);
  assert.match(result.edges[0].explanation, /TSMC fabricates/);
  assert.equal(result.nodes.length, 2);
});

test("explicitly surfaces a null causeRecordId as a real exogenous/unknown-upstream case, never silently dropped", async () => {
  const prisma = getPrismaClient();
  const effect = await prisma.worldMemoryRecord.create({
    data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: "NVDA drops on unexplained volume" },
  });
  await prisma.worldMemoryCausalLink.create({
    data: { causeRecordId: null, effectRecordId: effect.id, explanation: "No confirmed cause identified yet.", confidence: 10, methodologyVersion: "x3-v1" },
  });

  const result = await impactGraphService.getImpactGraph("NVDA");
  assert.equal(result.unknownUpstreamCount, 1);
});

test("bounds the graph to maxNodes so a dense future dataset can never return unbounded results", async () => {
  const prisma = getPrismaClient();
  const seed = await prisma.worldMemoryRecord.create({
    data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: "Seed event" },
  });
  for (let i = 0; i < 40; i += 1) {
    const other = await prisma.worldMemoryRecord.create({
      data: { occurredAt: new Date(), symbols: [], sectors: [], headline: `Linked event ${i}` },
    });
    await prisma.worldMemoryCausalLink.create({
      data: { causeRecordId: other.id, effectRecordId: seed.id, explanation: "linked", confidence: 50, methodologyVersion: "x3-v1" },
    });
  }

  const result = await impactGraphService.getImpactGraph("NVDA", { maxNodes: 10 });
  assert.ok(result.nodes.length <= 10);
  assert.equal(result.truncated, true);
});
