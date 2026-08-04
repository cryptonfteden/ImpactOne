const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEnvironment, validateEnvironmentOrExit, INSECURE_JWT_DEFAULT } = require("./startupValidation");

function baseEnv(overrides = {}) {
  return {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    PORT: "5000",
    BILLING_PROVIDER: "manual",
    JWT_SECRET: "a-real-secret",
    ...overrides,
  };
}

test("validateEnvironment: a real, complete dev config is honestly valid with no errors", () => {
  const result = validateEnvironment(baseEnv());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateEnvironment: a real dev config with no JWT_SECRET is valid but carries an honest warning", () => {
  const env = baseEnv({ JWT_SECRET: undefined });
  const result = validateEnvironment(env);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((w) => w.includes("JWT_SECRET")));
});

test("validateEnvironment: missing DATABASE_URL is always a real, fatal error", () => {
  const result = validateEnvironment(baseEnv({ DATABASE_URL: "" }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("DATABASE_URL")));
});

test("validateEnvironment: a non-numeric PORT is a real, fatal error", () => {
  const result = validateEnvironment(baseEnv({ PORT: "not-a-port" }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("PORT")));
});

test("validateEnvironment: BILLING_PROVIDER=stripe without real Stripe keys is a fatal error", () => {
  const result = validateEnvironment(baseEnv({ BILLING_PROVIDER: "stripe" }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("STRIPE_SECRET_KEY")));
  assert.ok(result.errors.some((e) => e.includes("STRIPE_WEBHOOK_SECRET")));
});

test("validateEnvironment: BILLING_PROVIDER=stripe with real keys present has no billing-related error", () => {
  const result = validateEnvironment(baseEnv({ BILLING_PROVIDER: "stripe", STRIPE_SECRET_KEY: "sk_real", STRIPE_WEBHOOK_SECRET: "whsec_real" }));
  assert.equal(result.errors.some((e) => e.includes("STRIPE")), false);
});

test("validateEnvironment: production with a missing JWT_SECRET is a real, fatal error (never a silent insecure fallback)", () => {
  const result = validateEnvironment(baseEnv({ NODE_ENV: "production", JWT_SECRET: undefined }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("JWT_SECRET")));
});

test("validateEnvironment: production still using the known insecure dev JWT default is a real, fatal error", () => {
  const result = validateEnvironment(baseEnv({ NODE_ENV: "production", JWT_SECRET: INSECURE_JWT_DEFAULT }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("JWT_SECRET")));
});

test("validateEnvironment: production with a real, non-default JWT_SECRET and no other blockers is valid", () => {
  const result = validateEnvironment(baseEnv({ NODE_ENV: "production", JWT_SECRET: "a-real-random-production-secret" }));
  assert.equal(result.valid, true);
});

test("validateEnvironment: production without ADMIN_API_KEY/REDIS_URL/CORS_ALLOWED_ORIGINS is still valid, but honestly warns about each", () => {
  const result = validateEnvironment(baseEnv({ NODE_ENV: "production", JWT_SECRET: "a-real-random-production-secret" }));
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((w) => w.includes("ADMIN_API_KEY")));
  assert.ok(result.warnings.some((w) => w.includes("REDIS_URL")));
  assert.ok(result.warnings.some((w) => w.includes("CORS_ALLOWED_ORIGINS")));
});

test("validateEnvironmentOrExit: never calls exit for a real, valid config", () => {
  let exitCalled = false;
  validateEnvironmentOrExit(baseEnv(), { exit: () => { exitCalled = true; }, log: () => {} });
  assert.equal(exitCalled, false);
});

test("validateEnvironmentOrExit: calls exit(1) and logs every real error for an invalid config", () => {
  let exitCode = null;
  const logs = [];
  validateEnvironmentOrExit(baseEnv({ DATABASE_URL: "" }), { exit: (code) => { exitCode = code; }, log: (msg) => logs.push(msg) });
  assert.equal(exitCode, 1);
  assert.ok(logs.some((line) => line.includes("DATABASE_URL")));
});
