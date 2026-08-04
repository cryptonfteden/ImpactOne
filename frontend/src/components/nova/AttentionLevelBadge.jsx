import Badge from "./Badge";

// Phase DESIGN-SYSTEM-001 — extracted from the identical
// tone-mapping-plus-label pattern duplicated across the hero and every
// Today's Brief row in MissionControlHomeScreen.jsx.
//
// The original extraction mapped High/Medium/Low to warning/info/neutral
// — the same tones Confidence bands (Badge.jsx's confidenceBand) and
// claim status already use, so a High-Attention badge, a Moderate-
// confidence badge, and a Weakening-status badge all rendered identical
// amber on the same screen (PRODUCT_STYLE_GAPS.md, H1). Fixed: this
// badge always uses the ONE fixed, exclusive "attention" tone — the same
// non-banded hue MetricArc already uses for the Attention metric (Bible
// §5) — regardless of level. High/Medium/Low are differentiated by their
// text alone, never by color, exactly like MetricArc's own Attention
// arcs never band by score magnitude.
export function attentionLevelTone() {
  return "attention";
}

export default function AttentionLevelBadge({ level }) {
  return <Badge tone="attention">Attention: {level}</Badge>;
}
