// Phase X11 — Part 6, Safety. Shared, reusable safety primitives for every
// learning computation this phase introduces (Outcome Feedback Loop,
// Dynamic Source Scoring). Nothing here is scoring-domain-specific — it's
// the general guardrail math: don't trust small samples, quantify real
// uncertainty, and never let one signal move a score by more than a
// disclosed, bounded amount.
const MIN_SAMPLE_SIZE = 15;
const MAX_ADJUSTMENT_PTS = 8;
const ADJUSTMENT_SCALE = 40;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// A 95% Wilson score interval — far more honest than a naive
// successes/n ± z*stderr interval at small n, which can produce bounds
// outside [0, 1]. Used to report real uncertainty alongside every
// adjustment, not just a point estimate.
function wilsonConfidenceInterval(successes, n, z = 1.96) {
  if (n === 0) return { lower: null, upper: null };
  const phat = successes / n;
  const denominator = 1 + (z * z) / n;
  const center = phat + (z * z) / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat)) / n + (z * z) / (4 * n * n));
  return {
    lower: clamp((center - margin) / denominator, 0, 1),
    upper: clamp((center + margin) / denominator, 0, 1),
  };
}

// The one real gate deciding whether a sample is even eligible to move a
// live score. Below the threshold, every caller must report the
// adjustment as computed-but-withheld (applied: false), never silently
// drop it and never apply it anyway.
function meetsMinimumSample(n, minimumSampleSize = MIN_SAMPLE_SIZE) {
  return n >= minimumSampleSize;
}

// Converts an observed rate (0-1) into a bounded point adjustment,
// capped at ±MAX_ADJUSTMENT_PTS regardless of how extreme the observed
// rate is — the "bounded weight update" safety requirement.
function boundedAdjustmentFromRate(observedRate, { baseline = 0.5, scale = ADJUSTMENT_SCALE, maxAbs = MAX_ADJUSTMENT_PTS } = {}) {
  const raw = (observedRate - baseline) * scale;
  return clamp(Math.round(raw * 100) / 100, -maxAbs, maxAbs);
}

module.exports = { MIN_SAMPLE_SIZE, MAX_ADJUSTMENT_PTS, ADJUSTMENT_SCALE, wilsonConfidenceInterval, meetsMinimumSample, boundedAdjustmentFromRate, clamp };
