// Phase X9 — Part 6, Performance Monitoring. Real measurements only.
// API latency is captured in-memory (a bounded ring buffer per route) by
// the real Express middleware below, attached in app.js — never
// estimated. Frontend-reported timings (screen load, chart render, AI
// response) arrive via POST from real `performance.now()` deltas
// measured in the browser. Memory usage reads the real, live Node
// process. Bundle size reads the real files in frontend/dist/ at request
// time — honestly unavailable (not fabricated) if no production build
// exists yet.
//
// In-memory, not persisted: this is real-time operational telemetry for
// an internal dashboard, not a permanent record — it resets on restart,
// same tradeoff systemHealthService.js already makes for live status.
// Documented here, not silently assumed durable.
const fs = require("fs");
const path = require("path");

const MAX_SAMPLES_PER_ROUTE = 200;
const apiLatencyByRoute = new Map(); // route -> number[] (ms)
const clientTimingsByKind = new Map([
  ["screenLoad", []],
  ["chartRender", []],
  ["aiResponse", []],
]);
const MAX_CLIENT_SAMPLES = 500;

function pushSample(map, key, value) {
  const list = map.get(key) || [];
  list.push(value);
  if (list.length > MAX_SAMPLES_PER_ROUTE) list.shift();
  map.set(key, list);
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return null;
  const index = Math.min(sortedValues.length - 1, Math.floor((p / 100) * sortedValues.length));
  return sortedValues[index];
}

function summarize(values) {
  if (!values.length) return { count: 0, avgMs: null, p95Ms: null };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    avgMs: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    p95Ms: percentile(sorted, 95),
  };
}

// Real Express middleware — records this request's real wall-clock
// duration against its real route pattern (req.route?.path falls back to
// the raw path when Express hasn't matched a route yet, e.g. a 404).
function apiLatencyMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const routeKey = `${req.method} ${req.route?.path ? req.baseUrl + req.route.path : req.path}`;
    pushSample(apiLatencyByRoute, routeKey, durationMs);
  });
  next();
}

function recordClientTiming(kind, durationMs) {
  if (!clientTimingsByKind.has(kind)) return false;
  if (!Number.isFinite(durationMs) || durationMs < 0) return false;
  const list = clientTimingsByKind.get(kind);
  list.push(durationMs);
  if (list.length > MAX_CLIENT_SAMPLES) list.shift();
  return true;
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rssMb: Math.round((usage.rss / 1024 / 1024) * 10) / 10,
    heapUsedMb: Math.round((usage.heapUsed / 1024 / 1024) * 10) / 10,
    heapTotalMb: Math.round((usage.heapTotal / 1024 / 1024) * 10) / 10,
  };
}

// Real frontend production bundle size, read from disk — honestly null
// (with a reason) when no build exists yet, never estimated.
function getFrontendBundleSize() {
  const distDir = path.join(__dirname, "..", "..", "frontend", "dist", "assets");
  try {
    const files = fs.readdirSync(distDir);
    const jsFiles = files.filter((file) => file.endsWith(".js"));
    const totalBytes = jsFiles.reduce((sum, file) => sum + fs.statSync(path.join(distDir, file)).size, 0);
    return { available: true, totalKb: Math.round(totalBytes / 1024), fileCount: jsFiles.length };
  } catch {
    return { available: false, reason: "No production build found at frontend/dist/assets — run npm run build first." };
  }
}

function getPerformanceMetrics() {
  const apiLatency = Array.from(apiLatencyByRoute.entries()).map(([route, values]) => ({ route, ...summarize(values) }));
  return {
    generatedAt: new Date().toISOString(),
    apiLatency,
    screenLoadTime: summarize(clientTimingsByKind.get("screenLoad")),
    chartRenderTime: summarize(clientTimingsByKind.get("chartRender")),
    aiResponseTime: summarize(clientTimingsByKind.get("aiResponse")),
    memoryUsage: getMemoryUsage(),
    frontendBundleSize: getFrontendBundleSize(),
  };
}

module.exports = { apiLatencyMiddleware, recordClientTiming, getPerformanceMetrics };
