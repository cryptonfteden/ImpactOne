const assert = require("node:assert/strict");
const { auditChartBars } = require("./chartDataIntegrity");
function minuteBars(count, start = "2026-08-13T14:00:00Z", stepMinutes = 15) { return Array.from({ length: count }, (_, i) => ({ date: new Date(new Date(start).getTime() + i * stepMinutes * 60000).toISOString(), open: 10 + i / 100, high: 10.1 + i / 100, low: 9.9 + i / 100, close: 10.05 + i / 100, volume: 1000 + i })); }
assert.equal(auditChartBars(minuteBars(15), "15m", { regularUsSession: true }).valid, true);
const duplicate = minuteBars(15); duplicate.push({ ...duplicate[4] });
assert.equal(auditChartBars(duplicate, "15m", { regularUsSession: true }).invalidRows, 1);
const broken = minuteBars(15); broken[8].date = new Date(new Date(broken[7].date).getTime() + 60 * 60000).toISOString();
assert.equal(auditChartBars(broken, "15m", { regularUsSession: true }).valid, false);
const invalidOhlc = minuteBars(15); invalidOhlc[3].high = invalidOhlc[3].low - 1;
assert.equal(auditChartBars(invalidOhlc, "15m").valid, false);
console.log("chart data integrity tests passed");
