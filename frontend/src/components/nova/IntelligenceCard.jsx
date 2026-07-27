import { useState } from "react";
import Stack from "../layout/Stack";
import Card from "./Card";
import Badge from "./Badge";
import MetricArc from "./MetricArc";
import Button from "./Button";

// Phase DESIGN-SYSTEM-001 — extracted from two near-identical
// implementations: MissionControlHomeScreen.jsx's `SignalCard` (Biggest
// Risk / Best Opportunity) and PortfolioWorkspaceScreen.jsx's inline
// per-claim card in "Why This Affects You". Both rendered the same real
// Claim shape the same way — a Confidence MetricArc, a direction badge,
// the affected symbols, and the real reasoning text — with a handful of
// real, deliberate differences (one shows Probability and an expandable
// real portfolio-impact line; the other shows a status badge and
// explicitly-labeled Why/Evidence/Counter Evidence/Potential Scenarios
// sections). Every prop below defaults to preserving whichever call
// site's ORIGINAL behavior needs it — this is a refactor, not a
// redesign; see DESIGN_SYSTEM.md for full usage rules.
export function directionTone(direction) {
  if (direction === "BULLISH") return "positive";
  if (direction === "BEARISH") return "negative";
  return "neutral";
}

const CAPTION_STYLE = { color: "var(--nova-color-text-tertiary)" };
const TERTIARY_TEXT_STYLE = { color: "var(--nova-color-text-tertiary)" };

/**
 * @param {object} claim - the real Claim contract object.
 * @param {string} [title] - Card title (Biggest Risk / Best Opportunity style).
 * @param {string} [eyebrow] - Card eyebrow (Why-This-Affects-You style); ignored if `title` is given.
 * @param {boolean} [showProbability] - also render a Probability MetricArc when `claim.probability` is finite.
 * @param {boolean} [showStatusBadge] - also render a neutral badge with the claim's real lifecycle status.
 * @param {Array<{label: string, content: node}>} [sections] - when given, replaces the default
 *   plain-statement-plus-evidence body with explicitly-labeled sections (e.g. Why/Evidence/Counter
 *   Evidence/Potential Scenarios). Omit to get the default, terser body.
 * @param {boolean} [expandable] - shows a "Show more"/"Show less" toggle.
 * @param {node} [expandableContent] - real content (e.g. real portfolioImpact) revealed only when expanded.
 */
export default function IntelligenceCard({ claim, title, eyebrow, showProbability = false, showStatusBadge = false, sections, expandable = false, expandableContent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card title={title} eyebrow={!title ? eyebrow : undefined}>
      <Stack gap={3}>
        <Stack direction="horizontal" gap={3} wrap align="center">
          <Stack gap={1} align="center">
            <MetricArc score={claim.confidence} metric="confidence" size="sm" showValue />
            <span className="nova-text-xs" style={CAPTION_STYLE}>
              Confidence
            </span>
          </Stack>
          {showProbability && Number.isFinite(claim.probability) ? (
            <Stack gap={1} align="center">
              <MetricArc score={claim.probability} metric="probability" size="sm" showValue />
              <span className="nova-text-xs" style={CAPTION_STYLE}>
                Probability
              </span>
            </Stack>
          ) : null}
          <Badge tone={directionTone(claim.expectedDirection)}>{claim.expectedDirection}</Badge>
          <Badge tone="neutral">{(claim.symbols || []).join(", ")}</Badge>
          {showStatusBadge ? <Badge tone="neutral">{claim.status}</Badge> : null}
        </Stack>

        {sections ? (
          sections.map((section) => (
            <p className="nova-text-xs" key={section.label}>
              <strong>{section.label}:</strong> {section.content}
            </p>
          ))
        ) : (
          <>
            <p className="nova-text-sm">{claim.plainLanguageStatement || claim.statement}</p>
            {claim.evidence?.length ? (
              <p className="nova-text-xs" style={TERTIARY_TEXT_STYLE}>
                {claim.evidence[0].observedFact}
              </p>
            ) : null}
          </>
        )}

        {expandable ? (
          <>
            {expanded ? expandableContent : null}
            <Button variant="ghost" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Show less" : "Show more"}
            </Button>
          </>
        ) : null}
      </Stack>
    </Card>
  );
}
