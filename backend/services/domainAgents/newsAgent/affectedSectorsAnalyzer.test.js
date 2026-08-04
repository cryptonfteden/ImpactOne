const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeAffectedSectors } = require("./affectedSectorsAnalyzer");

test("returns the real industry when a real profile and sector/macro coverage exist", () => {
  const profile = { dataAvailable: true, industry: "Technology" };
  const articles = [{ eventType: "COMPANY" }, { eventType: "SECTOR" }];
  assert.deepEqual(analyzeAffectedSectors(profile, articles), ["Technology"]);
});

test("honestly returns empty when the real profile is unavailable", () => {
  const profile = { dataAvailable: false, industry: null };
  const articles = [{ eventType: "SECTOR" }];
  assert.deepEqual(analyzeAffectedSectors(profile, articles), []);
});

test("honestly returns empty when coverage is purely company-specific", () => {
  const profile = { dataAvailable: true, industry: "Technology" };
  const articles = [{ eventType: "COMPANY" }];
  assert.deepEqual(analyzeAffectedSectors(profile, articles), []);
});
