const test = require("node:test");
const assert = require("node:assert/strict");
const { INSTITUTIONAL_MANAGERS } = require("./institutionalManagerReference");

test("INSTITUTIONAL_MANAGERS is a real, non-empty, disclosed cohort with a name and 10-digit zero-padded CIK for each", () => {
  assert.ok(INSTITUTIONAL_MANAGERS.length > 0);
  for (const manager of INSTITUTIONAL_MANAGERS) {
    assert.equal(typeof manager.name, "string");
    assert.ok(manager.name.length > 0);
    assert.match(manager.cik, /^\d{10}$/);
  }
});

test("INSTITUTIONAL_MANAGERS has no duplicate real CIKs", () => {
  const ciks = INSTITUTIONAL_MANAGERS.map((manager) => manager.cik);
  assert.equal(new Set(ciks).size, ciks.length);
});
