require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const optionsAgentService = require("./optionsAgentService");
const optionsFlowProvider = require("../providers/definitions/optionsFlowProvider");
const { FORBIDDEN_GOVERNANCE_KEYS } = require("./optionsSignalGovernance");

test.beforeEach(async () => {
  await truncateAll();
});

test("unavailable provider: getStatus honestly reports not connected when no vendor credential exists", async () => {
  assert.equal(optionsFlowProvider.isConfigured(), false, "test assumes no OPTIONS_FLOW_PROVIDER_API_KEY is set");
  const status = await optionsAgentService.getStatus();
  assert.equal(status.connected, false);
  assert.equal(status.provider, "pending");
  assert.equal(status.message, "Options flow provider is not connected yet.");
});

test("unavailable provider: listSignals returns an honestly empty array with unavailableReason, never a fabricated placeholder row", async () => {
  const result = await optionsAgentService.listSignals();
  assert.equal(result.count, 0);
  assert.deepEqual(result.signals, []);
  assert.equal(result.unavailableReason, "Options flow provider is not connected yet.");
});

test("unavailable provider: getSymbolView honestly reports unavailable rather than a zero-value score", async () => {
  const view = await optionsAgentService.getSymbolView("NVDA", {
    activityProvider: {
      getSymbolMetrics: async () => ({
        asOf: new Date().toISOString(),
        dataAvailable: false,
        unavailableReason: optionsAgentService.NOT_CONNECTED_MESSAGE,
      }),
    },
  });
  assert.equal(view.unavailable, true);
  assert.equal(view.activeSignalCount, 0);
  assert.equal(view.highestAnomalyScore, null);
  assert.equal(view.reason, "Options flow provider is not connected yet.");
});

test("ingestAndDetect rejects malformed raw records safely and still processes the valid ones in the same batch", async () => {
  const rawRecords = [
    { symbol: "NVDA", expiry: "2026-08-21", strike: 150, optionType: "CALL", exchange: "CBOE", tradeTimestamp: "2026-07-25T14:30:00.000Z", price: 12.5, size: 500 },
    { symbol: "", expiry: "not-a-date", strike: -1, optionType: "X", exchange: "", tradeTimestamp: "bad", price: -1, size: -1 },
  ];
  const result = await optionsAgentService.ingestAndDetect(rawRecords);
  assert.equal(result.printsRejected, 1);
  assert.equal(result.printsIngested, 1);
});

test("ingestAndDetect drops in-batch duplicate prints before persisting", async () => {
  const print = { symbol: "NVDA", expiry: "2026-08-21", strike: 150, optionType: "CALL", exchange: "CBOE", tradeTimestamp: "2026-07-25T14:30:00.000Z", price: 12.5, size: 500 };
  const result = await optionsAgentService.ingestAndDetect([print, { ...print }]);
  assert.equal(result.printsIngested, 1);
  assert.equal(result.duplicatesDroppedInBatch, 1);
});

test("ingestAndDetect produces a sweep signal with no forbidden governance fields and the required disclosure fields present", async () => {
  const baseTimestamp = new Date("2026-07-25T14:30:00.000Z").getTime();
  const rawRecords = [0, 1, 2].map((index) => ({
    symbol: "NVDA",
    expiry: "2026-08-21",
    strike: 150,
    optionType: "CALL",
    exchange: ["CBOE", "ISE", "PHLX"][index],
    tradeTimestamp: new Date(baseTimestamp + index * 500).toISOString(),
    price: 12.6,
    size: 400,
    bidAtTrade: 12.3,
    askAtTrade: 12.55,
  }));

  const result = await optionsAgentService.ingestAndDetect(rawRecords);
  assert.equal(result.signals.length, 1);
  const [signal] = result.signals;

  assert.equal(signal.signalType, "SWEEP");
  assert.equal(signal.label, "Signal — not a recommendation");
  assert.ok(Number.isFinite(signal.anomalyScore));
  assert.equal(signal.oiConfirmationStatus, "PENDING");
  assert.equal(typeof signal.explanation, "string");
  assert.ok(signal.explanation.length > 0);
  assert.equal(signal.methodologyVersion, "options-agent-v1");

  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    assert.equal(key in signal, false, `signal must never carry a forbidden governance key: ${key}`);
  }
});

test("ingestAndDetect honestly produces no signal when nothing in the batch is anomalous", async () => {
  const rawRecords = [{ symbol: "NVDA", expiry: "2026-08-21", strike: 150, optionType: "CALL", exchange: "CBOE", tradeTimestamp: "2026-07-25T14:30:00.000Z", price: 12.5, size: 5 }];
  const result = await optionsAgentService.ingestAndDetect(rawRecords);
  assert.equal(result.signals.length, 0);
});

test("stale data: ingestAndDetect's freshness reflects the real most-recent print timestamp against now", async () => {
  const now = new Date("2026-07-25T16:00:00.000Z");
  const rawRecords = [{ symbol: "NVDA", expiry: "2026-08-21", strike: 150, optionType: "CALL", exchange: "CBOE", tradeTimestamp: "2026-07-25T14:00:00.000Z", price: 12.5, size: 5 }];
  const result = await optionsAgentService.ingestAndDetect(rawRecords, { now });
  assert.equal(result.freshness.isStale, true);
});
