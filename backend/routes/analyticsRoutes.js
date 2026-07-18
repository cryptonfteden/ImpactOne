const express = require("express");
const { recordEvent } = require("../controllers/analyticsController");
const { getTimeToValueMetrics } = require("../controllers/ttvMetricsController");

const router = express.Router();

router.post("/event", recordEvent);
// Sprint 36 Priority 1 — internal Time To Value metrics, computed from
// the same anonymous event stream. Not linked from any user-facing
// navigation; an internal engineering/product tool, same precedent as
// the existing dev-console-gated quality-dashboard routes.
router.get("/ttv-metrics", getTimeToValueMetrics);

module.exports = router;
