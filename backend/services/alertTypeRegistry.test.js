require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const alertTypeRegistry = require("./alertTypeRegistry");

test("PRICE_ABOVE and PRICE_BELOW are real, implemented alert types", () => {
  const above = alertTypeRegistry.requireImplemented("PRICE_ABOVE");
  const below = alertTypeRegistry.requireImplemented("PRICE_BELOW");
  assert.equal(typeof above.evaluate, "function");
  assert.equal(typeof below.evaluate, "function");
  assert.equal(above.evaluate({ alert: { targetPrice: 100 }, currentPrice: 101 }), true);
  assert.equal(below.evaluate({ alert: { targetPrice: 100 }, currentPrice: 99 }), true);
});

test("every mission-named future alert type is registered but explicitly not implemented", () => {
  const futureTypes = [
    "AI_RECOMMENDATION_CHANGED",
    "OPPORTUNITY_SCORE_CHANGED",
    "LARGE_SHORT_INTEREST_CHANGE",
    "LARGE_LONG_INTEREST_CHANGE",
    "EARNINGS",
    "NEWS_IMPACT",
  ];
  for (const typeName of futureTypes) {
    const type = alertTypeRegistry.getAlertType(typeName);
    assert.ok(type, `${typeName} should be registered`);
    assert.equal(type.implemented, false);
    assert.ok(type.dataDependency, `${typeName} should document its real data dependency`);
  }
});

test("requireImplemented throws a real 501 for an architecture-only type — never silently 'succeeds'", () => {
  assert.throws(
    () => alertTypeRegistry.requireImplemented("EARNINGS"),
    (error) => error.statusCode === 501
  );
});

test("requireImplemented throws a real 400 for an unknown type", () => {
  assert.throws(
    () => alertTypeRegistry.requireImplemented("NOT_A_REAL_TYPE"),
    (error) => error.statusCode === 400
  );
});

test("listAlertTypes returns every registered type with its real implementation status", () => {
  const types = alertTypeRegistry.listAlertTypes();
  const implementedCount = types.filter((type) => type.implemented).length;
  const unimplementedCount = types.filter((type) => !type.implemented).length;
  assert.equal(implementedCount, 2); // PRICE_ABOVE, PRICE_BELOW only
  assert.equal(unimplementedCount, 6); // exactly the 6 the mission named
});
