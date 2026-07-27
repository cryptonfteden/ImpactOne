const test = require("node:test");
const assert = require("node:assert/strict");

const agentOrchestrator = require("./agentOrchestrator");

function makeAgent({ id, priority = 5, category = "TEST", execute, confidence, health, delayMs = 0 }) {
  return {
    metadata: { id, name: `${id} agent`, category, priority },
    async execute(symbol) {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return execute(symbol);
    },
    confidence,
    health: health || (async () => ({ status: "healthy", reason: null })),
  };
}

test.beforeEach(() => {
  agentOrchestrator.clearRegistry();
});

test("registerAgent rejects a malformed agent and rejects a duplicate id", () => {
  assert.throws(() => agentOrchestrator.registerAgent({}), /Invalid agent/);
  const agent = makeAgent({ id: "dup", execute: () => ({}), confidence: () => 1 });
  agentOrchestrator.registerAgent(agent);
  assert.throws(() => agentOrchestrator.registerAgent(agent), /already registered/);
});

test("run() executes every registered agent in parallel and returns one unified report", async () => {
  const order = [];
  agentOrchestrator.registerAgent(
    makeAgent({
      id: "slow",
      delayMs: 30,
      execute: (symbol) => {
        order.push("slow-start");
        return { summary: `slow analyzed ${symbol}`, direction: "BULLISH", evidence: [{ observedFact: "slow fact" }] };
      },
      confidence: () => 60,
    })
  );
  agentOrchestrator.registerAgent(
    makeAgent({
      id: "fast",
      execute: (symbol) => {
        order.push("fast-start");
        return { summary: `fast analyzed ${symbol}`, direction: "BULLISH", evidence: [{ observedFact: "fast fact" }] };
      },
      confidence: () => 90,
    })
  );

  const report = await agentOrchestrator.run("nvda");
  assert.equal(report.symbol, "NVDA", "symbol is normalized to uppercase");
  assert.equal(report.agents.length, 2);
  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.fulfilled, 2);
  // Both agents' execute() must have started before either resolved — real parallelism, not sequential.
  assert.deepEqual(order.sort(), ["fast-start", "slow-start"]);
});

test("an unhealthy agent is skipped entirely — health() is checked but execute() is never called", async () => {
  let executeCalled = false;
  agentOrchestrator.registerAgent(
    makeAgent({
      id: "sick",
      execute: () => {
        executeCalled = true;
        return { summary: "should never run" };
      },
      confidence: () => 100,
      health: async () => ({ status: "unavailable", reason: "provider not configured" }),
    })
  );

  const report = await agentOrchestrator.run("NVDA");
  assert.equal(executeCalled, false, "execute() must never be called for an unavailable agent");
  assert.equal(report.agents[0].status, "unavailable");
  assert.equal(report.agents[0].confidence, 0);
  assert.equal(report.summary.unavailable, 1);
});

test("a degraded (not unavailable) agent still executes", async () => {
  agentOrchestrator.registerAgent(
    makeAgent({
      id: "degraded",
      execute: () => ({ summary: "still ran", direction: null, evidence: [] }),
      confidence: () => 40,
      health: async () => ({ status: "degraded", reason: "partial provider outage" }),
    })
  );

  const report = await agentOrchestrator.run("NVDA");
  assert.equal(report.agents[0].status, "fulfilled");
  assert.equal(report.agents[0].confidence, 40);
});

test("an agent that exceeds its timeout is reported as 'timeout', never left hanging", async () => {
  agentOrchestrator.registerAgent(
    makeAgent({ id: "hangs", delayMs: 200, execute: () => ({ summary: "too slow" }), confidence: () => 50 })
  );

  const report = await agentOrchestrator.run("NVDA", { timeoutMs: 20, maxRetries: 0 });
  assert.equal(report.agents[0].status, "timeout");
  assert.equal(report.agents[0].confidence, 0);
  assert.equal(report.summary.failed, 1);
});

test("retry policy: a failing agent is retried up to maxRetries and succeeds on a later attempt", async () => {
  let calls = 0;
  agentOrchestrator.registerAgent(
    makeAgent({
      id: "flaky",
      execute: () => {
        calls += 1;
        if (calls < 3) throw new Error("transient failure");
        return { summary: "succeeded on attempt 3", direction: null, evidence: [] };
      },
      confidence: () => 70,
    })
  );

  const report = await agentOrchestrator.run("NVDA", { maxRetries: 2 });
  assert.equal(calls, 3);
  assert.equal(report.agents[0].status, "fulfilled");
  assert.equal(report.agents[0].attempts, 3);
});

test("retry policy: an agent that always fails is reported as 'error' after exhausting retries, never throws out of run()", async () => {
  agentOrchestrator.registerAgent(
    makeAgent({
      id: "always-fails",
      execute: () => {
        throw new Error("permanent failure");
      },
      confidence: () => 70,
    })
  );

  const report = await agentOrchestrator.run("NVDA", { maxRetries: 2 });
  assert.equal(report.agents[0].status, "error");
  assert.equal(report.agents[0].attempts, 3, "1 initial attempt + 2 retries");
  assert.equal(report.agents[0].error, "permanent failure");
});

