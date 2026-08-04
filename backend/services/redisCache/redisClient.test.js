const test = require("node:test");
const assert = require("node:assert/strict");
const env = require("../../config/env");
const redisClient = require("./redisClient");

test.beforeEach(async () => {
  await redisClient._resetForTests();
});

test("getClient: honestly returns null when REDIS_URL is not configured (this environment's real, current state)", async () => {
  const original = env.REDIS_URL;
  env.REDIS_URL = "";
  try {
    const client = await redisClient.getClient();
    assert.equal(client, null);
  } finally {
    env.REDIS_URL = original;
  }
});

test("isAvailable: honestly reports false when REDIS_URL is not configured", async () => {
  const original = env.REDIS_URL;
  env.REDIS_URL = "";
  try {
    assert.equal(await redisClient.isAvailable(), false);
  } finally {
    env.REDIS_URL = original;
  }
});

test("getClient: never throws even when pointed at a real, unreachable address", async () => {
  const original = env.REDIS_URL;
  env.REDIS_URL = "redis://127.0.0.1:1"; // a real, well-known refused port
  try {
    await assert.doesNotReject(() => redisClient.getClient());
    const client = await redisClient.getClient();
    assert.equal(client, null);
  } finally {
    env.REDIS_URL = original;
    await redisClient._resetForTests();
  }
}, { timeout: 10000 });

test("_resetForTests: clears cached state so a subsequent getClient() re-attempts a fresh connection", async () => {
  const original = env.REDIS_URL;
  env.REDIS_URL = "";
  try {
    await redisClient.getClient();
    await redisClient._resetForTests();
    // Should not throw and should still honestly report unavailable.
    assert.equal(await redisClient.isAvailable(), false);
  } finally {
    env.REDIS_URL = original;
  }
});
