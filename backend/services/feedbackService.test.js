require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const feedbackService = require("./feedbackService");

test.beforeEach(async () => {
  await truncateAll();
});

test("submitFeedback rejects an invalid type", async () => {
  await assert.rejects(() => feedbackService.submitFeedback({ type: "COMPLAINT", message: "real text" }), /type must be one of/);
});

test("submitFeedback rejects an empty message", async () => {
  await assert.rejects(() => feedbackService.submitFeedback({ type: "BUG", message: "   " }), /real feedback message is required/);
});

test("submitFeedback persists a real row with real automatic context", async () => {
  const created = await feedbackService.submitFeedback({
    type: "SUGGESTION", message: "Add dark mode toggle", screen: "Settings", browser: "Chrome/120", appVersion: "1.0.0", betaUserId: "beta-1",
  });
  assert.equal(created.type, "SUGGESTION");
  assert.equal(created.screen, "Settings");
  assert.equal(created.browser, "Chrome/120");
  assert.equal(created.betaUserId, "beta-1");
});

test("listFeedback returns real submitted items, newest first", async () => {
  await feedbackService.submitFeedback({ type: "BUG", message: "first" });
  await feedbackService.submitFeedback({ type: "PRAISE", message: "second" });
  const { feedback } = { feedback: await feedbackService.listFeedback() };
  assert.equal(feedback.length, 2);
  assert.equal(feedback[0].message, "second");
});

test("all four required feedback types are accepted", async () => {
  for (const type of feedbackService.VALID_TYPES) {
    await feedbackService.submitFeedback({ type, message: `real ${type} message` });
  }
  const feedback = await feedbackService.listFeedback();
  assert.equal(feedback.length, 4);
});
