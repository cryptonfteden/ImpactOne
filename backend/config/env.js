const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const envCandidates = [
  path.resolve(__dirname, "..", "..", ".env"),
  path.resolve(__dirname, "..", "..", "frontend", ".env"),
  path.resolve(__dirname, "..", ".env"),
  path.resolve(__dirname, "..", "..", "backend", ".env"),
  path.resolve(__dirname, "..", "..", "frontend", ".env.local"),
  path.resolve(__dirname, "..", "..", "backend", ".env.local"),
];

envCandidates.forEach((candidate) => {
  if (fs.existsSync(candidate)) {
    const loaded = dotenv.config({ path: candidate });
    // dotenv intentionally does not override an already-present process
    // variable. A blank inherited variable (for example POLYGON_API_KEY="")
    // is not a usable configuration, though, and previously prevented the
    // non-empty local backend .env value from ever being loaded. Fill only
    // blank values; a real environment value always remains authoritative.
    for (const [key, value] of Object.entries(loaded.parsed || {})) {
      if (!process.env[key] && value) process.env[key] = value;
    }
  }
});

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || "",
  POLYGON_API_KEY: process.env.POLYGON_API_KEY || "",
  NEWS_API_KEY: process.env.NEWS_API_KEY || "",
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || "",
  NASA_API_KEY: process.env.NASA_API_KEY || "",
  // Phase INSIDER-AGENT-001 — SEC EDGAR requires every requester to send
  // a descriptive User-Agent identifying the requesting organization and
  // a real contact (https://www.sec.gov/os/webmaster-faq#developers);
  // requests without one are rejected. This disclosed default is a
  // placeholder for local/dev use — a real deployment should set
  // SEC_EDGAR_USER_AGENT to its own organization/contact string.
  SEC_EDGAR_USER_AGENT: process.env.SEC_EDGAR_USER_AGENT || "ImpactOne InsiderIntelligenceAgent contact@impactone.example",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DATABASE_URL_TEST: process.env.DATABASE_URL_TEST || "",
  AUTONOMOUS_ENGINE_ENABLED: process.env.AUTONOMOUS_ENGINE_ENABLED !== "false",
  AUTONOMOUS_ENGINE_INTERVAL_MINUTES: Number(process.env.AUTONOMOUS_ENGINE_INTERVAL_MINUTES) || 30,
  // Phase PLATFORM-HARDENING-002 — real, opt-in admin-route protection
  // (middleware/requireApiKey.js). Honestly empty by default — every
  // existing environment (dev/test/current deploys) keeps running
  // exactly as before until an operator explicitly sets this.
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || "",
  // Phase REDIS-CACHE-001 — honestly empty in every environment this
  // codebase runs in today (confirmed via a dedicated research pass —
  // no Redis instance is configured anywhere). The provider cache
  // (services/redisCache/) gracefully falls back to always-miss/
  // real-call-through whenever this is unset — see redisClient.js.
  REDIS_URL: process.env.REDIS_URL || "",
  REDIS_CACHE_DEFAULT_TTL_MS: Number(process.env.REDIS_CACHE_DEFAULT_TTL_MS) || 5 * 60 * 1000,
  // Phase COMMERCIAL-MVP-001 — Commercial Infrastructure.
  // JWT_SECRET signs real session access tokens (authService.js). A
  // real deployment MUST override this — the fallback below is a
  // disclosed, insecure dev/test-only default (documented as such),
  // never silently used to protect real production credentials.
  JWT_SECRET: process.env.JWT_SECRET || "dev-only-insecure-default-jwt-secret-do-not-use-in-production",
  JWT_EXPIRES_IN_SECONDS: Number(process.env.JWT_EXPIRES_IN_SECONDS) || 60 * 60 * 24 * 7, // 7 real days
  // Billing is provider-agnostic by design (services/billing/). This
  // selects which real implementation billingService.js delegates to;
  // "manual" (the honest, no-vendor default — every environment today)
  // never calls out to any real payment network. Never hardcode a
  // vendor elsewhere in the codebase — this is the one switch.
  BILLING_PROVIDER: process.env.BILLING_PROVIDER || "manual",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  // Phase PRODUCTION-DEPLOYMENT-001 — honestly empty by default, which
  // preserves every existing environment's current `cors()` allow-all
  // behavior (see app.js). A comma-separated list of real origins locks
  // this down for a real production deployment without changing
  // anything for local dev/test.
  CORS_ALLOWED_ORIGINS: (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Phase PRODUCTION-DEPLOYMENT-001 — how long graceful shutdown waits
  // for in-flight requests to finish before forcing an exit.
  SHUTDOWN_TIMEOUT_MS: Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000,
};
