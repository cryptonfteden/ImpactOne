// Phase PRODUCTION-DEPLOYMENT-001 — real liveness/readiness checks for
// orchestration platforms (Kubernetes, ECS, etc.) that need more than the
// existing, unconditional GET /health (kept exactly as-is below for
// backward compatibility — nothing that already polls it changes).
const express = require("express");
const { getPrismaClient } = require("../db/prismaClient");
const redisClient = require("../services/redisCache/redisClient");
const env = require("../config/env");

const router = express.Router();
const startedAt = Date.now();

// Liveness: is this process itself still running and able to respond at
// all? Deliberately checks nothing external — a slow/unavailable
// database or Redis must never cause an orchestrator to kill and
// restart an otherwise-healthy process.
router.get("/live", (req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) });
});

// Readiness: can this process actually serve real traffic right now?
// The one real, required dependency is the database — Redis is
// optional-by-design (services/redisCache/redisClient.js already
// degrades to always-miss without it), so its absence is reported but
// never fails readiness.
router.get("/ready", async (req, res) => {
  const checks = { database: false, redis: null };

  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  if (env.REDIS_URL) {
    checks.redis = await redisClient.isAvailable().catch(() => false);
  }

  const ready = checks.database;
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", checks });
});

module.exports = router;
