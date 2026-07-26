require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const systemHealthService = require("./systemHealthService");

test("getSystemHealth reports all nine real modules, each with one of the four real statuses", async () => {
  const result = await systemHealthService.getSystemHealth();
  const moduleNames = ["backend", "identity", "marketData", "news", "ai", "chart", "notifications", "decisionCenter", "impactGraph"];
  for (const name of moduleNames) {
    assert.ok(result.modules[name], `missing module: ${name}`);
    assert.ok(Object.values(systemHealthService.STATUS).includes(result.modules[name].status), `${name} has an invalid status`);
    assert.equal(typeof result.modules[name].latencyMs, "number");
  }
});

test("backend and identity are real HEALTHY checks against the real test database", async () => {
  const result = await systemHealthService.getSystemHealth();
  assert.equal(result.modules.backend.status, "HEALTHY");
  assert.equal(result.modules.identity.status, "HEALTHY");
});

test("no module detail ever contains a raw stack trace", async () => {
  const result = await systemHealthService.getSystemHealth();
  for (const module of Object.values(result.modules)) {
    assert.equal(module.detail.includes("at Object."), false);
    assert.equal(module.detail.includes(".js:"), false);
  }
});

test("overall status is HEALTHY only when every module is HEALTHY", async () => {
  const result = await systemHealthService.getSystemHealth();
  const allHealthy = Object.values(result.modules).every((module) => module.status === "HEALTHY");
  assert.equal(result.overall === "HEALTHY", allHealthy);
});
