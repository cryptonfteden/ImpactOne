const test = require("node:test");
const assert = require("node:assert/strict");
const { createBroadMarketPeerGroupProvider, BROAD_MARKET_REFERENCE_MULTIPLES, DEFAULT_WACC_PROXY_PERCENT } = require("./peerGroupProvider");

test("getSectorReference honestly discloses source:'broad-market-reference' and peerGroupSize:0 — no real peer group is fabricated", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference("Software");
  assert.equal(reference.source, "broad-market-reference");
  assert.equal(reference.peerGroupSize, 0);
  assert.equal(reference.industry, "Software");
});

test("the returned multiples are the exact disclosed, hand-set constants — not sector-specific", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference("Software");
  assert.deepEqual(reference.multiples, BROAD_MARKET_REFERENCE_MULTIPLES);
});

test("a null/missing industry is handled honestly, never throwing", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference(null);
  assert.equal(reference.industry, null);
});

test("the WACC proxy is the disclosed default constant", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference("Software");
  assert.equal(reference.wacc, DEFAULT_WACC_PROXY_PERCENT);
});

test("every multiple field required by impliedPriceCalculator.js is present", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference("Software");
  for (const key of ["pe", "forwardPe", "peg", "evEbitda", "ps", "pb", "fcfYield"]) {
    assert.ok(Number.isFinite(reference.multiples[key]), `expected a real, finite ${key} reference multiple`);
  }
});
