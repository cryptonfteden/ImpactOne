require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseEcbDecisionFeed, toEcbEvent } = require("./ecbProvider");

test("ECB provider keeps monetary-policy decisions from the official press feed", () => {
  const xml = '<rss><channel><item><title>Monetary policy decisions</title><link>https://example.com/ecb</link><pubDate>Thu, 23 Jul 2026 12:15:00 +0200</pubDate></item><item><title>Banking data</title><link>https://example.com/bank</link><pubDate>Fri, 24 Jul 2026 12:15:00 +0200</pubDate></item></channel></rss>';
  const decisions = parseEcbDecisionFeed(xml);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].sourceUrl, "https://example.com/ecb");
  assert.equal(toEcbEvent(decisions[0]).eventType, "ecb-monetary-policy-decision");
});
