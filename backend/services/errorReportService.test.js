require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const errorReportService = require("./errorReportService");

test.beforeEach(async () => {
  await truncateAll();
});

test("reportError rejects an invalid source", async () => {
  await assert.rejects(() => errorReportService.reportError({ source: "mobile", message: "boom" }), /source must be one of/);
});

test("reportError rejects an empty message", async () => {
  await assert.rejects(() => errorReportService.reportError({ source: "frontend", message: "" }), /real error message is required/);
});

test("reportError persists a real, structured row with correlation id", async () => {
  const created = await errorReportService.reportError({
    source: "frontend",
    message: "TypeError: cannot read x",
    stack: "at foo.js:1:1",
    screen: "Portfolio",
    action: "placing an order",
    apiInvolved: "POST /api/v2/portfolio/orders",
    correlationId: "corr-123",
    betaUserId: "beta-1",
  });
  assert.equal(created.source, "frontend");
  assert.equal(created.screen, "Portfolio");
  assert.equal(created.correlationId, "corr-123");
});

test("reportError truncates an excessively long stack trace rather than rejecting it", async () => {
  const hugeStack = "x".repeat(10000);
  const created = await errorReportService.reportError({ source: "backend", message: "real crash", stack: hugeStack });
  assert.ok(created.stack.length <= 8000);
});

test("listErrorReports returns real reports, newest first", async () => {
  await errorReportService.reportError({ source: "frontend", message: "first" });
  await errorReportService.reportError({ source: "backend", message: "second" });
  const reports = await errorReportService.listErrorReports();
  assert.equal(reports.length, 2);
  assert.equal(reports[0].message, "second");
});
