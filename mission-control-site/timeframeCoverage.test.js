const assert = require("node:assert/strict");
const { assessTimeframeCoverage } = require("./timeframeCoverage");
function bars(count, start, stepDays) { return Array.from({ length: count }, (_, index) => ({ date: new Date(new Date(start).getTime() + index * stepDays * 86400000).toISOString() })); }
assert.equal(assessTimeframeCoverage(bars(1, "2026-01-01", 365), "1y").complete, false);
assert.equal(assessTimeframeCoverage(bars(10, "2017-01-01", 365), "1y").complete, true);
assert.equal(assessTimeframeCoverage(bars(7, "2024-01-01", 91), "3mo").complete, false);
assert.equal(assessTimeframeCoverage(bars(24, "2024-01-01", 30), "1mo").complete, true);
assert.equal(assessTimeframeCoverage(bars(48, "2026-07-01", 4 / 24), "4h").complete, true);
assert.equal(assessTimeframeCoverage(bars(19, "2026-08-13", 15 / 1440), "15m").complete, false);
console.log("timeframe coverage tests passed");
