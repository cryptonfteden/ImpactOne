import { confidenceBand } from "./Badge";

// Phase MISSION-CONTROL-001 — the Confidence Arc. Per
// IMPACTONE_DESIGN_BIBLE.md §3.9/§4 and
// MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md §3.5: the ONE recurring
// scoring primitive reused everywhere a real score appears on Mission
// Control, replacing three separate indicators (a numeric Attention
// Score, a Confidence figure, a Recommended Attention Level badge) with
// one instrument-style reading. A 270° gauge arc — deterministic fill
// proportional to the real score, never animated except a single,
// reduced-motion-respecting reveal transition on mount/update.
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

/**
 * `showValue` defaults to false — per the masterplan's discipline, the
 * arc alone is the collapsed/5-second-view signal; the exact number is
 * secondary, surfaced only where a caller has explicitly decided to show
 * more (an expanded state, a detail panel), never forced into every
 * collapsed instance three times over.
 */
export default function ConfidenceArc({ score, size = "md", showValue = false, label }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const diameter = SIZE_PX[size] || SIZE_PX.md;
  const strokeWidth = STROKE_WIDTH[size] || STROKE_WIDTH.md;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * ARC_FRACTION;
  const filledLength = Number.isFinite(score) ? arcLength * (clamped / 100) : 0;
  const { tone, label: bandLabel } = confidenceBand(clamped);
  const strokeColor = TONE_COLOR_VAR[tone] || TONE_COLOR_VAR.neutral;
  const center = diameter / 2;
  const accessibleLabel = label || (Number.isFinite(score) ? `Confidence ${clamped} out of 100 — ${bandLabel}` : "Confidence not yet available");

  return (
    <div className="nova-confidence-arc" data-size={size} style={{ inlineSize: diameter, blockSize: diameter }} role="img" aria-label={accessibleLabel}>
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
          className="nova-confidence-arc__fill"
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
      {showValue ? <span className="nova-confidence-arc__value">{Number.isFinite(score) ? Math.round(clamped) : "—"}</span> : null}
    </div>
  );
}