test("agents are ranked by confidence descending, with priority as the tie-break", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "low-conf", priority: 9, execute: () => ({}), confidence: () => 30 }));
  agentOrchestrator.registerAgent(makeAgent({ id: "high-conf", priority: 1, execute: () => ({}), confidence: () => 90 }));
  agentOrchestrator.registerAgent(makeAgent({ id: "tie-high-priority", priority: 8, execute: () => ({}), confidence: () => 50 }));
  agentOrchestrator.registerAgent(makeAgent({ id: "tie-low-priority", priority: 2, execute: () => ({}), confidence: () => 50 }));

  const report = await agentOrchestrator.run("NVDA");
  assert.deepEqual(
    report.agents.map((a) => a.agentId),
    ["high-conf", "tie-high-priority", "tie-low-priority", "low-conf"]
  );
});

test("computeOverallConfidence is a priority-weighted average of successful agents only, never including unavailable/failed ones", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "a", priority: 1, execute: () => ({}), confidence: () => 100 }));
  agentOrchestrator.registerAgent(makeAgent({ id: "b", priority: 3, execute: () => ({}), confidence: () => 0 }));
  agentOrchestrator.registerAgent(
    makeAgent({ id: "c", priority: 10, execute: () => ({}), confidence: () => 999, health: async () => ({ status: "unavailable", reason: "x" }) })
  );

  const report = await agentOrchestrator.run("NVDA");
  // Weighted: (100*1 + 0*3) / (1+3) = 25. Agent "c" is unavailable and must not enter the calculation at all.
  assert.equal(report.overallConfidence, 25);
});

test("computeOverallConfidence is honestly 0 when every agent is unavailable or failed", async () => {
  agentOrchestrator.registerAgent(
    makeAgent({ id: "a", execute: () => ({}), confidence: () => 100, health: async () => ({ status: "unavailable", reason: "x" }) })
  );
  const report = await agentOrchestrator.run("NVDA");
  assert.equal(report.overallConfidence, 0);
});

test("conflict detection: two agents reporting different real directions are flagged, agreeing agents are not", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "bull", execute: () => ({ direction: "BULLISH" }), confidence: () => 50 }));
  agentOrchestrator.registerAgent(makeAgent({ id: "bear", execute: () => ({ direction: "BEARISH" }), confidence: () => 50 }));
  agentOrchestrator.registerAgent(makeAgent({ id: "bull-2", execute: () => ({ direction: "BULLISH" }), confidence: () => 50 }));
  agentOrchestrator.registerAgent(makeAgent({ id: "no-opinion", execute: () => ({ direction: null }), confidence: () => 50 }));

  const report = await agentOrchestrator.run("NVDA");
  assert.equal(report.conflicts.length, 2, "bull-vs-bear and bull-2-vs-bear, but never involving the null-direction agent");
  const involvedPairs = report.conflicts.map((c) => [c.agentA, c.agentB].sort().join("-"));
  assert.ok(involvedPairs.includes(["bear", "bull"].sort().join("-")));
  assert.ok(involvedPairs.includes(["bear", "bull-2"].sort().join("-")));
  assert.ok(!involvedPairs.some((pair) => pair.includes("no-opinion")));
});

test("evidence merging: every agent's real evidence is flattened into one array, each entry attributed to its real agent", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "a", execute: () => ({ evidence: [{ observedFact: "fact A1" }, { observedFact: "fact A2" }] }), confidence: () => 50 }));
  agentOrchestrator.registerAgent(makeAgent({ id: "b", execute: () => ({ evidence: [{ observedFact: "fact B1" }] }), confidence: () => 50 }));

  const report = await agentOrchestrator.run("NVDA");
  assert.equal(report.evidence.length, 3);
  assert.ok(report.evidence.every((entry) => entry.agentId));
  assert.deepEqual(
    report.evidence.map((e) => e.observedFact).sort(),
    ["fact A1", "fact A2", "fact B1"]
  );
});

test("run() rejects a missing/invalid symbol with a 400-style error", async () => {
  await assert.rejects(() => agentOrchestrator.run(""), (error) => error.statusCode === 400);
  await assert.rejects(() => agentOrchestrator.run(null), (error) => error.statusCode === 400);
});

test("run() accepts an explicit agent subset instead of the full registry", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "included", execute: () => ({}), confidence: () => 50 }));
  const excluded = makeAgent({ id: "excluded", execute: () => ({}), confidence: () => 50 });
  agentOrchestrator.registerAgent(excluded);

  const report = await agentOrchestrator.run("NVDA", { agents: [agentOrchestrator.getRegisteredAgents().find((a) => a.metadata.id === "included")] });
  assert.equal(report.agents.length, 1);
  assert.equal(report.agents[0].agentId, "included");
});

test("the orchestrator never inspects or interprets an agent's summary/raw content — only opaque status/confidence/direction/evidence", () => {
  const orchestratorSource = require("node:fs").readFileSync(require.resolve("./agentOrchestrator.js"), "utf8");
  assert.ok(!/\.summary\b/.test(orchestratorSource), "the orchestrator must never read an agent's summary field");
  assert.ok(!/\.raw\b/.test(orchestratorSource), "the orchestrator must never read an agent's raw field");
});
