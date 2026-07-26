import { confidenceBand } from "./Badge";

// Phase MISSION-CONTROL-001 (introduced as ConfidenceArc) — Phase
// MISSION-CONTROL-002 (renamed + given an explicit `metric` prop). Per
// IMPACTONE_DESIGN_BIBLE.md §3.9/§4 and
// MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md §3.5: the ONE recurring
// scoring primitive on Mission Control — but it renders three genuinely
// different, independent concepts (Confidence, Probability, Attention),
// never conflated. MISSION-CONTROL-002's audit found the original
// ConfidenceArc always labeled itself "Confidence" and always used
// Confidence's positive/warning/neutral color banding, even when a
// caller fed it a real Attention Score — silently telling assistive-tech
// users, and implicitly training sighted users, that Attention and
// Confidence were the same number. They are not:
//   - Confidence: how sure the platform is about a belief it holds.
//   - Probability: the real statistical likelihood of an outcome.
//   - Attention: how much this deserves the user's notice right now —
//     a prioritization signal, not a judgment of "good" or "bad."
// The `metric` prop makes the caller state, explicitly, which of the
// three a given instance represents; this component never guesses.
const SIZE_PX = { sm: 36, md: 56, lg: 96 };
const STROKE_WIDTH = { sm: 3, md: 5, lg: 8 };
const ARC_FRACTION = 0.75; // 270 degrees, an instrument-gauge opening at the bottom
const ARC_ROTATION_DEG = 135; // rotates the gauge so its open gap faces down

const TONE_COLOR_VAR = {
  positive: "var(--nova-color-positive)",
  info: "var(--nova-color-info)",
  warning: "var(--nova-color-warning)",
  neutral: "var(--nova-color-text-tertiary)",
};

// Attention deliberately does NOT reuse Confidence's positive/warning/
// neutral banding — per IMPACTONE_DESIGN_BIBLE.md §5, the Attention hue
// is "reserved exclusively for the Attention Score system... reusing it
// anywhere else would dilute the one signal." The reverse is just as
// true: Attention borrowing Confidence's good/bad-coded colors would
// misrepresent a high-attention item as "good news." Attention is always
// rendered in one fixed, non-banded brand hue — a real, high attention
// score is not "positive," it is simply "look at this."
const METRIC_CONFIG = {
  confidence: {
    label: "Confidence",
    resolveColor: (score) => TONE_COLOR_VAR[confidenceBand(score).tone] || TONE_COLOR_VAR.neutral,
    describe: (score) => `Confidence ${Math.round(score)} out of 100 — ${confidenceBand(score).label}`,
  },
  attention: {
    label: "Attention",
    resolveColor: () => "var(--nova-color-brand-signal)",
    describe: (score) => `Attention ${Math.round(score)} out of 100`,
  },
  probability: {
    label: "Probability",
    resolveColor: () => "var(--nova-color-brand-cyan)",
    describe: (score) => `Probability ${Math.round(score)} percent`,
  },
};

/**
 * `showValue` defaults to false — per the masterplan's discipline, the
 * arc alone is the collapsed/5-second-view signal; the exact number is
 * secondary, surfaced only where a caller has explicitly decided to show
 * more (an expanded state, a detail panel), never forced into every
 * collapsed instance three times over.
 */
export default function MetricArc({ score, metric = "confidence", size = "md", showValue = false, label }) {
  const config = METRIC_CONFIG[metric] || METRIC_CONFIG.confidence;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const diameter = SIZE_PX[size] || SIZE_PX.md;
  const strokeWidth = STROKE_WIDTH[size] || STROKE_WIDTH.md;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * ARC_FRACTION;
  const filledLength = Number.isFinite(score) ? arcLength * (clamped / 100) : 0;
  const strokeColor = config.resolveColor(clamped);
  const center = diameter / 2;
  const accessibleLabel = label || (Number.isFinite(score) ? config.describe(clamped) : `${config.label} not yet available`);

  return (
    <div className="nova-metric-arc" data-metric={metric} data-size={size} style={{ inlineSize: diameter, blockSize: diameter }} role="img" aria-label={accessibleLabel}>
      <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--nova-surface-3)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(${ARC_ROTATION_DEG} ${center} ${center})`}
        />
        <circle
          className="nova-metric-arc__fill"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filledLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(${ARC_ROTATION_DEG} ${center} ${center})`}
        />
      </svg>
      {showValue ? <span className="nova-metric-arc__value">{Number.isFinite(score) ? Math.round(clamped) : "—"}</span> : null}
    </div>
  );
}
