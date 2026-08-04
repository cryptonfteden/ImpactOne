const test = require("node:test");
const assert = require("node:assert/strict");

const { withRetry } = require("./retryPolicy");

test("withRetry returns the result on first success without retrying", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetry retries a failing function up to maxAttempts and then succeeds", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("transient");
      return "recovered";
    },
    { maxAttempts: 3, baseDelayMs: 1 }
  );
  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("withRetry throws the last error once maxAttempts is exhausted", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1;
          throw new Error(`fail-${calls}`);
        },
        { maxAttempts: 2, baseDelayMs: 1 }
      ),
    /fail-2/
  );
  assert.equal(calls, 2);
});
