require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { truncateAll } = require("../test/dbHelpers");
const authService = require("./authService");

test.beforeEach(async () => {
  await truncateAll();
});

function uniqueEmail() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
}

test("register: creates a real account and issues a real token", async () => {
  const email = uniqueEmail();
  const result = await authService.register(email, "supersecret123");
  assert.equal(result.user.email, email);
  assert.ok(result.token);
  assert.ok(result.expiresAt instanceof Date || typeof result.expiresAt === "string");
});

test("register: rejects an invalid email, never creating a real account", async () => {
  await assert.rejects(() => authService.register("not-an-email", "supersecret123"), /INVALID_EMAIL|valid email/i);
});

test("register: rejects a real password shorter than the disclosed minimum", async () => {
  await assert.rejects(() => authService.register(uniqueEmail(), "short"), /INVALID_PASSWORD|Password must/i);
});

test("register: rejects a duplicate real email, never silently overwriting the existing account", async () => {
  const email = uniqueEmail();
  await authService.register(email, "supersecret123");
  await assert.rejects(() => authService.register(email, "anotherpassword"), /EMAIL_TAKEN|already exists/i);
});

test("register: never stores the real raw password — only a real bcrypt hash", async () => {
  const email = uniqueEmail();
  const password = "supersecret123";
  await authService.register(email, password);
  const userRepository = require("./userRepository");
  const user = await userRepository.findByEmail(email);
  assert.notEqual(user.passwordHash, password);
  assert.ok(user.passwordHash.startsWith("$2"), "must be a real bcrypt hash");
});

test("login: succeeds with the real, correct password and issues a real new token", async () => {
  const email = uniqueEmail();
  await authService.register(email, "supersecret123");
  const result = await authService.login(email, "supersecret123");
  assert.equal(result.user.email, email);
  assert.ok(result.token);
});

test("login: rejects a real wrong password with the same real error as an unknown email (no account enumeration)", async () => {
  const email = uniqueEmail();
  await authService.register(email, "supersecret123");

  let wrongPasswordError = null;
  try {
    await authService.login(email, "wrongpassword");
  } catch (error) {
    wrongPasswordError = error;
  }

  let unknownEmailError = null;
  try {
    await authService.login(uniqueEmail(), "wrongpassword");
  } catch (error) {
    unknownEmailError = error;
  }

  assert.ok(wrongPasswordError && unknownEmailError);
  assert.equal(wrongPasswordError.message, unknownEmailError.message);
  assert.equal(wrongPasswordError.statusCode, unknownEmailError.statusCode);
});

test("verifyToken: accepts a real, freshly-issued token", async () => {
  const email = uniqueEmail();
  const { token, user } = await authService.register(email, "supersecret123");
  const result = await authService.verifyToken(token);
  assert.equal(result.userId, user.id);
});

test("verifyToken: rejects a real malformed/garbage token", async () => {
  await assert.rejects(() => authService.verifyToken("not-a-real-jwt"), /INVALID_TOKEN|Invalid or expired/i);
});

test("verifyToken: rejects a missing token", async () => {
  await assert.rejects(() => authService.verifyToken(null), /MISSING_TOKEN|Authentication required/i);
});

test("logout: revokes the real session — a subsequent verifyToken call for the same real token fails", async () => {
  const { token } = await authService.register(uniqueEmail(), "supersecret123");
  await authService.verifyToken(token); // works before logout
  await authService.logout(token);
  await assert.rejects(() => authService.verifyToken(token), /INVALID_TOKEN|Invalid or expired/i);
});

test("logout: never affects a different real user's own real session", async () => {
  const first = await authService.register(uniqueEmail(), "supersecret123");
  const second = await authService.register(uniqueEmail(), "supersecret123");
  await authService.logout(first.token);
  const result = await authService.verifyToken(second.token);
  assert.equal(result.userId, second.user.id);
});
