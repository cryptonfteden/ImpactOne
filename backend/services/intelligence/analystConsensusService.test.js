const test = require("node:test");
const assert = require("node:assert/strict");

const analystConsensusService = require("./analystConsensusService");

test("normalizeRating maps each provider's own vocabulary onto the canonical 1-5 scale", () => {
  assert.equal(analystConsensusService.normalizeRating("finviz", "Strong Buy").scaleValue, 5);
  assert.equal(analystConsensusService.normalizeRating("zacks", "Hold").scaleValue, 3);
  assert.equal(analystConsensusService.normalizeRating("tipranks", "Moderate Buy").scaleValue, 4);
});

test("normalizeRating honestly reports an unrecognized rating rather than guessing", () => {
  const result = analystConsensusService.normalizeRating("finviz", "Some New Rating Zacks Never Used");
  assert.equal(result.recognized, false);
  assert.equal(result.scaleValue, null);
});

test("normalizeRating computes a real target revision direction from real prior/current targets", () => {
  const raised = analystConsensusService.normalizeRating("finviz", "Buy", { priceTarget: 250, priorPriceTarget: 230 });
  assert.equal(raised.targetRevision.direction, "RAISED");
  assert.equal(raised.targetRevision.amount, 20);
});

test("crossCheckRatings detects real disagreement for the mission's own worked example (Finviz Strong Buy + Zacks Hold + TipRanks Moderate Buy)", () => {
  const ratings = [
    analystConsensusService.normalizeRating("finviz", "Strong Buy"),
    analystConsensusService.normalizeRating("zacks", "Hold"),
    analystConsensusService.normalizeRating("tipranks", "Moderate Buy"),
  ];
  const result = analystConsensusService.crossCheckRatings(ratings);
  assert.equal(result.disagreement, true);
  assert.equal(result.spread, 2); // Strong Buy (5) - Hold (3)
  assert.equal(result.isRecommendation, false);
});

test("crossCheckRatings never averages disagreeing ratings into a false consensus number", () => {
  const ratings = [analystConsensusService.normalizeRating("finviz", "Strong Buy"), analystConsensusService.normalizeRating("zacks", "Hold")];
  const result = analystConsensusService.crossCheckRatings(ratings);
  assert.equal("consensusScore" in result, false);
  assert.equal("averageRating" in result, false);
});

test("crossCheckRatings reports agreement (no disagreement) when providers are genuinely aligned", () => {
  const ratings = [analystConsensusService.normalizeRating("finviz", "Buy"), analystConsensusService.normalizeRating("zacks", "Buy"), analystConsensusService.normalizeRating("tipranks", "Strong Buy")];
  const result = analystConsensusService.crossCheckRatings(ratings);
  assert.equal(result.disagreement, false);
  assert.equal(result.spread, 1);
});

test("crossCheckRatings is honest about insufficient data with fewer than 2 recognized ratings", () => {
  const result = analystConsensusService.crossCheckRatings([analystConsensusService.normalizeRating("finviz", "Buy")]);
  assert.equal(result.hasEnoughData, true);
  assert.equal(result.disagreement, false);
  assert.equal(result.spread, null);
});

test("getFixtureConsensus is clearly labeled FIXTURE and reproduces the real disagreement result", () => {
  const result = analystConsensusService.getFixtureConsensus("AAPL");
  assert.equal(result.status, "FIXTURE");
  assert.equal(result.disagreement, true);
});
