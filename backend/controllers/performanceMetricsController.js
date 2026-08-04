const performanceMetricsService = require("../services/performanceMetricsService");

function getPerformanceMetrics(req, res) {
  res.json(performanceMetricsService.getPerformanceMetrics());
}

function recordClientTiming(req, res) {
  const { kind, durationMs } = req.body || {};
  const recorded = performanceMetricsService.recordClientTiming(kind, durationMs);
  res.status(recorded ? 204 : 400).end();
}

module.exports = { getPerformanceMetrics, recordClientTiming };
