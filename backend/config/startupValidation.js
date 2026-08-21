// Phase PRODUCTION-DEPLOYMENT-001 — real, fail-fast startup validation.
// Deliberately reads `rawEnv` (process.env by default), NOT config/env.js's
// already-defaulted export — env.js intentionally falls back to an
// insecure JWT_SECRET default so every existing dev/test environment
// keeps working unmodified; this module's whole job is to catch that
// exact fallback if it's ever about to run in a real production
// deployment, which requires seeing the raw, pre-fallback value.
const INSECURE_JWT_DEFAULT = "dev-only-insecure-default-jwt-secret-do-not-use-in-production";

function isProduction(rawEnv) {
  return rawEnv.NODE_ENV === "production";
}

/**
 * Validates the real, raw environment before the app starts listening.
 * Never mutates rawEnv. Returns every real problem found — never stops
 * at the first one — so a real deployment sees its full, honest list of
 * blockers in one pass rather than fixing them one at a time.
 * @param {NodeJS.ProcessEnv} rawEnv
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateEnvironment(rawEnv = process.env) {
  const errors = [];
  const warnings = [];
  const production = isProduction(rawEnv);

  if (!rawEnv.DATABASE_URL) {
    errors.push("DATABASE_URL is not set. A real database connection string is required to start.");
  }

  if (rawEnv.PORT !== undefined && rawEnv.PORT !== "" && (!Number.isFinite(Number(rawEnv.PORT)) || Number(rawEnv.PORT) <= 0)) {
    errors.push(`PORT is set to a non-numeric or non-positive value: "${rawEnv.PORT}".`);
  }

  const billingProvider = rawEnv.BILLING_PROVIDER || "manual";
  if (billingProvider === "stripe") {
    if (!rawEnv.STRIPE_SECRET_KEY) {
      errors.push("BILLING_PROVIDER is \"stripe\" but STRIPE_SECRET_KEY is not set.");
    }
    if (!rawEnv.STRIPE_WEBHOOK_SECRET) {
      errors.push("BILLING_PROVIDER is \"stripe\" but STRIPE_WEBHOOK_SECRET is not set.");
    }
  }

  if (production) {
    if (!rawEnv.JWT_SECRET || rawEnv.JWT_SECRET === INSECURE_JWT_DEFAULT) {
      errors.push("JWT_SECRET is not set (or is still the insecure development default). A real, random secret is required in production.");
    }
    if (!rawEnv.ADMIN_API_KEY) {
      errors.push("ADMIN_API_KEY is not set. A real, random admin key is required in production.");
    }
    if (!rawEnv.REDIS_URL) {
      warnings.push("REDIS_URL is not set — using the bounded in-process TTL cache. Configure Redis before horizontal scaling so cache state is shared across instances.");
    }
    if (!rawEnv.CORS_ALLOWED_ORIGINS) {
      warnings.push("CORS_ALLOWED_ORIGINS is not set — CORS currently allows every origin. Set this to your real frontend origin(s) before serving real production traffic.");
    }
  } else {
    if (!rawEnv.JWT_SECRET) {
      warnings.push("JWT_SECRET is not set — falling back to the insecure development default (fine for local dev/test only).");
    }
  }

  const valid = errors.length === 0;
  // Phase RC1-BLOCKERS-001 — an RC audit found this returns { valid,
  // errors, warnings } while frontend/src/startupValidation.js returns
  // { ok, issues } for the analogous check, with no shared field name
  // between them. Renaming either side would mean touching every real
  // consumer on that side (server.js here; screenRegistry.js there) plus
  // their tests — a structural change, not a cleanup. This adds `ok` as
  // a plain alias of `valid` instead: purely additive, breaks nothing
  // that reads `.valid` today, and lets a caller that already knows the
  // frontend's `.ok` convention use the same field name here too.
  return { valid, ok: valid, errors, warnings };
}

/**
 * Runs validateEnvironment and, on failure, prints every real error and
 * exits the process (never partially starts against a known-broken
 * configuration). Warnings are printed but never fatal. Exists as a
 * separate function (rather than inline in server.js) purely so tests
 * can exercise validateEnvironment without ever risking a real
 * process.exit call.
 * @param {NodeJS.ProcessEnv} rawEnv
 * @param {{ exit?: (code: number) => void, log?: (...args: any[]) => void }} [io]
 */
function validateEnvironmentOrExit(rawEnv = process.env, { exit = process.exit, log = console.error } = {}) {
  const result = validateEnvironment(rawEnv);

  result.warnings.forEach((warning) => log(`[startupValidation] WARNING: ${warning}`));

  if (!result.valid) {
    log("[startupValidation] Refusing to start — the following real configuration problems must be fixed first:");
    result.errors.forEach((error) => log(`  - ${error}`));
    exit(1);
    return result;
  }

  return result;
}

module.exports = { validateEnvironment, validateEnvironmentOrExit, INSECURE_JWT_DEFAULT };
