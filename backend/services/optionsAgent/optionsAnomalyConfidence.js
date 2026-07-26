// Phase AI-ENGINE-001.1 — Unusual Options Agent foundation. The
// confidence rollup from OPTIONS_AGENT_ARCHITECTURE.md §6 — documented
// as a new scoringVocabulary.js SCORE_DEFINITIONS entry
// (optionsAnomalyConfidence), not a parallel scoring system. Every
// component here is a bounded, deterministic transform of real detector
// output; nothing is fabricated when a detector didn't fire.
const { clamp } = require("../../utils/portfolioRiskMetrics");

const METHODOLOGY_VERSION = "options-agent-v1";

// classificationStrength (0-100) — a fixed base score per detector
// combination, reflecting how much stronger a coordinated, aggressive,
// urgent execution pattern is as evidence of informed trading versus a
// raw size anomaly (architecture §6). Hand-set constants, disclosed as
// such — not the product of a fitted model (same honesty as
// scoringVocabulary.js's own documented note on confidence/conviction).
const CLASSIFICATION_STRENGTH = {
  "SWEEP+BLOCK": 90,
  SWEEP: 75,
  BLOCK_TRADE: 60,
  VOLUME_SPIKE: 40,
};

function classificationStrengthFor({ hasSweep, hasBlock, hasVolumeSpike }) {
  if (hasSweep && hasBlock) return CLASSIFICATION_STRENGTH["SWEEP+BLOCK"];
  if (hasSweep) return CLASSIFICATION_STRENGTH.SWEEP;
  if (hasBlock) return CLASSIFICATION_STRENGTH.BLOCK_TRADE;
  if (hasVolumeSpike) return CLASSIFICATION_STRENGTH.VOLUME_SPIKE;
  return 0;
}

/**
 * sizeScore (0-100) — a bounded, monotonic transform of the volume-vs-
 * baseline multiple (architecture §6): a trigger-multiple event maps to
 * 60, a 15x+ event saturates near 100. `null` when no real multiple
 * exists (baseline bootstrap window) — never a fabricated score.
 */
function computeSizeScore(volumeMultiple, triggerMultiple = 5) {
  if (!Number.isFinite(volumeMultiple) || volumeMultiple <= 0) return null;
  return clamp(Math.round((volumeMultiple / triggerMultiple) * 60), 0, 100);
}

function oiConfirmationAdjustment(oiConfirmationStatus) {
  switch (oiConfirmationStatus) {
    case "CONFIRMED_NEW_POSITION":
      return 15;
    case "CONFIRMED_CLOSING":
      return -20;
    case "UNCONFIRMED":
      return -10;
    case "PENDING":
    default:
      return 0;
  }
}

function skewCorroborationAdjustment({ hasSkewSignal, skewDirection, tradeDirection } = {}) {
  if (!hasSkewSignal || !skewDirection || !tradeDirection) return 0;
  const sameDirection = (skewDirection === "BULLISH_LEANING" && tradeDirection === "BUY") || (skewDirection === "BEARISH_LEANING" && tradeDirection === "SELL");
  return sameDirection ? 10 : -10;
}

/**
 * The full rollup (architecture §6). Returns `null` (never a fabricated
 * number) when there isn't at least one real classification signal to
 * score — mirrors the volume-vs-baseline detector's own bootstrap-window
 * honesty.
 */
function computeAnomalyScore({ volumeMultiple, triggerMultiple = 5, hasSweep = false, hasBlock = false, hasVolumeSpike = false, oiConfirmationStatus = "PENDING", hasSkewSignal = false, skewDirection = null, tradeDirection = null } = {}) {
  const sizeScore = computeSizeScore(volumeMultiple, triggerMultiple);
  const classificationStrength = classificationStrengthFor({ hasSweep, hasBlock, hasVolumeSpike });

  if (sizeScore === null && classificationStrength === 0) {
    return null;
  }

  const effectiveSizeScore = sizeScore === null ? 0 : sizeScore;
  const raw =
    effectiveSizeScore * 0.35 +
    classificationStrength * 0.3 +
    oiConfirmationAdjustment(oiConfirmationStatus) +
    skewCorroborationAdjustment({ hasSkewSignal, skewDirection, tradeDirection });

  return clamp(Math.round(raw * 100) / 100, 0, 100);
}

module.exports = {
  METHODOLOGY_VERSION,
  CLASSIFICATION_STRENGTH,
  computeSizeScore,
  classificationStrengthFor,
  oiConfirmationAdjustment,
  skewCorroborationAdjustment,
  computeAnomalyScore,
};
