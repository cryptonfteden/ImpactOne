const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreText, tokenize } = require("./sentimentLexicon");

test("tokenize lowercases and extracts real word tokens only", () => {
  assert.deepEqual(tokenize("Beats Expectations!"), ["beats", "expectations"]);
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize(null), []);
});

test("scoreText counts real positive and negative keyword hits", () => {
  const result = scoreText("Company beats expectations and surges to a record high");
  assert.ok(result.positiveHits >= 3);
  assert.equal(result.negativeHits, 0);
  assert.ok(result.score > 0);
});

test("scoreText counts real negative keyword hits", () => {
  const result = scoreText("Stock plunges after lawsuit and fraud investigation");
  assert.ok(result.negativeHits >= 3);
  assert.equal(result.positiveHits, 0);
  assert.ok(result.score < 0);
});

test("scoreText returns a real 0 score for empty or neutral text, never a fabricated lean", () => {
  assert.deepEqual(scoreText(""), { positiveHits: 0, negativeHits: 0, score: 0 });
  assert.deepEqual(scoreText(null), { positiveHits: 0, negativeHits: 0, score: 0 });
  const neutral = scoreText("The company held its annual meeting on Tuesday");
  assert.equal(neutral.positiveHits, 0);
  assert.equal(neutral.negativeHits, 0);
  assert.equal(neutral.score, 0);
});

test("scoreText score is bounded in [-1, 1]", () => {
  const allPositive = scoreText("beat beats surge soar rally growth record strong");
  assert.ok(allPositive.score <= 1 && allPositive.score >= -1);
});
