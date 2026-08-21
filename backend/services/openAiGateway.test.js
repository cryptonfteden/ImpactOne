const test = require("node:test");
const assert = require("node:assert/strict");
const env = require("../config/env");
const { requestChatCompletion, getOpenAiGatewayStatus, resetOpenAiGateway } = require("./openAiGateway");

test("quota 429 opens a circuit so subsequent calls fail without another provider request", async () => {
  const original = env.OPENAI_API_KEY;
  env.OPENAI_API_KEY = "test-key";
  resetOpenAiGateway();
  let calls = 0;
  const httpPost = async () => {
    calls += 1;
    const error = new Error("quota");
    error.response = { status: 429, data: { error: { code: "insufficient_quota", message: "quota exceeded" } }, headers: {} };
    throw error;
  };
  try {
    await assert.rejects(() => requestChatCompletion({}, { httpPost }), { code: "OPENAI_QUOTA_EXHAUSTED" });
    await assert.rejects(() => requestChatCompletion({}, { httpPost }), { code: "OPENAI_CIRCUIT_OPEN" });
    assert.equal(calls, 1);
    assert.equal(getOpenAiGatewayStatus().circuitOpen, true);
  } finally {
    env.OPENAI_API_KEY = original;
    resetOpenAiGateway();
  }
});
